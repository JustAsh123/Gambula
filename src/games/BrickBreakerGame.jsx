import { useEffect, useRef } from 'react';
import { playArcadeTone } from '../lib/sound';
import { clamp } from '../lib/utils';
import { drawBackdrop, drawGlowText, roundedRect } from './canvasUtils';

const WIDTH = 900;
const HEIGHT = 520;
const PADDLE_Y = 460;
const PADDLE_WIDTH = 140;
const BALL_RADIUS = 10;

function createBricks(level) {
  const rows = Math.min(6, 3 + level);
  const columns = 8;
  const brickWidth = 92;
  const brickHeight = 26;
  const gap = 10;
  const bricks = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      bricks.push({
        x: 54 + column * (brickWidth + gap),
        y: 72 + row * (brickHeight + gap),
        width: brickWidth,
        height: brickHeight,
        color: ['#3cf2ff', '#ff4fd8', '#9e5cff', '#4d7cff'][row % 4],
      });
    }
  }

  return bricks;
}

export default function BrickBreakerGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const lastTimeRef = useRef(0);
  const finishedRef = useRef(false);
  const pointerXRef = useRef(WIDTH / 2);
  const keysRef = useRef({ left: false, right: false });
  const stateRef = useRef({
    paddleX: WIDTH / 2 - PADDLE_WIDTH / 2,
    ballX: WIDTH / 2,
    ballY: HEIGHT - 120,
    ballVX: 260,
    ballVY: -320,
    bricks: createBricks(1),
    lives: 3,
    level: 1,
    elapsed: 0,
    score: 0,
    bricksBroken: 0,
    levelsCleared: 0,
    gameOver: false,
  });

  useEffect(() => {
    onScoreChange(0);

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    function resetBall() {
      const state = stateRef.current;
      state.ballX = WIDTH / 2;
      state.ballY = HEIGHT - 120;
      state.ballVX = 260 * (Math.random() > 0.5 ? 1 : -1);
      state.ballVY = -320;
      state.paddleX = WIDTH / 2 - PADDLE_WIDTH / 2;
    }

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
          bricksBroken: state.bricksBroken,
          levelsCleared: state.levelsCleared,
        },
      });
    }

    function handleKeyDown(event) {
      if (pauseStateRef?.current) {
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'a') {
        keysRef.current.left = true;
      }

      if (event.key === 'ArrowRight' || event.key === 'd') {
        keysRef.current.right = true;
      }
    }

    function handleKeyUp(event) {
      if (event.key === 'ArrowLeft' || event.key === 'a') {
        keysRef.current.left = false;
      }

      if (event.key === 'ArrowRight' || event.key === 'd') {
        keysRef.current.right = false;
      }
    }

    function handlePointerMove(event) {
      if (pauseStateRef?.current) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      pointerXRef.current = (event.clientX - rect.left) * scaleX;
    }

    function update(delta) {
      const state = stateRef.current;

      if (state.gameOver) {
        return;
      }

      state.elapsed += delta;
      const keyboardDirection =
        (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);

      if (keyboardDirection !== 0) {
        state.paddleX += keyboardDirection * 520 * delta;
      } else {
        state.paddleX = pointerXRef.current - PADDLE_WIDTH / 2;
      }

      state.paddleX = clamp(state.paddleX, 24, WIDTH - PADDLE_WIDTH - 24);
      state.ballX += state.ballVX * delta;
      state.ballY += state.ballVY * delta;

      if (state.ballX <= BALL_RADIUS || state.ballX >= WIDTH - BALL_RADIUS) {
        state.ballVX *= -1;
      }

      if (state.ballY <= BALL_RADIUS) {
        state.ballVY *= -1;
      }

      const touchesPaddle =
        state.ballY + BALL_RADIUS >= PADDLE_Y &&
        state.ballY - BALL_RADIUS <= PADDLE_Y + 18 &&
        state.ballX >= state.paddleX &&
        state.ballX <= state.paddleX + PADDLE_WIDTH &&
        state.ballVY > 0;

      if (touchesPaddle) {
        const offset = (state.ballX - (state.paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2);
        state.ballVY = -Math.abs(state.ballVY) * 1.02;
        state.ballVX = offset * 380;
      }

      if (state.ballY - BALL_RADIUS > HEIGHT) {
        state.lives -= 1;

        if (state.lives <= 0) {
          finishGame();
          return;
        }

        resetBall();
      }

      for (let index = 0; index < state.bricks.length; index += 1) {
        const brick = state.bricks[index];
        const withinHorizontal =
          state.ballX + BALL_RADIUS > brick.x && state.ballX - BALL_RADIUS < brick.x + brick.width;
        const withinVertical =
          state.ballY + BALL_RADIUS > brick.y && state.ballY - BALL_RADIUS < brick.y + brick.height;

        if (!withinHorizontal || !withinVertical) {
          continue;
        }

        state.bricks.splice(index, 1);
        state.bricksBroken += 1;
        state.score += 100;
        onScoreChange(state.score);
        playArcadeTone('score');

        const overlapLeft = state.ballX + BALL_RADIUS - brick.x;
        const overlapRight = brick.x + brick.width - (state.ballX - BALL_RADIUS);
        const overlapTop = state.ballY + BALL_RADIUS - brick.y;
        const overlapBottom = brick.y + brick.height - (state.ballY - BALL_RADIUS);
        const smallestOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (smallestOverlap === overlapLeft || smallestOverlap === overlapRight) {
          state.ballVX *= -1;
        } else {
          state.ballVY *= -1;
        }

        break;
      }

      if (state.bricks.length === 0) {
        state.level += 1;
        state.levelsCleared += 1;
        state.score += 200;
        state.bricks = createBricks(state.level);
        onScoreChange(state.score);
        playArcadeTone('success');
        resetBall();
      }
    }

    function draw() {
      const state = stateRef.current;

      drawBackdrop(context, WIDTH, HEIGHT);

      state.bricks.forEach((brick) => {
        context.save();
        context.shadowColor = brick.color;
        context.shadowBlur = 8;
        context.fillStyle = brick.color;
        roundedRect(context, brick.x, brick.y, brick.width, brick.height, 10);
        context.fill();
        context.restore();
      });

      context.save();
      context.shadowColor = '#3cf2ff';
      context.shadowBlur = 10;
      context.fillStyle = '#3cf2ff';
      roundedRect(context, state.paddleX, PADDLE_Y, PADDLE_WIDTH, 18, 10);
      context.fill();
      context.restore();

      context.save();
      context.shadowColor = '#f9a8d4';
      context.shadowBlur = 8;
      context.fillStyle = '#f9a8d4';
      context.beginPath();
      context.arc(state.ballX, state.ballY, BALL_RADIUS, 0, Math.PI * 2);
      context.fill();
      context.restore();

      drawGlowText(context, `Score ${state.score}`, 28, 38, '#3cf2ff');
      drawGlowText(context, `Lives ${state.lives}`, WIDTH - 28, 38, '#f9a8d4', 'right', 16);

      if (state.gameOver) {
        context.fillStyle = 'rgba(5, 7, 16, 0.72)';
        roundedRect(context, WIDTH / 2 - 200, HEIGHT / 2 - 70, 400, 140, 24);
        context.fill();
        drawGlowText(context, 'Cabinet powered down', WIDTH / 2, HEIGHT / 2 - 10, '#ffffff', 'center', 28);
        drawGlowText(context, 'Play Again to reload the bricks.', WIDTH / 2, HEIGHT / 2 + 26, '#3cf2ff', 'center', 16);
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

    canvas.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    frameRef.current = window.requestAnimationFrame(loop);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [onGameOver, onScoreChange]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Brick Breaker</p>
          <p className="mt-2 text-sm text-gray-300">Shatter the neon wall, angle the paddle, and survive the faster rebounds.</p>
        </div>
        <span className="score-pill">Move with mouse, arrows, or A/D</span>
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
