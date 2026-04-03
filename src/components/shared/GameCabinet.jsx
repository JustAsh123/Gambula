import { memo, Suspense, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Button from './Button';
import GlassPanel from './GlassPanel';
import PageLoader from './PageLoader';

function GameCabinet({
  controlsHint,
  gameId,
  GameComponent,
  isPaused = false,
  lastResult = null,
  onGameOver,
  onPlayAgain,
  onScoreChange,
  onTogglePause,
  pauseStateRef,
  resetKey,
  startInstructions = '',
  title = '',
  statusLabel = '',
}) {
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    setHasStarted(false);
  }, [gameId]);

  return (
    <GlassPanel strong className="overflow-hidden p-0">
      <div className="game-stage">
        {hasStarted ? (
          <Suspense fallback={<PageLoader label="Loading cabinet..." />}>
            <GameComponent
              key={`${gameId}-${resetKey}`}
              onGameOver={onGameOver}
              onScoreChange={onScoreChange}
              pauseStateRef={pauseStateRef}
            />
          </Suspense>
        ) : (
          <div className="h-full min-h-[22rem]" />
        )}

        {hasStarted ? (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex flex-wrap justify-between gap-2 px-3 sm:px-4">
            <span className="score-pill">{controlsHint}</span>
            <span className="score-pill">Esc pauses</span>
          </div>
        ) : null}

        {!hasStarted ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/76 px-4"
            initial={{ opacity: 0 }}
          >
            <div className="w-full max-w-sm rounded-[1.5rem] border border-white/10 bg-[#0a0a0a] p-5 text-center shadow-panel sm:p-6">
              <p className="section-label">How To Play</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                {startInstructions || 'Start when you are ready.'}
              </p>
              <div className="mt-3 flex justify-center">
                <span className="score-pill">{controlsHint}</span>
              </div>
              <div className="mt-5 flex justify-center">
                <Button
                  onClick={() => setHasStarted(true)}
                  size="sm"
                >
                  Start Game
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {hasStarted && isPaused && !lastResult ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/68 px-4"
            initial={{ opacity: 0 }}
          >
            <div className="w-full max-w-xs rounded-[1.5rem] border border-white/10 bg-[#0a0a0a] p-5 text-center shadow-panel">
              <p className="section-label">Paused</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Run paused</h3>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                Resume when you are ready, or restart the run instantly.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <Button
                  onClick={onTogglePause}
                  size="sm"
                >
                  Resume
                </Button>
                <Button
                  onClick={onPlayAgain}
                  size="sm"
                  variant="secondary"
                >
                  Restart
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {hasStarted && lastResult ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/72 px-4"
            initial={{ opacity: 0 }}
          >
            <div className="w-full max-w-xs rounded-[1.5rem] border border-white/10 bg-[#0a0a0a] p-5 text-center shadow-panel">
              <p className="section-label">Run Complete</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Score {lastResult.score}</h3>
              <p className="mt-2 text-sm leading-6 text-gray-300">
                {statusLabel || 'Your result is ready. Start a fresh run whenever you want.'}
              </p>
              <div className="mt-5 flex justify-center">
                <Button
                  onClick={onPlayAgain}
                  size="sm"
                >
                  Play Again
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </div>
    </GlassPanel>
  );
}

export default memo(GameCabinet);
