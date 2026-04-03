import { useEffect, useRef } from 'react';
import { playArcadeTone } from '../lib/sound';
import { clamp, randomInt } from '../lib/utils';
import { drawBackdrop, drawGlowText, roundedRect } from './canvasUtils';

const WIDTH = 900;
const HEIGHT = 520;
const GROUND_Y = 420;

export default function EndlessRunnerGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const lastTimeRef = useRef(0);
  const finishedRef = useRef(false);
  const stateRef = useRef({
    playerY: GROUND_Y - 58,
    velocityY: 0,
    obstacles: [],
    elapsed: 0,
    spawnIn: 0.9,
    score: 0,
    jumps: 0,
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
          distance: state.score,
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

      const runSpeed = Math.min(620, 320 + state.elapsed * 16);
      state.spawnIn -= delta;

      if (state.spawnIn <= 0) {
        state.obstacles.push({
          x: WIDTH + 40,
          width: randomInt(28, 58),
          height: randomInt(48, 92),
        });
        state.spawnIn = Math.max(0.62, 1.35 - state.elapsed * 0.015 + Math.random() * 0.28);
      }

      state.obstacles = state.obstacles
        .map((obstacle) => ({ ...obstacle, x: obstacle.x - runSpeed * delta }))
        .filter((obstacle) => obstacle.x > -100);

      const playerBox = { x: 126, y: state.playerY, width: 48, height: 58 };

      for (const obstacle of state.obstacles) {
        const hitsObstacle =
          playerBox.x < obstacle.x + obstacle.width &&
          playerBox.x + playerBox.width > obstacle.x &&
          playerBox.y < GROUND_Y - obstacle.height + obstacle.height &&
          playerBox.y + playerBox.height > GROUND_Y - obstacle.height;

        if (hitsObstacle) {
          finishGame();
          return;
        }
      }

      const nextScore = Math.floor(state.score + runSpeed * delta * 0.12);

      if (nextScore !== state.score) {
        state.score = nextScore;
        onScoreChange(state.score);
      }
    }

    function draw() {
      const state = stateRef.current;

      drawBackdrop(context, WIDTH, HEIGHT);

      context.strokeStyle = 'rgba(60,242,255,0.45)';
      context.lineWidth = 4;
      context.beginPath();
      context.moveTo(0, GROUND_Y);
      context.lineTo(WIDTH, GROUND_Y);
      context.stroke();

      context.fillStyle = 'rgba(77,124,255,0.25)';
      for (let x = -30; x < WIDTH; x += 90) {
        context.fillRect(x + ((state.score * 4) % 90), GROUND_Y + 18, 50, 6);
      }

      state.obstacles.forEach((obstacle) => {
        context.save();
        context.shadowColor = '#ff4fd8';
        context.shadowBlur = 10;
        context.fillStyle = '#ff4fd8';
        roundedRect(context, obstacle.x, GROUND_Y - obstacle.height, obstacle.width, obstacle.height, 14);
        context.fill();
        context.restore();
      });

      context.save();
      context.shadowColor = '#3cf2ff';
      context.shadowBlur = 10;
      context.fillStyle = '#3cf2ff';
      roundedRect(context, 126, state.playerY, 48, 58, 12);
      context.fill();
      context.restore();

      drawGlowText(context, `Distance ${state.score}`, 28, 38, '#3cf2ff');
      drawGlowText(context, 'Jump with space, up, or tap', WIDTH - 28, 38, '#f9a8d4', 'right', 16);

      if (state.gameOver) {
        context.fillStyle = 'rgba(5, 7, 16, 0.72)';
        roundedRect(context, WIDTH / 2 - 190, HEIGHT / 2 - 70, 380, 140, 24);
        context.fill();
        drawGlowText(context, 'Signal lost', WIDTH / 2, HEIGHT / 2 - 10, '#ffffff', 'center', 28);
        drawGlowText(context, 'Press Play Again to sprint again.', WIDTH / 2, HEIGHT / 2 + 26, '#3cf2ff', 'center', 16);
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
  }, [onGameOver, onScoreChange]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Endless Runner</p>
          <p className="mt-2 text-sm text-gray-300">Sprint through the neon grid and clear the rising obstacle speed.</p>
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
