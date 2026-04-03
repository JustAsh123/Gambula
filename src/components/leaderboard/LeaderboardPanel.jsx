import { memo, useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { firebaseSetupMessage, isFirebaseConfigured } from '../../services/firebase';
import { fetchLeaderboard } from '../../services/leaderboardService';
import GlassPanel from '../shared/GlassPanel';
import LeaderboardEntries from './LeaderboardEntries';

function LeaderboardPanel({ gameId, title = 'Top Players', limitCount = 10, reloadToken = 0 }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  const loadEntries = useCallback(async () => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const nextEntries = await fetchLeaderboard(gameId, limitCount);
      setEntries(nextEntries);
    } finally {
      setLoading(false);
    }
  }, [gameId, limitCount]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries, reloadToken]);

  return (
    <GlassPanel className="p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="section-label">Leaderboard</p>
          <h3 className="mt-2 text-xl font-semibold text-white">{title}</h3>
        </div>
        <span className="score-pill">Top {limitCount}</span>
      </div>

      {!isFirebaseConfigured ? (
        <p className="mt-5 text-sm leading-6 text-gray-300">{firebaseSetupMessage}</p>
      ) : null}

      {isFirebaseConfigured ? (
        <div className="mt-5">
          <LeaderboardEntries
            currentUserId={user?.uid}
            entries={entries}
            loading={loading}
          />
        </div>
      ) : null}
    </GlassPanel>
  );
}

export default memo(LeaderboardPanel);
