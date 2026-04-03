import { useEffect, useRef } from 'react';
import { playArcadeTone } from '../lib/sound';
import { clamp, randomInt } from '../lib/utils';
import { drawBackdrop, drawGlowText, roundedRect } from './canvasUtils';

const WIDTH = 900;
const HEIGHT = 520;
const BIRD_X = 180;
const BIRD_RADIUS = 18;
const PIPE_WIDTH = 92;

function createPipe(pipesPassed) {
  return {
    x: WIDTH + 50,
    gapY: randomInt(150, HEIGHT - 150),
    gapSize: Math.max(128, 188 - pipesPassed * 2),
    scored: false,
  };
}

export default function FlappyGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const lastTimeRef = useRef(0);
  const finishedRef = useRef(false);
  const stateRef = useRef({
    birdY: HEIGHT / 2,
    birdVelocity: 0,
    pipes: [],
    elapsed: 0,
    lastSpawnAt: 0,
    pipesPassed: 0,
    taps: 0,
    score: 0,
    gameOver: false,
  });

  useEffect(() => {
    onScoreChange(0);

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    function finishGame() {
      const state = stateRef.current;

      if (finishedRef.current) {
        return;
      }

      finishedRef.current = true;
      state.gameOver = true;
      playArcadeTone('fail');
      onGameOver({
        score: state.score,
        session: {
          durationMs: Math.round(state.elapsed * 1000),
          pipesPassed: state.pipesPassed,
          taps: state.taps,
        },
      });
    }

    function flap() {
      if (stateRef.current.gameOver || pauseStateRef?.current) {
        return;
      }

      stateRef.current.birdVelocity = -470;
      stateRef.current.taps += 1;
      playArcadeTone('click');
    }

    function handleKeyDown(event) {
      if (event.key === ' ' || event.key === 'ArrowUp') {
        event.preventDefault();
        flap();
      }
    }

    function update(delta) {
      const state = stateRef.current;

      if (state.gameOver) {
        return;
      }

      state.elapsed += delta;
      state.birdVelocity += 1180 * delta;
      state.birdY += state.birdVelocity * delta;

      if (state.elapsed - state.lastSpawnAt >= Math.max(0.85, 1.45 - state.pipesPassed * 0.03)) {
        state.pipes.push(createPipe(state.pipesPassed));
        state.lastSpawnAt = state.elapsed;
      }

      const pipeSpeed = 220 + state.pipesPassed * 4;
      state.pipes = state.pipes
        .map((pipe) => ({ ...pipe, x: pipe.x - pipeSpeed * delta }))
        .filter((pipe) => pipe.x > -PIPE_WIDTH - 60);

      for (const pipe of state.pipes) {
        if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.scored = true;
          state.pipesPassed += 1;
          state.score = state.pipesPassed * 15;
          onScoreChange(state.score);
          playArcadeTone('score');
        }

        const hitsPipe =
          BIRD_X + BIRD_RADIUS > pipe.x &&
          BIRD_X - BIRD_RADIUS < pipe.x + PIPE_WIDTH &&
          (state.birdY - BIRD_RADIUS < pipe.gapY - pipe.gapSize / 2 ||
            state.birdY + BIRD_RADIUS > pipe.gapY + pipe.gapSize / 2);

        if (hitsPipe) {
          finishGame();
          return;
        }
      }

      if (state.birdY < BIRD_RADIUS || state.birdY > HEIGHT - 28) {
        finishGame();
      }
    }

    function draw() {
      const state = stateRef.current;

      drawBackdrop(context, WIDTH, HEIGHT);

      context.fillStyle = 'rgba(56, 189, 248, 0.35)';
      context.fillRect(0, HEIGHT - 22, WIDTH, 4);

      state.pipes.forEach((pipe) => {
        context.save();
        context.shadowColor = '#3cf2ff';
        context.shadowBlur = 10;
        context.fillStyle = '#3cf2ff';
        roundedRect(context, pipe.x, 0, PIPE_WIDTH, pipe.gapY - pipe.gapSize / 2, 16);
        context.fill();
        roundedRect(
          context,
          pipe.x,
          pipe.gapY + pipe.gapSize / 2,
          PIPE_WIDTH,
          HEIGHT - pipe.gapY,
          16,
        );
        context.fill();
        context.restore();
      });

      context.save();
      context.shadowColor = '#ff4fd8';
      context.shadowBlur = 10;
      context.fillStyle = '#ff4fd8';
      context.beginPath();
      context.arc(BIRD_X, state.birdY, BIRD_RADIUS, 0, Math.PI * 2);
      context.fill();
      context.restore();

      drawGlowText(context, `Score ${state.score}`, 28, 38, '#3cf2ff');
      drawGlowText(context, 'Tap or press space to flap', WIDTH - 28, 38, '#f9a8d4', 'right', 16);

      if (state.gameOver) {
        context.fillStyle = 'rgba(5, 7, 16, 0.72)';
        roundedRect(context, WIDTH / 2 - 180, HEIGHT / 2 - 70, 360, 140, 24);
        context.fill();
        drawGlowText(context, 'Run crashed', WIDTH / 2, HEIGHT / 2 - 10, '#ffffff', 'center', 28);
        drawGlowText(context, 'Use Play Again to relaunch.', WIDTH / 2, HEIGHT / 2 + 26, '#3cf2ff', 'center', 16);
      }
    }

    function loop(timestamp) {
      if (pauseStateRef?.current) {
        lastTimeRef.current = timestamp;
        draw();
        frameRef.current = window.requestAnimationFrame(loop);
        return;
      }

      const delta = clamp((timestamp - lastTimeRef.current) / 1000 || 0.016, 0.001, 0.034);
      lastTimeRef.current = timestamp;
      update(delta);
      draw();
      frameRef.current = window.requestAnimationFrame(loop);
    }

    canvas.addEventListener('pointerdown', flap);
    window.addEventListener('keydown', handleKeyDown);
    frameRef.current = window.requestAnimationFrame(loop);

    return () => {
      canvas.removeEventListener('pointerdown', flap);
      window.removeEventListener('keydown', handleKeyDown);
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [onGameOver, onScoreChange]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Flappy Clone</p>
          <p className="mt-2 text-sm text-gray-300">Thread the laser gates while the openings shrink.</p>
        </div>
        <span className="score-pill">Click or press space</span>
      </div>

      <canvas
        ref={canvasRef}
        className="mx-auto w-full rounded-[2rem] border border-white/10 bg-black"
        height={HEIGHT}
        width={WIDTH}
      />
    </div>
  );
}
