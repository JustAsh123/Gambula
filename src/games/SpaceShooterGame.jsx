import { useEffect, useRef } from 'react';
import { playArcadeTone } from '../lib/sound';
import { clamp, randomInt } from '../lib/utils';
import { drawBackdrop, drawGlowText, roundedRect } from './canvasUtils';

const WIDTH = 900;
const HEIGHT = 520;
const PLAYER_Y = HEIGHT - 54;
const SURVIVAL_POINTS_PER_SECOND = 10;
const START_GRACE_PERIOD = 2.5;
const BASE_SPAWN_RATE = 0.34;
const MAX_SPAWN_RATE = 0.9;
const BASE_SPEED_SCALE = 1;
const MAX_SPEED_SCALE = 1.55;
const MAX_FLOATING_POWERUPS = 1;

function createEnemy(type) {
  const x = randomInt(70, WIDTH - 70);

  if (type === 'tank') {
    return {
      kind: 'tank',
      x,
      y: -48,
      width: 54,
      height: 42,
      hp: 4,
      maxHp: 4,
      baseSpeed: 76,
      points: 120,
      color: '#7dd3fc',
    };
  }

  if (type === 'zigzag') {
    return {
      kind: 'zigzag',
      x,
      y: -38,
      width: 38,
      height: 34,
      hp: 2,
      maxHp: 2,
      baseSpeed: 96,
      points: 70,
      color: '#c084fc',
      baseX: x,
      phase: Math.random() * Math.PI * 2,
      amplitude: randomInt(30, 66),
    };
  }

  return {
    kind: 'fast',
    x,
    y: -34,
    width: 34,
    height: 30,
    hp: 1,
    maxHp: 1,
    baseSpeed: 118,
    points: 45,
    color: '#f472b6',
  };
}

function createMiniBoss() {
  const maxHp = 16;

  return {
    kind: 'boss',
    x: WIDTH / 2 - 60,
    y: -92,
    width: 120,
    height: 76,
    hp: maxHp,
    maxHp,
    baseSpeed: 64,
    direction: Math.random() > 0.5 ? 1 : -1,
    points: 600,
    color: '#f59e0b',
  };
}

function pickEnemyType(elapsed) {
  const roll = Math.random();
  const adjustedTime = Math.max(0, elapsed - START_GRACE_PERIOD);
  const tankChance = Math.min(0.22, 0.08 + adjustedTime * 0.002);
  const zigzagChance = Math.min(0.2, 0.1 + adjustedTime * 0.0018);

  if (roll < tankChance) {
    return 'tank';
  }

  if (roll < tankChance + zigzagChance) {
    return 'zigzag';
  }

  return 'fast';
}

