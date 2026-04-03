import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';

function invalid(message) {
  return { valid: false, message };
}

export function validateScoreSubmission(gameId, score, session = {}) {
  const normalizedScore = Math.floor(Number(score) || 0);
  const durationMs = Number(session.durationMs || 0);

  if (!Number.isFinite(normalizedScore) || normalizedScore <= 0) {
    return invalid('Finish a run with a positive score before submitting.');
  }

  if (normalizedScore > 250000) {
    return invalid('That score is above the allowed client-side limit.');
  }

  switch (gameId) {
    case 'snake': {
      const apples = Number(session.apples || normalizedScore / 10);

      if (normalizedScore % 10 !== 0 || apples > durationMs / 220 + 8) {
        return invalid('Snake score validation failed for this run.');
      }

      break;
    }
    case 'flappy': {
      const pipesPassed = Number(session.pipesPassed || normalizedScore / 15);

      if (normalizedScore % 15 !== 0 || pipesPassed > durationMs / 300 + 5) {
        return invalid('Flight run validation failed for this score.');
      }

      break;
    }
    case 'space-shooter': {
      const enemiesDestroyed = Number(session.enemiesDestroyed || 0);
      const wavesCleared = Number(session.wavesCleared || 0);
      const expectedScore = enemiesDestroyed * 25 + wavesCleared * 100;

      if (expectedScore !== normalizedScore || enemiesDestroyed > durationMs / 120 + 10) {
        return invalid('Shooter run validation failed.');
      }

      break;
    }
    case 'brick-breaker': {
      const bricksBroken = Number(session.bricksBroken || 0);
      const levelsCleared = Number(session.levelsCleared || 0);
      const expectedScore = bricksBroken * 100 + levelsCleared * 200;

      if (expectedScore !== normalizedScore) {
        return invalid('Breaker score validation failed.');
      }

      break;
    }
    case 'reaction-clicker': {
      const roundsCompleted = Number(session.roundsCompleted || 0);

      if (roundsCompleted < 1 || normalizedScore > roundsCompleted * 240) {
        return invalid('Reaction run validation failed.');
      }

      break;
    }
    case 'endless-runner': {
      if (normalizedScore > durationMs / 8 + 250) {
        return invalid('Runner distance validation failed.');
      }

      break;
    }
    case 'memory-flip': {
      const matchedPairs = Number(session.matchedPairs || 0);
      const levelsCleared = Number(session.levelsCleared || 0);

      if (normalizedScore > matchedPairs * 170 + levelsCleared * 400) {
        return invalid('Memory run validation failed.');
      }

      break;
    }
    case 'whack-a-mole': {
      const hits = Number(session.hits || 0);

      if (normalizedScore > hits * 35 + 100) {
        return invalid('Whack score validation failed.');
      }

      break;
    }
    case 'typing-speed': {
      const correctWords = Number(session.correctWords || 0);

      if (normalizedScore > correctWords * 45 + 120) {
        return invalid('Typing score validation failed.');
      }

      break;
    }
    default:
      return invalid('Unknown game id.');
  }

  return { valid: true, normalizedScore };
}

function ensureConfigured() {
  if (!isFirebaseConfigured) {
    throw new Error('Firebase is not configured yet.');
  }
}

function normalizeLeaderboardEntries(snapshotDocs, limitCount) {
  const byUser = new Map();

  snapshotDocs.forEach((docItem) => {
    const data = docItem.data();
    const userId = data.userId || docItem.id;
    const score = Number(data.score || 0);
    const currentEntry = byUser.get(userId);

    if (!currentEntry || score > currentEntry.score) {
      byUser.set(userId, {
        id: userId,
        ...data,
        userId,
        score,
      });
    }
  });

  return Array.from(byUser.values())
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (right.timestamp?.seconds || 0) - (left.timestamp?.seconds || 0);
    })
    .slice(0, limitCount);
}

