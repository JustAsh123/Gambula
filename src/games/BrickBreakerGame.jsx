import { useEffect, useRef } from 'react';
import { playArcadeTone } from '../lib/sound';
import { clamp, randomInt } from '../lib/utils';
import { drawBackdrop, drawGlowText, roundedRect } from './canvasUtils';

const WIDTH = 900;
const HEIGHT = 520;
const PADDLE_Y = 458;
const BASE_PADDLE_WIDTH = 142;
const BALL_RADIUS = 10;
const POWERUP_TYPES = ['extra-life', 'multiball', 'paddle-size', 'slow-ball'];

function createBall(x = WIDTH / 2, y = HEIGHT - 120, angleOffset = 0) {
  return {
    x,
    y,
    radius: BALL_RADIUS,
    vx: Math.sin(angleOffset) * 260,
    vy: -Math.cos(angleOffset) * 320,
  };
}

function createBricks(level) {
  const rows = Math.min(7, 4 + Math.floor(level / 2));
  const columns = 8;
  const brickWidth = 92;
  const brickHeight = 26;
  const gap = 10;
  const maxDurability = Math.min(3, 1 + Math.floor(level / 2));
  const bricks = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const durability = randomInt(1, maxDurability + 1);
      bricks.push({
        x: 54 + column * (brickWidth + gap),
        y: 72 + row * (brickHeight + gap),
        width: brickWidth,
        height: brickHeight,
        durability,
      });
    }
  }

  return bricks;
}

function getBrickColor(durability) {
  if (durability >= 3) {
    return '#f472b6';
  }

  if (durability === 2) {
    return '#60a5fa';
  }

  return '#22c55e';
}

function maybeCreateDrop(brick) {
  if (Math.random() > 0.24) {
    return null;
  }

  const type = POWERUP_TYPES[randomInt(0, POWERUP_TYPES.length)];

  return {
    x: brick.x + brick.width / 2 - 16,
    y: brick.y + brick.height / 2 - 16,
    width: 32,
    height: 32,
    type,
  };
}

function intersectsCircleRect(ball, rect) {
  return (
    ball.x + ball.radius > rect.x &&
    ball.x - ball.radius < rect.x + rect.width &&
    ball.y + ball.radius > rect.y &&
    ball.y - ball.radius < rect.y + rect.height
  );
}