function createPowerup() {
  const roll = Math.random();
  let type = 'health-pack';

  if (roll > 0.9) {
    type = 'screen-clear';
  } else if (roll > 0.62) {
    type = 'shield';
  } else if (roll > 0.34) {
    type = 'rapid-fire';
  }

  return {
    type,
    x: randomInt(90, WIDTH - 90),
    y: -40,
    width: 34,
    height: 34,
    speed: 92,
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

function getPowerupStyle(type) {
  if (type === 'health-pack') {
    return { color: '#22c55e', label: 'HP' };
  }

  if (type === 'shield') {
    return { color: '#38bdf8', label: 'SH' };
  }

  if (type === 'rapid-fire') {
    return { color: '#f59e0b', label: 'RF' };
  }

  return { color: '#ef4444', label: 'CL' };
}

export default function SpaceShooterGame({ onGameOver, onScoreChange, pauseStateRef }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const lastTimeRef = useRef(0);
  const finishedRef = useRef(false);
  const keysRef = useRef({ left: false, right: false, shoot: false });
  const stateRef = useRef({
    playerX: WIDTH / 2,
    lives: 3,
    bullets: [],
    enemies: [],
    powerups: [],
    elapsed: 0,
    spawnTimer: 1 / BASE_SPAWN_RATE,
    bossTimer: randomInt(38, 56),
    powerupTimer: randomInt(10, 16),
    invulnerableFor: 0,
    shieldUntil: 0,
    rapidFireUntil: 0,
    shotCooldown: 0,
    score: 0,
    killScore: 0,
    survivalScore: 0,
    survivalCarry: 0,
    enemiesDestroyed: 0,
    bossesDefeated: 0,
    powerupsCollected: 0,
    collisions: 0,
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

    function spawnEnemyWave() {
      const state = stateRef.current;
      const adjustedTime = Math.max(0, state.elapsed - START_GRACE_PERIOD);
      const burstChance = Math.min(0.3, adjustedTime * 0.005);
      const spawnCount = Math.random() < burstChance ? 2 : 1;

      for (let spawnIndex = 0; spawnIndex < spawnCount; spawnIndex += 1) {
        state.enemies.push(createEnemy(pickEnemyType(state.elapsed)));
      }
    }

    function clearEnemiesForPowerup() {
      const state = stateRef.current;
      const remainingEnemies = [];
      let clearedScore = 0;

      for (let index = 0; index < state.enemies.length; index += 1) {
        const enemy = state.enemies[index];
        clearedScore += enemy.points;
        state.enemiesDestroyed += 1;

        if (enemy.kind === 'boss') {
          state.bossesDefeated += 1;
        }
      }

      state.enemies = remainingEnemies;
      state.killScore += clearedScore;
      syncScore(state.killScore + state.survivalScore);
      playArcadeTone('success');
    }

    function applyPowerup(type) {
      const state = stateRef.current;
      state.powerupsCollected += 1;

      if (type === 'health-pack') {
        state.lives = Math.min(5, state.lives + 1);
      } else if (type === 'shield') {
        state.shieldUntil = state.elapsed + 4;
      } else if (type === 'rapid-fire') {
        state.rapidFireUntil = state.elapsed + 5;
      } else if (type === 'screen-clear') {
        clearEnemiesForPowerup();
      }

      playArcadeTone(type === 'screen-clear' ? 'success' : 'score');
    }

    function loseLife() {
      const state = stateRef.current;

      if (state.invulnerableFor > 0 || state.elapsed < state.shieldUntil) {
        return;
      }

      state.lives = Math.max(0, state.lives - 1);
      state.collisions += 1;
      state.invulnerableFor = 1.15;
      playArcadeTone('fail');

      if (state.lives <= 0) {
        finishGame();
      }
    }

    function finishGame() {
      const state = stateRef.current;

      if (finishedRef.current) {
        return;
      }

      finishedRef.current = true;
      state.gameOver = true;
      onGameOver({
        score: state.score,
        session: {
          durationMs: Math.round(state.elapsed * 1000),
          enemiesDestroyed: state.enemiesDestroyed,
          bossesDefeated: state.bossesDefeated,
          killScore: state.killScore,
          survivalScore: state.survivalScore,
          collisions: state.collisions,
          livesLost: 3 - state.lives,
          powerupsCollected: state.powerupsCollected,
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
      state.invulnerableFor = Math.max(0, state.invulnerableFor - delta);
      state.shotCooldown = Math.max(0, state.shotCooldown - delta);

      const adjustedTime = Math.max(0, state.elapsed - START_GRACE_PERIOD);
      const spawnRate = Math.min(MAX_SPAWN_RATE, BASE_SPAWN_RATE + adjustedTime * 0.02);
      const speedScale = Math.min(MAX_SPEED_SCALE, BASE_SPEED_SCALE + adjustedTime * 0.01);
      const playerDirection = (keysRef.current.right ? 1 : 0) - (keysRef.current.left ? 1 : 0);
      const rapidFireActive = state.elapsed < state.rapidFireUntil;
      const shieldActive = state.elapsed < state.shieldUntil;

      state.playerX = clamp(state.playerX + playerDirection * 340 * delta, 52, WIDTH - 52);

      if (keysRef.current.shoot && state.shotCooldown <= 0) {
        state.bullets.push({
          x: state.playerX - 2,
          y: PLAYER_Y - 28,
          width: 4,
          height: 18,
          damage: 1,
        });
        state.shotCooldown = rapidFireActive ? 0.095 : 0.17;
        playArcadeTone('click');
      }

      if (adjustedTime > 0) {
        state.spawnTimer -= delta;

        if (state.spawnTimer <= 0) {
          spawnEnemyWave();
          state.spawnTimer = 1 / spawnRate;
        }
      }

      if (state.elapsed >= state.bossTimer && !state.enemies.some((enemy) => enemy.kind === 'boss')) {
        state.enemies.push(createMiniBoss());
        state.bossTimer += randomInt(36, 57);
        playArcadeTone('success');
      }

      state.powerupTimer -= delta;

      if (
        state.powerupTimer <= 0 &&
        state.powerups.length < MAX_FLOATING_POWERUPS
      ) {
        state.powerups.push(createPowerup());
        state.powerupTimer = randomInt(10, 16);
      }

      state.bullets = state.bullets
        .map((bullet) => ({ ...bullet, y: bullet.y - 620 * delta }))
        .filter((bullet) => bullet.y > -40);

      const playerBox = {
        x: state.playerX - 24,
        y: PLAYER_Y - 22,
        width: 48,
        height: 34,
      };

      const survivingEnemies = [];
      let scoreChanged = false;

      for (let enemyIndex = 0; enemyIndex < state.enemies.length; enemyIndex += 1) {
        const enemy = state.enemies[enemyIndex];

        if (enemy.kind === 'boss') {
          if (enemy.y < 82) {
            enemy.y += enemy.baseSpeed * speedScale * delta;
          } else {
            enemy.x += enemy.direction * enemy.baseSpeed * speedScale * 0.55 * delta;

            if (enemy.x <= 24 || enemy.x + enemy.width >= WIDTH - 24) {
              enemy.direction *= -1;
            }
          }
        } else {
          enemy.y += enemy.baseSpeed * speedScale * delta;

          if (enemy.kind === 'zigzag') {
            enemy.x = clamp(
              enemy.baseX + Math.sin(state.elapsed * 4.2 + enemy.phase) * enemy.amplitude,
              24,
              WIDTH - enemy.width - 24,
            );
          }
        }

        if (intersects(enemy, playerBox)) {
          loseLife();

          if (!shieldActive && enemy.kind !== 'boss') {
            continue;
          }

          if (shieldActive && enemy.kind !== 'boss') {
            state.killScore += enemy.points;
            state.enemiesDestroyed += 1;
            scoreChanged = true;
            continue;
          }
        }

        if (enemy.y > HEIGHT + 10) {
          loseLife();
          continue;
        }

        survivingEnemies.push(enemy);
      }

      state.enemies = survivingEnemies;

      const activeBullets = [];

      for (let bulletIndex = 0; bulletIndex < state.bullets.length; bulletIndex += 1) {
        const bullet = state.bullets[bulletIndex];
        let hitEnemy = false;

        for (let enemyIndex = state.enemies.length - 1; enemyIndex >= 0; enemyIndex -= 1) {
          const enemy = state.enemies[enemyIndex];

          if (!intersects(bullet, enemy)) {
            continue;
          }

          enemy.hp -= bullet.damage;
          hitEnemy = true;

          if (enemy.hp <= 0) {
            state.killScore += enemy.points;
            state.enemiesDestroyed += 1;

            if (enemy.kind === 'boss') {
              state.bossesDefeated += 1;
            }

            state.enemies.splice(enemyIndex, 1);
            scoreChanged = true;
            playArcadeTone(enemy.kind === 'boss' ? 'success' : 'score');
          }

          break;
        }

        if (!hitEnemy) {
          activeBullets.push(bullet);
        }
      }

      state.bullets = activeBullets;

      const nextPowerups = [];

      for (let index = 0; index < state.powerups.length; index += 1) {
        const powerup = state.powerups[index];
        powerup.y += powerup.speed * delta;

        if (intersects(powerup, playerBox)) {
          applyPowerup(powerup.type);
          continue;
        }

        if (powerup.y <= HEIGHT + 40) {
          nextPowerups.push(powerup);
        }
      }

      state.powerups = nextPowerups;

      state.survivalCarry += delta * SURVIVAL_POINTS_PER_SECOND;
      const survivalGain = Math.floor(state.survivalCarry);

      if (survivalGain > 0) {
        state.survivalCarry -= survivalGain;
        state.survivalScore += survivalGain;
        scoreChanged = true;
      }

      if (scoreChanged) {
        syncScore(state.killScore + state.survivalScore);
      }
    }

    function drawEnemy(enemy) {
      context.save();
      context.shadowColor = enemy.color;
      context.shadowBlur = enemy.kind === 'boss' ? 14 : 8;
      context.fillStyle = enemy.color;
      roundedRect(context, enemy.x, enemy.y, enemy.width, enemy.height, enemy.kind === 'boss' ? 18 : 12);
      context.fill();

      if (enemy.kind === 'zigzag') {
        context.fillStyle = 'rgba(255,255,255,0.28)';
        context.fillRect(enemy.x + 8, enemy.y + 10, enemy.width - 16, 4);
      }

      if (enemy.hp > 1) {
        context.fillStyle = 'rgba(0,0,0,0.32)';
        roundedRect(context, enemy.x + 6, enemy.y - 10, enemy.width - 12, 5, 4);
        context.fill();
        context.fillStyle = '#e5e7eb';
        roundedRect(
          context,
          enemy.x + 6,
          enemy.y - 10,
          ((enemy.width - 12) * enemy.hp) / enemy.maxHp,
          5,
          4,
        );
        context.fill();
      }

      context.restore();
    }

    function drawPowerup(powerup) {
      const style = getPowerupStyle(powerup.type);

      context.save();
      context.shadowColor = style.color;
      context.shadowBlur = 12;
      context.fillStyle = style.color;
      roundedRect(context, powerup.x, powerup.y, powerup.width, powerup.height, 10);
      context.fill();
      context.fillStyle = '#ffffff';
      context.font = '700 12px "Trebuchet MS", sans-serif';
      context.textAlign = 'center';
      context.fillText(style.label, powerup.x + powerup.width / 2, powerup.y + 21);
      context.restore();
    }

    function draw() {
      const state = stateRef.current;
      const adjustedTime = Math.max(0, state.elapsed - START_GRACE_PERIOD);
      const speedScale = Math.min(MAX_SPEED_SCALE, BASE_SPEED_SCALE + adjustedTime * 0.01);

      drawBackdrop(context, WIDTH, HEIGHT);

      for (let bulletIndex = 0; bulletIndex < state.bullets.length; bulletIndex += 1) {
        const bullet = state.bullets[bulletIndex];
        context.strokeStyle = '#38bdf8';
        context.lineWidth = 3;
        context.beginPath();
        context.moveTo(bullet.x + 2, bullet.y);
        context.lineTo(bullet.x + 2, bullet.y - 18);
        context.stroke();
      }

      for (let enemyIndex = 0; enemyIndex < state.enemies.length; enemyIndex += 1) {
        drawEnemy(state.enemies[enemyIndex]);
      }

      for (let index = 0; index < state.powerups.length; index += 1) {
        drawPowerup(state.powerups[index]);
      }

      context.save();
      context.globalAlpha = state.invulnerableFor > 0 && Math.floor(state.elapsed * 10) % 2 === 0 ? 0.45 : 1;
      context.shadowColor = state.elapsed < state.shieldUntil ? '#22c55e' : '#38bdf8';
      context.shadowBlur = 12;
      context.fillStyle = state.elapsed < state.shieldUntil ? '#22c55e' : '#38bdf8';
      context.beginPath();
      context.moveTo(state.playerX, PLAYER_Y - 22);
      context.lineTo(state.playerX - 28, PLAYER_Y + 20);
      context.lineTo(state.playerX, PLAYER_Y + 10);
      context.lineTo(state.playerX + 28, PLAYER_Y + 20);
      context.closePath();
      context.fill();
      context.restore();

      drawGlowText(context, `Score ${state.score}`, 28, 38, '#38bdf8');
      drawGlowText(context, `Lives ${state.lives}`, WIDTH - 28, 38, '#fca5a5', 'right', 18);
      drawGlowText(context, `Speed x${speedScale.toFixed(2)}`, WIDTH - 28, 64, '#fbbf24', 'right', 14);

      if (state.elapsed < START_GRACE_PERIOD) {
        drawGlowText(
          context,
          `Grace period ${Math.max(0, START_GRACE_PERIOD - state.elapsed).toFixed(1)}s`,
          WIDTH / 2,
          38,
          '#e5e7eb',
          'center',
          14,
        );
      }

      const effects = [];

      if (state.elapsed < state.shieldUntil) {
        effects.push('Shield');
      }

      if (state.elapsed < state.rapidFireUntil) {
        effects.push('Rapid Fire');
      }

      if (effects.length) {
        drawGlowText(context, effects.join('  |  '), WIDTH / 2, 60, '#e5e7eb', 'center', 14);
      }

      const boss = state.enemies.find((enemy) => enemy.kind === 'boss');

      if (boss) {
        context.fillStyle = 'rgba(0,0,0,0.35)';
        roundedRect(context, WIDTH / 2 - 170, 18, 340, 14, 999);
        context.fill();
        context.fillStyle = '#f59e0b';
        roundedRect(context, WIDTH / 2 - 170, 18, 340 * (boss.hp / boss.maxHp), 14, 999);
        context.fill();
        drawGlowText(context, 'Mini-boss', WIDTH / 2, 14, '#fcd34d', 'center', 12);
      }

      if (state.gameOver) {
        context.fillStyle = 'rgba(5, 7, 16, 0.72)';
        roundedRect(context, WIDTH / 2 - 190, HEIGHT / 2 - 70, 380, 140, 24);
        context.fill();
        drawGlowText(context, 'Defence line collapsed', WIDTH / 2, HEIGHT / 2 - 10, '#ffffff', 'center', 28);
        drawGlowText(context, 'Press Play Again to redeploy.', WIDTH / 2, HEIGHT / 2 + 26, '#38bdf8', 'center', 16);
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

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    frameRef.current = window.requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.cancelAnimationFrame(frameRef.current);
    };
  }, [onGameOver, onScoreChange, pauseStateRef]);

  return (
    <div className="flex h-full flex-col gap-3 p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="section-label">Void Defender</p>
          <p className="mt-1 text-sm text-gray-300">
            Balanced waves, capped threat growth, and support powerups to stabilize long runs.
          </p>
        </div>
        <span className="score-pill">Move with arrows or A/D, shoot with space</span>
      </div>

      <canvas
        ref={canvasRef}
        className="mx-auto w-full rounded-[1.5rem] border border-white/10 bg-black"
        height={HEIGHT}
        width={WIDTH}
      />
    </div>
  );
}
