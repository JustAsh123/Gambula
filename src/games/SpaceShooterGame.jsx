import { useEffect, useRef } from 'react';
import { playArcadeTone } from '../lib/sound';
import { clamp } from '../lib/utils';
import { drawBackdrop, drawGlowText, roundedRect } from './canvasUtils';

const WIDTH = 900;
const HEIGHT = 520;

function createWave(wave) {
  const columns = Math.min(9, 6 + Math.floor(wave / 2));
  const rows = Math.min(4, 2 + Math.floor(wave / 3));
  const enemies = [];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      enemies.push({
        x: 96 + column * 78,
        y: 78 + row * 56,
        width: 44,
        height: 28,
      });
    }
  }

  return enemies;
}

export default function SpaceShooterGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const lastTimeRef = useRef(0);
  const finishedRef = useRef(false);
  const keysRef = useRef({ left: false, right: false, shoot: false });
  const stateRef = useRef({
    playerX: WIDTH / 2,
    bullets: [],
    enemies: createWave(1),
    enemyDirection: 1,
    enemySpeed: 36,
    shotCooldown: 0,
    score: 0,
    wave: 1,
    elapsed: 0,
    enemiesDestroyed: 0,
    wavesCleared: 0,
    shotsFired: 0,
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
          enemiesDestroyed: state.enemiesDestroyed,
          wavesCleared: state.wavesCleared,
          shotsFired: state.shotsFired,
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

      if (event.key === ' ' || event.key === 'ArrowUp') {
        event.preventDefault();
        keysRef.current.shoot = true;
      }
    }

    function handleKeyUp(event) {
      if (event.key === 'ArrowLeft' || event.key === 'a') {
        keysRef.current.left = false;
      }

      if (event.key === 'ArrowRight' || event.key === 'd') {
        keysRef.current.right = false;
      }

      if (event.key === ' ' || event.key === 'ArrowUp') {
        keysRef.current.shoot = false;
      }
    }

    function update(delta) {
      const state = stateRef.current;

      if (state.gameOver) {
        return;
      }

      state.elapsed += delta;
      state.playerX +=
        ((keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0)) * 340 * delta;
      state.playerX = clamp(state.playerX, 60, WIDTH - 60);
      state.shotCooldown = Math.max(0, state.shotCooldown - delta);

      if (keysRef.current.shoot && state.shotCooldown <= 0) {
        state.bullets.push({ x: state.playerX, y: HEIGHT - 84, width: 4, height: 14 });
        state.shotCooldown = 0.18;
        state.shotsFired += 1;
        playArcadeTone('click');
      }

      state.bullets = state.bullets
        .map((bullet) => ({ ...bullet, y: bullet.y - 520 * delta }))
        .filter((bullet) => bullet.y > -30);

      state.enemies = state.enemies.map((enemy) => ({
        ...enemy,
        x: enemy.x + state.enemyDirection * state.enemySpeed * delta,
      }));

      const hitsEdge = state.enemies.some(
        (enemy) => enemy.x <= 20 || enemy.x + enemy.width >= WIDTH - 20,
      );

      if (hitsEdge) {
        state.enemyDirection *= -1;
        state.enemySpeed += 8;
        state.enemies = state.enemies.map((enemy) => ({ ...enemy, y: enemy.y + 24 }));
      }

      const destroyedIndexes = new Set();
      const survivingBullets = [];
      let scoreChanged = false;

      state.bullets.forEach((bullet) => {
        const hitIndex = state.enemies.findIndex(
          (enemy, index) =>
            !destroyedIndexes.has(index) &&
            bullet.x < enemy.x + enemy.width &&
            bullet.x + bullet.width > enemy.x &&
            bullet.y < enemy.y + enemy.height &&
            bullet.y + bullet.height > enemy.y,
        );

        if (hitIndex >= 0) {
          destroyedIndexes.add(hitIndex);
          state.enemiesDestroyed += 1;
          state.score += 25;
          scoreChanged = true;
          playArcadeTone('score');
        } else {
          survivingBullets.push(bullet);
        }
      });

      state.bullets = survivingBullets;
      state.enemies = state.enemies.filter((_, index) => !destroyedIndexes.has(index));

      if (scoreChanged) {
        onScoreChange(state.score);
      }

      if (state.enemies.some((enemy) => enemy.y + enemy.height >= HEIGHT - 86)) {
        finishGame();
        return;
      }

      if (state.enemies.length === 0) {
        state.wave += 1;
        state.wavesCleared += 1;
        state.score += 100;
        state.enemySpeed = 36 + state.wave * 8;
        state.enemyDirection = state.wave % 2 === 0 ? -1 : 1;
        state.enemies = createWave(state.wave);
        onScoreChange(state.score);
        playArcadeTone('success');
      }
    }

    function draw() {
      const state = stateRef.current;

      drawBackdrop(context, WIDTH, HEIGHT);

      state.enemies.forEach((enemy) => {
        context.save();
        context.shadowColor = '#ff4fd8';
        context.shadowBlur = 10;
        context.fillStyle = '#ff4fd8';
        roundedRect(context, enemy.x, enemy.y, enemy.width, enemy.height, 10);
        context.fill();
        context.restore();
      });

      context.strokeStyle = '#3cf2ff';
      context.lineWidth = 3;
      state.bullets.forEach((bullet) => {
        context.beginPath();
        context.moveTo(bullet.x, bullet.y);
        context.lineTo(bullet.x, bullet.y - 16);
        context.stroke();
      });

      context.save();
      context.shadowColor = '#3cf2ff';
      context.shadowBlur = 10;
      context.fillStyle = '#3cf2ff';
      context.beginPath();
      context.moveTo(state.playerX, HEIGHT - 58);
      context.lineTo(state.playerX - 26, HEIGHT - 18);
      context.lineTo(state.playerX + 26, HEIGHT - 18);
      context.closePath();
      context.fill();
      context.restore();

      drawGlowText(context, `Score ${state.score}`, 28, 38, '#3cf2ff');
      drawGlowText(context, `Wave ${state.wave}`, WIDTH - 28, 38, '#f9a8d4', 'right', 16);

      if (state.gameOver) {
        context.fillStyle = 'rgba(5, 7, 16, 0.72)';
        roundedRect(context, WIDTH / 2 - 190, HEIGHT / 2 - 70, 380, 140, 24);
        context.fill();
        drawGlowText(context, 'Sector breached', WIDTH / 2, HEIGHT / 2 - 10, '#ffffff', 'center', 28);
        drawGlowText(context, 'Play Again to redeploy.', WIDTH / 2, HEIGHT / 2 + 26, '#3cf2ff', 'center', 16);
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

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    frameRef.current = window.requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [onGameOver, onScoreChange]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Space Shooter</p>
          <p className="mt-2 text-sm text-gray-300">Clear wave after wave before the invaders reach the lower deck.</p>
        </div>
        <span className="score-pill">Move with arrows or A/D, shoot with space</span>
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