export default function BrickBreakerGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const finishedRef = useRef(false);
  const pointerXRef = useRef(WIDTH / 2);
  const stateRef = useRef({
    paddleX: WIDTH / 2 - BASE_PADDLE_WIDTH / 2,
    paddleWidth: BASE_PADDLE_WIDTH,
    balls: [createBall()],
    bricks: createBricks(1),
    drops: [],
    lives: 3,
    level: 1,
    elapsed: 0,
    score: 0,
    bricksBroken: 0,
    levelsCleared: 0,
    powerupsCollected: 0,
    paddleBoostUntil: 0,
    slowBallUntil: 0,
    gameOver: false,
  });

  useEffect(() => {
    onScoreChange(0);

    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    function syncScore(nextScore) {
      if (nextScore !== stateRef.current.score) {
        stateRef.current.score = nextScore;
        onScoreChange(nextScore);
      }
    }

    function resetServe() {
      const state = stateRef.current;
      state.balls = [createBall(WIDTH / 2, HEIGHT - 120, (Math.random() - 0.5) * 0.7)];
      state.paddleWidth = BASE_PADDLE_WIDTH;
      state.paddleX = WIDTH / 2 - BASE_PADDLE_WIDTH / 2;
      state.paddleBoostUntil = 0;
      state.slowBallUntil = 0;
      pointerXRef.current = WIDTH / 2;
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
          powerupsCollected: state.powerupsCollected,
        },
      });
    }

    function handlePointerMove(event) {
      if (pauseStateRef?.current) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const scaleX = WIDTH / rect.width;
      pointerXRef.current = (event.clientX - rect.left) * scaleX;
    }

    function applyPowerup(type) {
      const state = stateRef.current;
      state.powerupsCollected += 1;
      syncScore(state.score + 50);

      if (type === 'extra-life') {
        state.lives += 1;
      } else if (type === 'multiball') {
        const clonedBalls = [];
        const sourceBalls = state.balls.slice(0, 2);

        sourceBalls.forEach((ball, index) => {
          clonedBalls.push({
            ...ball,
            vx: index % 2 === 0 ? -Math.abs(ball.vx || 180) : Math.abs(ball.vx || 180),
          });
        });

        state.balls = [...state.balls, ...clonedBalls].slice(0, 4);
      } else if (type === 'paddle-size') {
        state.paddleBoostUntil = state.elapsed + 14;
      } else if (type === 'slow-ball') {
        state.slowBallUntil = state.elapsed + 10;
      }

      playArcadeTone(type === 'extra-life' ? 'success' : 'score');
    }

    function update(delta) {
      const state = stateRef.current;

      if (state.gameOver) {
        return;
      }

      state.elapsed += delta;
      state.paddleWidth = state.elapsed < state.paddleBoostUntil ? 210 : BASE_PADDLE_WIDTH;
      state.paddleX = clamp(
        pointerXRef.current - state.paddleWidth / 2,
        24,
        WIDTH - state.paddleWidth - 24,
      );

      const ballSpeedMultiplier =
        (state.elapsed < state.slowBallUntil ? 0.74 : 1) * (1 + state.elapsed * 0.015 + state.level * 0.04);

      const survivingBalls = [];

      for (let ballIndex = 0; ballIndex < state.balls.length; ballIndex += 1) {
        const ball = state.balls[ballIndex];
        ball.x += ball.vx * delta * ballSpeedMultiplier;
        ball.y += ball.vy * delta * ballSpeedMultiplier;

        if (ball.x <= ball.radius || ball.x >= WIDTH - ball.radius) {
          ball.vx *= -1;
          ball.x = clamp(ball.x, ball.radius, WIDTH - ball.radius);
        }

        if (ball.y <= ball.radius) {
          ball.vy *= -1;
          ball.y = ball.radius;
        }

        const paddleRect = {
          x: state.paddleX,
          y: PADDLE_Y,
          width: state.paddleWidth,
          height: 18,
        };

        if (
          ball.y + ball.radius >= paddleRect.y &&
          ball.y - ball.radius <= paddleRect.y + paddleRect.height &&
          ball.x >= paddleRect.x &&
          ball.x <= paddleRect.x + paddleRect.width &&
          ball.vy > 0
        ) {
          const offset = (ball.x - (state.paddleX + state.paddleWidth / 2)) / (state.paddleWidth / 2);
          ball.vy = -Math.abs(ball.vy) * 1.03;
          ball.vx = offset * 360;
          ball.y = paddleRect.y - ball.radius;
        }

        if (ball.y - ball.radius > HEIGHT) {
          continue;
        }

        let destroyedBrick = false;

        for (let brickIndex = 0; brickIndex < state.bricks.length; brickIndex += 1) {
          const brick = state.bricks[brickIndex];

          if (!intersectsCircleRect(ball, brick)) {
            continue;
          }

          brick.durability -= 1;

          const overlapLeft = ball.x + ball.radius - brick.x;
          const overlapRight = brick.x + brick.width - (ball.x - ball.radius);
          const overlapTop = ball.y + ball.radius - brick.y;
          const overlapBottom = brick.y + brick.height - (ball.y - ball.radius);
          const smallestOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

          if (smallestOverlap === overlapLeft || smallestOverlap === overlapRight) {
            ball.vx *= -1;
          } else {
            ball.vy *= -1;
          }

          if (brick.durability <= 0) {
            state.bricks.splice(brickIndex, 1);
            state.bricksBroken += 1;
            syncScore(state.score + 100);

            const drop = maybeCreateDrop(brick);

            if (drop) {
              state.drops.push(drop);
            }

            playArcadeTone('score');
          } else {
            playArcadeTone('click');
          }

          destroyedBrick = true;
          break;
        }

        survivingBalls.push(ball);

        if (destroyedBrick) {
          continue;
        }
      }

      state.balls = survivingBalls;

      if (!state.balls.length) {
        state.lives -= 1;

        if (state.lives <= 0) {
          finishGame();
          return;
        }

        resetServe();
      }

      const nextDrops = [];

      for (let dropIndex = 0; dropIndex < state.drops.length; dropIndex += 1) {
        const drop = state.drops[dropIndex];
        drop.y += 180 * delta;

        const catchesDrop =
          drop.y + drop.height >= PADDLE_Y &&
          drop.x + drop.width >= state.paddleX &&
          drop.x <= state.paddleX + state.paddleWidth;

        if (catchesDrop) {
          applyPowerup(drop.type);
          continue;
        }

        if (drop.y <= HEIGHT + 40) {
          nextDrops.push(drop);
        }
      }

      state.drops = nextDrops;

      if (!state.bricks.length) {
        state.level += 1;
        state.levelsCleared += 1;
        syncScore(state.score + 250);
        state.bricks = createBricks(state.level);
        state.drops = [];
        resetServe();
        playArcadeTone('success');
      }
    }

    function drawDrop(drop) {
      const colorMap = {
        'extra-life': '#22c55e',
        multiball: '#38bdf8',
        'paddle-size': '#f59e0b',
        'slow-ball': '#c084fc',
      };

      context.save();
      context.shadowColor = colorMap[drop.type];
      context.shadowBlur = 10;
      context.fillStyle = colorMap[drop.type];
      roundedRect(context, drop.x, drop.y, drop.width, drop.height, 10);
      context.fill();
      context.restore();
    }

    function draw() {
      const state = stateRef.current;

      drawBackdrop(context, WIDTH, HEIGHT);

      for (let brickIndex = 0; brickIndex < state.bricks.length; brickIndex += 1) {
        const brick = state.bricks[brickIndex];

        context.save();
        context.shadowColor = getBrickColor(brick.durability);
        context.shadowBlur = 8;
        context.fillStyle = getBrickColor(brick.durability);
        roundedRect(context, brick.x, brick.y, brick.width, brick.height, 10);
        context.fill();
        context.restore();

        if (brick.durability > 1) {
          drawGlowText(
            context,
            `${brick.durability}`,
            brick.x + brick.width / 2,
            brick.y + 19,
            '#ffffff',
            'center',
            14,
          );
        }
      }

      for (let dropIndex = 0; dropIndex < state.drops.length; dropIndex += 1) {
        drawDrop(state.drops[dropIndex]);
      }

      context.save();
      context.shadowColor = '#38bdf8';
      context.shadowBlur = 12;
      context.fillStyle = '#38bdf8';
      roundedRect(context, state.paddleX, PADDLE_Y, state.paddleWidth, 18, 10);
      context.fill();
      context.restore();

      for (let ballIndex = 0; ballIndex < state.balls.length; ballIndex += 1) {
        const ball = state.balls[ballIndex];
        context.save();
        context.shadowColor = '#f9a8d4';
        context.shadowBlur = 8;
        context.fillStyle = '#f9a8d4';
        context.beginPath();
        context.arc(ball.x, ball.y, BALL_RADIUS, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }

      drawGlowText(context, `Score ${state.score}`, 28, 38, '#38bdf8');
      drawGlowText(context, `Lives ${state.lives}`, WIDTH - 28, 38, '#fca5a5', 'right', 18);
      drawGlowText(context, `Level ${state.level}`, WIDTH - 28, 66, '#fbbf24', 'right', 16);

      const activeEffects = [];

      if (state.elapsed < state.paddleBoostUntil) {
        activeEffects.push('Wide Paddle');
      }

      if (state.elapsed < state.slowBallUntil) {
        activeEffects.push('Slow Ball');
      }

      if (activeEffects.length) {
        drawGlowText(context, activeEffects.join('  |  '), WIDTH / 2, 38, '#e5e7eb', 'center', 14);
      }

      if (state.gameOver) {
        context.fillStyle = 'rgba(5, 7, 16, 0.72)';
        roundedRect(context, WIDTH / 2 - 200, HEIGHT / 2 - 70, 400, 140, 24);
        context.fill();
        drawGlowText(context, 'Cabinet powered down', WIDTH / 2, HEIGHT / 2 - 10, '#ffffff', 'center', 28);
        drawGlowText(context, 'Play Again to reload the bricks.', WIDTH / 2, HEIGHT / 2 + 26, '#38bdf8', 'center', 16);
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
    frameRef.current = window.requestAnimationFrame(loop);

    return () => {
      canvas.removeEventListener('pointermove', handlePointerMove);
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [onGameOver, onScoreChange, pauseStateRef]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Photon Breaker</p>
          <p className="mt-2 text-sm text-gray-300">
            Break durable bricks, catch random powerups, and keep multiple balls in play.
          </p>
        </div>
        <span className="score-pill">Move the paddle with your mouse</span>
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
