import { useEffect, useRef } from 'react';
import { playArcadeTone } from '../lib/sound';
import { clamp, randomInt } from '../lib/utils';
import { drawBackdrop, drawGlowText, roundedRect } from './canvasUtils';

const WIDTH = 900;
const HEIGHT = 520;
const GROUND_Y = 420;

function createObstacle(runSpeed) {
  return {
    kind: 'obstacle',
    x: WIDTH + 40,
    width: randomInt(28, 58),
    height: randomInt(48, 96),
    speed: runSpeed,
  };
}

function createPowerup(type, runSpeed) {
  return {
    kind: type,
    x: WIDTH + 40,
    y: randomInt(250, 340),
    width: 30,
    height: 30,
    speed: runSpeed * 0.92,
  };
}

function intersects(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export default function EndlessRunnerGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const finishedRef = useRef(false);
  const stateRef = useRef({
    playerY: GROUND_Y - 58,
    velocityY: 0,
    obstacles: [],
    powerups: [],
    elapsed: 0,
    spawnIn: 0.7,
    powerupIn: 4.8,
    distanceUnits: 0,
    score: 0,
    jumps: 0,
    powerupsCollected: 0,
    shieldPickups: 0,
    speedBoostPickups: 0,
    doubleScorePickups: 0,
    speedBoostUntil: 0,
    shieldUntil: 0,
    doubleScoreUntil: 0,
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
          jumps: state.jumps,
          distanceUnits: Math.round(state.distanceUnits),
          powerupsCollected: state.powerupsCollected,
          shieldPickups: state.shieldPickups,
          speedBoostPickups: state.speedBoostPickups,
          doubleScorePickups: state.doubleScorePickups,
        },
      });
    }

    function jump() {
      const state = stateRef.current;
      const onGround = state.playerY >= GROUND_Y - 58 - 1;

      if (!onGround || state.gameOver || pauseStateRef?.current) {
        return;
      }

      state.velocityY = -610;
      state.jumps += 1;
      playArcadeTone('click');
    }

    function handleKeyDown(event) {
      if (event.key === ' ' || event.key === 'ArrowUp' || event.key === 'w') {
        event.preventDefault();
        jump();
      }
    }

    function grantPowerup(type) {
      const state = stateRef.current;
      state.powerupsCollected += 1;

      if (type === 'speed-boost') {
        state.speedBoostPickups += 1;
        state.speedBoostUntil = state.elapsed + 7.5;
      } else if (type === 'shield') {
        state.shieldPickups += 1;
        state.shieldUntil = state.elapsed + 10;
      } else if (type === 'double-score') {
        state.doubleScorePickups += 1;
        state.doubleScoreUntil = state.elapsed + 8;
      }

      playArcadeTone('success');
    }

    function update(delta) {
      const state = stateRef.current;

      if (state.gameOver) {
        return;
      }

      state.elapsed += delta;
      state.velocityY += 1600 * delta;
      state.playerY += state.velocityY * delta;

      if (state.playerY > GROUND_Y - 58) {
        state.playerY = GROUND_Y - 58;
        state.velocityY = 0;
      }

      const baseRunSpeed = Math.min(760, 320 + state.elapsed * 20);
      const runSpeed =
        baseRunSpeed + (state.elapsed < state.speedBoostUntil ? 130 : 0);
      const scoreMultiplier = state.elapsed < state.doubleScoreUntil ? 2 : 1;

      state.spawnIn -= delta;
      state.powerupIn -= delta;

      if (state.spawnIn <= 0) {
        state.obstacles.push(createObstacle(runSpeed));
        state.spawnIn = Math.max(0.46, 1.05 - state.elapsed * 0.012 + Math.random() * 0.2);
      }

      if (state.powerupIn <= 0) {
        const types = ['speed-boost', 'shield', 'double-score'];
        state.powerups.push(createPowerup(types[randomInt(0, types.length)], runSpeed));
        state.powerupIn = Math.max(4, 7.5 - state.elapsed * 0.08 + Math.random() * 1.5);
      }

      for (let index = state.obstacles.length - 1; index >= 0; index -= 1) {
        const obstacle = state.obstacles[index];
        obstacle.x -= runSpeed * delta;

        if (obstacle.x + obstacle.width < -20) {
          state.obstacles.splice(index, 1);
        }
      }

      for (let index = state.powerups.length - 1; index >= 0; index -= 1) {
        const powerup = state.powerups[index];
        powerup.x -= powerup.speed * delta;

        if (powerup.x + powerup.width < -20) {
          state.powerups.splice(index, 1);
        }
      }

      const playerBox = { x: 126, y: state.playerY, width: 48, height: 58 };

      for (let index = state.obstacles.length - 1; index >= 0; index -= 1) {
        const obstacle = state.obstacles[index];
        const obstacleBox = {
          x: obstacle.x,
          y: GROUND_Y - obstacle.height,
          width: obstacle.width,
          height: obstacle.height,
        };

        if (!intersects(playerBox, obstacleBox)) {
          continue;
        }

        if (state.elapsed < state.shieldUntil) {
          state.shieldUntil = 0;
          state.obstacles.splice(index, 1);
          playArcadeTone('success');
          continue;
        }

        finishGame();
        return;
      }

      for (let index = state.powerups.length - 1; index >= 0; index -= 1) {
        const powerup = state.powerups[index];

        if (!intersects(playerBox, powerup)) {
          continue;
        }

        grantPowerup(powerup.kind);
        state.powerups.splice(index, 1);
      }

      state.distanceUnits += runSpeed * delta * 0.12 * scoreMultiplier;
      const nextScore = Math.floor(state.distanceUnits);

      if (nextScore !== state.score) {
        state.score = nextScore;
        onScoreChange(nextScore);
      }
    }

    function drawPowerup(powerup) {
      const colors = {
        'speed-boost': '#f59e0b',
        shield: '#22c55e',
        'double-score': '#38bdf8',
      };

      context.save();
      context.shadowColor = colors[powerup.kind];
      context.shadowBlur = 10;
      context.fillStyle = colors[powerup.kind];
      roundedRect(context, powerup.x, powerup.y, powerup.width, powerup.height, 12);
      context.fill();
      context.restore();
    }

    function draw() {
      const state = stateRef.current;

      drawBackdrop(context, WIDTH, HEIGHT);

      context.strokeStyle = 'rgba(56, 189, 248, 0.35)';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(0, GROUND_Y);
      context.lineTo(WIDTH, GROUND_Y);
      context.stroke();

      context.fillStyle = 'rgba(59, 130, 246, 0.22)';
      for (let x = -30; x < WIDTH; x += 90) {
        context.fillRect(x + ((state.score * 5) % 90), GROUND_Y + 18, 50, 6);
      }

      state.obstacles.forEach((obstacle) => {
        context.save();
        context.shadowColor = '#f472b6';
        context.shadowBlur = 10;
        context.fillStyle = '#f472b6';
        roundedRect(context, obstacle.x, GROUND_Y - obstacle.height, obstacle.width, obstacle.height, 14);
        context.fill();
        context.restore();
      });

      state.powerups.forEach((powerup) => drawPowerup(powerup));

      context.save();
      context.shadowColor = state.elapsed < state.shieldUntil ? '#22c55e' : '#38bdf8';
      context.shadowBlur = 12;
      context.fillStyle = state.elapsed < state.shieldUntil ? '#22c55e' : '#38bdf8';
      roundedRect(context, 126, state.playerY, 48, 58, 12);
      context.fill();
      context.restore();

      drawGlowText(context, `Distance ${state.score}`, 28, 38, '#38bdf8');
      drawGlowText(context, 'Jump with space, up, or tap', WIDTH - 28, 38, '#f9a8d4', 'right', 16);

      const effects = [];

      if (state.elapsed < state.speedBoostUntil) {
        effects.push('Speed Boost');
      }

      if (state.elapsed < state.shieldUntil) {
        effects.push('Shield');
      }

      if (state.elapsed < state.doubleScoreUntil) {
        effects.push('Double Score');
      }

      if (effects.length) {
        drawGlowText(context, effects.join('  |  '), WIDTH / 2, 38, '#e5e7eb', 'center', 14);
      }

      if (state.gameOver) {
        context.fillStyle = 'rgba(5, 7, 16, 0.72)';
        roundedRect(context, WIDTH / 2 - 190, HEIGHT / 2 - 70, 380, 140, 24);
        context.fill();
        drawGlowText(context, 'Signal lost', WIDTH / 2, HEIGHT / 2 - 10, '#ffffff', 'center', 28);
        drawGlowText(context, 'Press Play Again to sprint again.', WIDTH / 2, HEIGHT / 2 + 26, '#38bdf8', 'center', 16);
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

    canvas.addEventListener('pointerdown', jump);
    window.addEventListener('keydown', handleKeyDown);
    frameRef.current = window.requestAnimationFrame(loop);

    return () => {
      canvas.removeEventListener('pointerdown', jump);
      window.removeEventListener('keydown', handleKeyDown);
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [onGameOver, onScoreChange, pauseStateRef]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Neon Runner</p>
          <p className="mt-2 text-sm text-gray-300">
            Keep running, chain powerups, and survive faster obstacle waves as the city speeds up.
          </p>
        </div>
        <span className="score-pill">Tap, up, or space to jump</span>
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