export async function submitScore(gameId, score, user, session = {}) {
  ensureConfigured();

  if (!user?.uid) {
    throw new Error('Log in to submit a score.');
  }

  const validation = validateScoreSubmission(gameId, score, session);

  if (!validation.valid) {
    throw new Error(validation.message);
  }

  const username = user.displayName || user.email?.split('@')[0] || 'Arcade Pilot';
  const scoresCollection = collection(db, 'games', gameId, 'scores');
  const existingScoresSnapshot = await getDocs(
    query(scoresCollection, where('userId', '==', user.uid)),
  );
  const highestExistingEntry = existingScoresSnapshot.docs.reduce((bestEntry, docItem) => {
    const data = docItem.data();
    const nextScore = Number(data.score || 0);

    if (!bestEntry || nextScore > bestEntry.score) {
      return {
        score: nextScore,
        timestamp: data.timestamp,
        username: data.username,
      };
    }

    return bestEntry;
  }, null);
  const existingBestScore = existingScoresSnapshot.docs.reduce(
    (bestScore, docItem) => Math.max(bestScore, Number(docItem.data().score || 0)),
    0,
  );

  if (validation.normalizedScore <= existingBestScore) {
    const needsConsolidation =
      existingScoresSnapshot.docs.length > 1 ||
      !existingScoresSnapshot.docs.some((docItem) => docItem.id === user.uid);

    if (needsConsolidation) {
      const batch = writeBatch(db);
      batch.set(
        doc(db, 'games', gameId, 'scores', user.uid),
        {
          userId: user.uid,
          username: highestExistingEntry?.username || username,
          score: existingBestScore,
          timestamp: highestExistingEntry?.timestamp || serverTimestamp(),
        },
        { merge: true },
      );
      existingScoresSnapshot.docs
        .filter((docItem) => docItem.id !== user.uid)
        .forEach((docItem) => batch.delete(docItem.ref));
      await batch.commit();
    }

    return {
      score: existingBestScore,
      saved: false,
      improved: false,
    };
  }

  await setDoc(
    doc(db, 'games', gameId, 'scores', user.uid),
    {
      userId: user.uid,
      username,
      score: validation.normalizedScore,
      timestamp: serverTimestamp(),
    },
    { merge: true },
  );

  const legacyScoreDocs = existingScoresSnapshot.docs.filter((docItem) => docItem.id !== user.uid);

  if (legacyScoreDocs.length) {
    const batch = writeBatch(db);
    legacyScoreDocs.forEach((docItem) => batch.delete(docItem.ref));
    await batch.commit();
  }

  const profileRef = doc(db, 'profiles', user.uid);

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(profileRef);
    const profile = snapshot.exists() ? snapshot.data() : {};
    const currentScores = profile.gameScores || {};
    const bestForGame = Math.max(currentScores[gameId] || 0, validation.normalizedScore);
    const gameScores = { ...currentScores, [gameId]: bestForGame };

    transaction.set(
      profileRef,
      {
        userId: user.uid,
        username,
        email: user.email ?? '',
        photoURL: user.photoURL ?? '',
        gameScores,
        totalSubmissions: Number(profile.totalSubmissions || 0) + 1,
        updatedAt: serverTimestamp(),
        createdAt: profile.createdAt || serverTimestamp(),
      },
      { merge: true },
    );
  });

  return {
    score: validation.normalizedScore,
    saved: true,
    improved: validation.normalizedScore > existingBestScore,
  };
}

export async function fetchLeaderboard(gameId, limitCount = 10) {
  if (!isFirebaseConfigured || !gameId) {
    return [];
  }

  // One-shot reads are cheaper than live listeners for a page-level leaderboard.
  const snapshot = await getDocs(
    query(
      collection(db, 'games', gameId, 'scores'),
      orderBy('score', 'desc'),
      limit(Math.max(limitCount * 3, limitCount)),
    ),
  );

  return normalizeLeaderboardEntries(snapshot.docs, limitCount);
}

export async function fetchLeaderboardsForGames(gameIds = [], limitCount = 5) {
  const leaderboards = await Promise.all(
    gameIds.map(async (gameId) => [gameId, await fetchLeaderboard(gameId, limitCount)]),
  );

  return Object.fromEntries(leaderboards);
}
