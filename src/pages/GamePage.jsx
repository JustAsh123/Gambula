import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import LeaderboardPanel from '../components/leaderboard/LeaderboardPanel';
import Button from '../components/shared/Button';
import Card from '../components/shared/Card';
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

  if (!game || !GameComponent) {
    return <NotFoundPage />;
  }

  return (
    <div className="space-y-6">
      <ToastNotice notice={notice} />

      <GlassPanel strong className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link
              className="link-subtle"
              to="/games"
            >
              Back To Games
            </Link>
            <h2 className="mt-3 text-4xl font-semibold text-white">{game.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-300">{game.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="score-pill">{game.controls}</span>
            <span className="score-pill">{game.scoring}</span>
            <span className="score-pill">{autoSaveLabel}</span>
          </div>
        </div>
      </GlassPanel>

      <div className="grid gap-6 lg:grid-cols-[1.35fr,0.65fr]">
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
          statusLabel={cabinetStatusLabel}
        />

        <div className="space-y-6">
          <GlassPanel className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-label">Run Stats</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Current session</h3>
              </div>
              <span className="score-pill">{sessionLabel}</span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <Card className="p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Live score</p>
                <p className="mt-3 text-3xl font-semibold text-white">{formatScore(liveScore)}</p>
              </Card>
              <Card className="p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">
                  Best saved score
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">{formatScore(displayBest)}</p>
              </Card>
            </div>

            {lastResult ? (
              <div className={`${submitState.kind === 'success' ? 'status-success' : 'status-info'} mt-4`}>
                {submitState.loading
                  ? 'Game over recorded. Saving your score now.'
                  : submitState.message || cabinetStatusLabel}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-6 text-gray-300">
                Finish a run to update your score summary and your place on this game&apos;s leaderboard.
              </p>
            )}

            {submitState.error ? (
              <p className="status-error mt-4">
                {submitState.error}
              </p>
            ) : null}
          </GlassPanel>

          <GlassPanel className="p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="section-label">Controls</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Play, pause, and retry</h3>
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <Card className="p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-gray-500">Keyboard hints</p>
                <p className="mt-3 text-sm leading-6 text-gray-300">{game.controls}</p>
                <p className="mt-2 text-sm leading-6 text-gray-300">Press Esc to pause the current run.</p>
              </Card>
            </div>

            <div className="mt-5 flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={handlePlayAgain}
              >
                Play Again
              </Button>
              {!lastResult ? (
                <Button
                  className="w-full"
                  onClick={handlePauseToggle}
                  variant="secondary"
                >
                  {isPaused ? 'Resume Game' : 'Pause Game'}
                </Button>
              ) : null}
              {!user ? (
                <Button
                  className="w-full"
                  to="/auth?mode=signin"
                  variant="secondary"
                >
                  Login To Save Scores
                </Button>
              ) : null}
              <Button
                className="w-full"
                to="/games"
                variant="secondary"
              >
                Browse Other Games
              </Button>
            </div>

            {user ? (
              <p className="mt-4 text-sm leading-6 text-gray-300">
                Scores save automatically when the run ends. No extra submit step needed.
              </p>
            ) : null}
            {!user ? (
              <p className="mt-4 text-sm leading-6 text-gray-300">
                Play as a guest any time, then log in when you want your scores saved to the leaderboard.
              </p>
            ) : null}
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
