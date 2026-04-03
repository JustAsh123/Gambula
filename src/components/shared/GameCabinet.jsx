import { memo, Suspense } from 'react';
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
  statusLabel = '',
}) {
  return (
    <GlassPanel strong className="overflow-hidden p-0">
      <div className="game-stage">
        <Suspense fallback={<PageLoader label="Loading cabinet..." />}>
          <GameComponent
            key={`${gameId}-${resetKey}`}
            onGameOver={onGameOver}
            onScoreChange={onScoreChange}
            pauseStateRef={pauseStateRef}
          />
        </Suspense>

        <div className="pointer-events-none absolute inset-x-0 top-4 z-10 flex flex-wrap justify-between gap-2 px-4 sm:px-6">
          <span className="score-pill">{controlsHint}</span>
          <span className="score-pill">Press Esc to pause</span>
        </div>

        {isPaused && !lastResult ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/78 px-6"
            initial={{ opacity: 0 }}
          >
            <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0a0a0a] p-6 text-center shadow-panel">
              <p className="section-label">Paused</p>
              <h3 className="mt-3 text-3xl font-semibold text-white">Take a breath</h3>
              <p className="mt-3 text-sm leading-6 text-gray-300">
                Resume when you are ready, or restart the run instantly.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  className="flex-1"
                  onClick={onTogglePause}
                >
                  Resume Game
                </Button>
                <Button
                  className="flex-1"
                  onClick={onPlayAgain}
                  variant="secondary"
                >
                  Restart Run
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {lastResult ? (
          <motion.div
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-black/78 px-6"
            initial={{ opacity: 0 }}
          >
            <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#0a0a0a] p-6 text-center shadow-panel">
              <p className="section-label">Run Complete</p>
              <h3 className="mt-3 text-3xl font-semibold text-white">Score {lastResult.score}</h3>
              <p className="mt-3 text-sm leading-6 text-gray-300">
                {statusLabel || 'Your result is ready. Start a fresh run whenever you want.'}
              </p>
              <div className="mt-6">
                <Button
                  className="w-full"
                  onClick={onPlayAgain}
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
