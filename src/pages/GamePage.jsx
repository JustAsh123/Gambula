import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LeaderboardPanel from '../components/leaderboard/LeaderboardPanel';
import Button from '../components/shared/Button';
import GameCabinet from '../components/shared/GameCabinet';
import GlassPanel from '../components/shared/GlassPanel';
import ToastNotice from '../components/shared/ToastNotice';
import { useAuth } from '../context/AuthContext';
import { getGameById } from '../config/games';
import { GAME_COMPONENTS } from '../games';
import { playArcadeTone } from '../lib/sound';
import { formatScore, getLocalBestScore, saveLocalBestScore } from '../lib/utils';
import { firebaseSetupMessage, isFirebaseConfigured } from '../services/firebase';
import { submitScore } from '../services/leaderboardService';
import NotFoundPage from './NotFoundPage';

export default function GamePage() {
  const { gameId } = useParams();
  const { user, profile, refreshProfile } = useAuth();
  const game = useMemo(() => getGameById(gameId), [gameId]);
  const GameComponent = useMemo(() => (game ? GAME_COMPONENTS[game.id] : null), [game]);
  const [resetKey, setResetKey] = useState(0);
  const [liveScore, setLiveScore] = useState(0);
  const [localBest, setLocalBest] = useState(game ? getLocalBestScore(game.id) : 0);
  const [lastResult, setLastResult] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [leaderboardReloadToken, setLeaderboardReloadToken] = useState(0);
  const [notice, setNotice] = useState(null);
  const [submitState, setSubmitState] = useState({
    loading: false,
    message: '',
    error: '',
    kind: '',
  });
  const handledSessionRef = useRef('');
  const pauseStateRef = useRef(false);

  const cloudBest = useMemo(
    () => (game ? profile?.gameScores?.[game.id] || 0 : 0),
    [game, profile?.gameScores],
  );
  const displayBest = useMemo(() => Math.max(localBest, cloudBest), [cloudBest, localBest]);
  const autoSaveLabel = user ? 'Auto-save on' : 'Login to save';

  const showNotice = useCallback((kind, message) => {
    setNotice({ id: `${Date.now()}-${kind}`, kind, message });
  }, []);

  useEffect(() => {
    pauseStateRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    if (!game) {
      return;
    }

    document.title = `${game.name} | Gambula Arcade`;
    setResetKey(0);
    setLiveScore(0);
    setLocalBest(getLocalBestScore(game.id));
    setLastResult(null);
    setIsPaused(false);
    setLeaderboardReloadToken(0);
    setNotice(null);
    handledSessionRef.current = '';
    pauseStateRef.current = false;
    setSubmitState({ loading: false, message: '', error: '', kind: '' });
  }, [game]);

  useEffect(() => {
    if (!notice) {
      return undefined;
    }

    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const handlePlayAgain = useCallback(() => {
    setResetKey((currentKey) => currentKey + 1);
    setLiveScore(0);
    setLastResult(null);
    setIsPaused(false);
    pauseStateRef.current = false;
    setSubmitState({ loading: false, message: '', error: '', kind: '' });
    playArcadeTone('start');
  }, []);

  const handleScoreChange = useCallback((nextScore) => {
    setLiveScore(nextScore);
  }, []);

  const handlePauseToggle = useCallback(() => {
    if (lastResult) {
      return;
    }

    setIsPaused((currentValue) => {
      const nextValue = !currentValue;
      pauseStateRef.current = nextValue;
      return nextValue;
    });
    playArcadeTone('click');
  }, [lastResult]);

  const handleGameOver = useCallback((result) => {
    const isNewBest = result.score > Math.max(localBest, cloudBest);

    setLastResult({
      ...result,
      isNewBest,
      sessionId: `${game.id}:${resetKey}`,
    });
    setIsPaused(false);
    pauseStateRef.current = false;
    setLiveScore(result.score);
    setLocalBest((currentBest) => {
      if (result.score > currentBest) {
        saveLocalBestScore(game.id, result.score);
        return result.score;
      }

      return currentBest;
    });
  }, [cloudBest, game?.id, localBest, resetKey]);

  useEffect(() => {
    if (!game) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key !== 'Escape' || lastResult) {
        return;
      }

      event.preventDefault();
      setIsPaused((currentValue) => {
        const nextValue = !currentValue;
        pauseStateRef.current = nextValue;
        return nextValue;
      });
      playArcadeTone('click');
    }

    window.addEventListener('keydown', handleEscape, { passive: false });
    return () => window.removeEventListener('keydown', handleEscape);
  }, [game, lastResult]);

  useEffect(() => {
    if (!lastResult) {
      return undefined;
    }

    const sessionKey = lastResult.sessionId;

    if (handledSessionRef.current === sessionKey) {
      return undefined;
    }

    handledSessionRef.current = sessionKey;

    if (lastResult.score <= 0) {
      setSubmitState({
        loading: false,
        message: 'Finish with a positive score to save this run.',
        error: '',
        kind: 'info',
      });
      showNotice('info', 'Finish with a positive score to save this run.');
      return undefined;
    }

    if (!isFirebaseConfigured) {
      setSubmitState({ loading: false, message: firebaseSetupMessage, error: '', kind: 'info' });
      showNotice('info', firebaseSetupMessage);
      return undefined;
    }

    if (!user) {
      const guestMessage = lastResult.isNewBest
        ? 'New device best. Login to save it.'
        : 'Login required to save score.';

      setSubmitState({
        loading: false,
        message: guestMessage,
        error: '',
        kind: 'info',
      });
      showNotice('info', guestMessage);
      return undefined;
    }

    let cancelled = false;

    async function submitRun() {
      setSubmitState({ loading: true, message: '', error: '', kind: '' });

      try {
        const submissionResult = await submitScore(game.id, lastResult.score, user, lastResult.session);

        if (cancelled) {
          return;
        }

        await refreshProfile();

        if (cancelled) {
          return;
        }

        if (!submissionResult.saved) {
          const infoMessage = `Leaderboard unchanged. Your saved best is ${formatScore(submissionResult.score)}.`;

          setLocalBest((currentBest) => Math.max(currentBest, submissionResult.score));
          setSubmitState({
            loading: false,
            message: infoMessage,
            error: '',
            kind: 'info',
          });
          showNotice('info', infoMessage);
          return;
        }

        setLeaderboardReloadToken((currentToken) => currentToken + 1);

        const successMessage = submissionResult.improved ? 'New high score saved!' : 'Score saved!';

        setSubmitState({
          loading: false,
          message: successMessage,
          error: '',
          kind: 'success',
        });
        showNotice('success', successMessage);
        playArcadeTone('success');
      } catch (error) {
        if (cancelled) {
          return;
        }

        const nextError = error.message || 'Score submission failed.';

        setSubmitState({
          loading: false,
          message: '',
          error: nextError,
          kind: 'error',
        });
        showNotice('error', nextError);
      }
    }

    submitRun();

    return () => {
      cancelled = true;
    };
  }, [game?.id, lastResult, refreshProfile, showNotice, user]);

  const cabinetStatusLabel = lastResult
    ? submitState.loading
      ? 'Saving your score...'
      : submitState.error || submitState.message || 'This run is complete.'
    : '';
  const sessionLabel = lastResult ? 'Run complete' : isPaused ? 'Paused' : 'Live';
  const statusToneClass = submitState.error
    ? 'status-error'
    : submitState.kind === 'success'
      ? 'status-success'
      : 'status-info';
  const helperText = user
    ? 'Scores save automatically when a run ends. No manual submit step needed.'
    : 'Play instantly as a guest, then log in when you want scores saved.';

  if (!game || !GameComponent) {
    return <NotFoundPage />;
  }

  return (
    <div className="space-y-4">
      <ToastNotice notice={notice} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(290px,0.72fr)] lg:items-start">
        <div className="space-y-4">
          <GlassPanel strong className="p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Link
                  className="link-subtle"
                  to="/games"
                >
                  Back To Games
                </Link>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-semibold text-white sm:text-3xl">{game.name}</h2>
                  <span className="score-pill">{sessionLabel}</span>
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">{game.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="score-pill">{game.controls}</span>
                <span className="score-pill">{game.scoring}</span>
                <span className="score-pill">{autoSaveLabel}</span>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <span className="score-pill">Score {formatScore(liveScore)}</span>
                <span className="score-pill">Best {formatScore(displayBest)}</span>
                {lastResult ? <span className="score-pill">Last {formatScore(lastResult.score)}</span> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handlePlayAgain}
                  size="sm"
                >
                  Play Again
                </Button>
                {!lastResult ? (
                  <Button
                    onClick={handlePauseToggle}
                    size="sm"
                    variant="secondary"
                  >
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                ) : null}
              </div>
            </div>

            {lastResult || submitState.error ? (
              <div className={`${statusToneClass} mt-3`}>
                {submitState.loading
                  ? 'Run complete. Saving your score now.'
                  : submitState.error || submitState.message || cabinetStatusLabel}
              </div>
            ) : (
              <p className="mt-3 text-sm leading-6 text-gray-300">{helperText}</p>
            )}
          </GlassPanel>

          <GameCabinet
            GameComponent={GameComponent}
            controlsHint={game.controls}
            gameId={game.id}
            isPaused={isPaused}
            lastResult={lastResult}
            onGameOver={handleGameOver}
            onPlayAgain={handlePlayAgain}
            onScoreChange={handleScoreChange}
            onTogglePause={handlePauseToggle}
            pauseStateRef={pauseStateRef}
            resetKey={resetKey}
            startInstructions={game.instructions}
            statusLabel={cabinetStatusLabel}
            title={game.name}
          />
        </div>

        <div className="space-y-4">
          <GlassPanel className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="section-label">Run Notes</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Controls and saves</h3>
              </div>
              <span className="score-pill">{autoSaveLabel}</span>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Controls</p>
                <p className="mt-2 text-sm leading-6 text-gray-300">{game.controls}</p>
                <p className="mt-1 text-sm leading-6 text-gray-300">Press Esc to pause instantly.</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3">
                <p className="text-[11px] uppercase tracking-[0.22em] text-gray-500">Scoring</p>
                <p className="mt-2 text-sm leading-6 text-gray-300">{game.scoring}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {!user ? (
                <Button
                  size="sm"
                  to="/auth?mode=signin"
                  variant="secondary"
                >
                  Login To Save
                </Button>
              ) : null}
              <Button
                size="sm"
                to="/games"
                variant="secondary"
              >
                Browse Games
              </Button>
              <Button
                size="sm"
                to="/leaderboards"
                variant="ghost"
              >
                View Boards
              </Button>
            </div>

            <p className="mt-4 text-sm leading-6 text-gray-300">
              Finish a run to refresh this leaderboard and update your best saved score for {game.name}.
            </p>
          </GlassPanel>

          <LeaderboardPanel
            gameId={game.id}
            reloadToken={leaderboardReloadToken}
            title={`${game.name} Leaders`}
          />
        </div>
      </div>
    </div>
  );
}
