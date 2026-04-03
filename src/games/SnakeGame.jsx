import { memo, useEffect, useRef } from 'react';
import { playArcadeTone } from '../lib/sound';
import {
  createSnakeRuntimeState,
  flushSnakeEffects,
  queueSnakeDirection,
  renderSnakeFrame,
  updateSnakeState,
} from './snakeRuntime';

const CANVAS_SIZE = 640;

function SnakeGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const canvasRef = useRef(null);
  const messageRef = useRef(null);
  const frameRef = useRef(0);
  const stateRef = useRef(null);
  const lastFrameAtRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const messageNode = messageRef.current;
    const context = canvas.getContext('2d', { alpha: false });

    stateRef.current = createSnakeRuntimeState();
    onScoreChange(0);
    messageNode.textContent = stateRef.current.statusMessage;

    function handleKeyDown(event) {
      if (event.key.startsWith('Arrow')) {
        event.preventDefault();
      }

      if (pauseStateRef?.current) {
        return;
      }

      const accepted = queueSnakeDirection(stateRef.current, event.key);

      if (accepted) {
        playArcadeTone('click');
      }
    }

    function handleWindowBlur() {
      lastFrameAtRef.current = 0;
    }

    function loop(timestamp) {
      if (pauseStateRef?.current) {
        lastFrameAtRef.current = timestamp;
        renderSnakeFrame(context, stateRef.current);
        frameRef.current = window.requestAnimationFrame(loop);
        return;
      }

      const previousFrameAt = lastFrameAtRef.current || timestamp;
      const deltaMs = Math.min(32, timestamp - previousFrameAt);

      lastFrameAtRef.current = timestamp;
      updateSnakeState(stateRef.current, deltaMs);
      flushSnakeEffects(stateRef.current, {
        onStatusChange(nextMessage) {
          messageNode.textContent = nextMessage;
        },
        onScore(nextScore) {
          onScoreChange(nextScore);
          playArcadeTone('score');
        },
        onGameOver(result) {
          onGameOver(result);
          playArcadeTone('fail');
        },
      });
      renderSnakeFrame(context, stateRef.current);
      frameRef.current = window.requestAnimationFrame(loop);
    }

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('blur', handleWindowBlur);
    renderSnakeFrame(context, stateRef.current);
    frameRef.current = window.requestAnimationFrame(loop);

    return () => {
      window.cancelAnimationFrame(frameRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blur', handleWindowBlur);
      lastFrameAtRef.current = 0;
      stateRef.current = null;
    };
  }, [onGameOver, onScoreChange]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Snake</p>
          <p
            ref={messageRef}
            className="mt-2 text-sm text-gray-300"
          >
            Collect orbs and keep the neon trail alive.
          </p>
        </div>
        <span className="score-pill">Use arrows or WASD</span>
      </div>

      <canvas
        ref={canvasRef}
        className="mx-auto aspect-square w-full max-w-[520px] rounded-[2rem] border border-white/10 bg-black"
        height={CANVAS_SIZE}
        width={CANVAS_SIZE}
      />
    </div>
  );
}

export default memo(SnakeGame);
