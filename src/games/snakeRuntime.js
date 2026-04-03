const GRID_SIZE = 16;
const CANVAS_SIZE = 640;
const BOARD_PADDING = 30;
const CELL_GAP = 6;
const CELL_SIZE =
  (CANVAS_SIZE - BOARD_PADDING * 2 - CELL_GAP * (GRID_SIZE - 1)) / GRID_SIZE;
const BOARD_SIZE = CELL_SIZE * GRID_SIZE + CELL_GAP * (GRID_SIZE - 1);
const BOARD_OFFSET_X = (CANVAS_SIZE - BOARD_SIZE) / 2;
const BOARD_OFFSET_Y = 98;
const START_STEP_MS = 190;
const MIN_STEP_MS = 72;
const STEP_GAIN_MS = 8;
const SCORE_PER_ORB = 10;
const INITIAL_SEGMENTS = [
  { x: 7, y: 8 },
  { x: 6, y: 8 },
  { x: 5, y: 8 },
];

const KEY_TO_DIRECTION = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  a: 'left',
  s: 'down',
  d: 'right',
  W: 'up',
  A: 'left',
  S: 'down',
  D: 'right',
};

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

let boardLayer;

function getCellX(x) {
  return BOARD_OFFSET_X + x * (CELL_SIZE + CELL_GAP);
}

function getCellY(y) {
  return BOARD_OFFSET_Y + y * (CELL_SIZE + CELL_GAP);
}

function getBoardLayer() {
  if (boardLayer) {
    return boardLayer;
  }

  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const context = canvas.getContext('2d');

  const background = context.createLinearGradient(0, 0, 0, CANVAS_SIZE);
  background.addColorStop(0, '#090316');
  background.addColorStop(1, '#050710');
  context.fillStyle = background;
  context.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  context.strokeStyle = 'rgba(77,124,255,0.14)';
  context.lineWidth = 1;

  for (let line = 0; line <= CANVAS_SIZE; line += 42) {
    context.beginPath();
    context.moveTo(line, 0);
    context.lineTo(line, CANVAS_SIZE);
    context.stroke();

    context.beginPath();
    context.moveTo(0, line);
    context.lineTo(CANVAS_SIZE, line);
    context.stroke();
  }

  context.fillStyle = 'rgba(7, 12, 28, 0.92)';
  context.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  context.lineWidth = 2;
  context.beginPath();
  context.roundRect(26, 74, CANVAS_SIZE - 52, CANVAS_SIZE - 106, 28);
  context.fill();
  context.stroke();

  context.fillStyle = 'rgba(255,255,255,0.045)';

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      context.beginPath();
      context.roundRect(getCellX(x), getCellY(y), CELL_SIZE, CELL_SIZE, 12);
      context.fill();
    }
  }

  boardLayer = canvas;
  return boardLayer;
}

function isOppositeDirection(currentDirection, nextDirection) {
  return (
    (currentDirection === 'up' && nextDirection === 'down') ||
    (currentDirection === 'down' && nextDirection === 'up') ||
    (currentDirection === 'left' && nextDirection === 'right') ||
    (currentDirection === 'right' && nextDirection === 'left')
  );
}

function placeFood(state) {
  let nextX = 0;
  let nextY = 0;
  let blocked = true;

  while (blocked) {
    nextX = Math.floor(Math.random() * GRID_SIZE);
    nextY = Math.floor(Math.random() * GRID_SIZE);
    blocked = false;

    for (let index = 0; index < state.snake.length; index += 1) {
      const segment = state.snake[index];

      if (segment.x === nextX && segment.y === nextY) {
        blocked = true;
        break;
      }
    }
  }

  state.food.x = nextX;
  state.food.y = nextY;
}

export function createSnakeRuntimeState() {
  const snake = INITIAL_SEGMENTS.map((segment) => ({ x: segment.x, y: segment.y }));
  const state = {
    snake,
    food: { x: 0, y: 0 },
    direction: 'right',
    queuedDirection: 'right',
    accumulatorMs: 0,
    stepMs: START_STEP_MS,
    score: 0,
    apples: 0,
    startedAt: Date.now(),
    gameOver: false,
    pendingScore: null,
    pendingGameOver: null,
    statusMessage: 'Collect orbs and keep the neon trail alive.',
    statusDirty: true,
  };

  placeFood(state);
  return state;
}

export function queueSnakeDirection(state, key) {
  const nextDirection = KEY_TO_DIRECTION[key];

  if (!nextDirection || isOppositeDirection(state.direction, nextDirection)) {
    return false;
  }

  state.queuedDirection = nextDirection;
  return true;
}

function failRun(state) {
  state.gameOver = true;
  state.statusMessage = 'Trail collapsed. Tap Play Again for another run.';
  state.statusDirty = true;
  state.pendingGameOver = {
    score: state.score,
    session: {
      durationMs: Date.now() - state.startedAt,
      apples: state.apples,
    },
  };
}

function advanceSnakeStep(state) {
  state.direction = state.queuedDirection;

  const head = state.snake[0];
  const movement = DIRECTION_VECTORS[state.direction];
  const nextX = head.x + movement.x;
  const nextY = head.y + movement.y;
  const eatingFood = nextX === state.food.x && nextY === state.food.y;
  const collisionLength = eatingFood ? state.snake.length : state.snake.length - 1;

  if (nextX < 0 || nextX >= GRID_SIZE || nextY < 0 || nextY >= GRID_SIZE) {
    failRun(state);
    return;
  }

  for (let index = 0; index < collisionLength; index += 1) {
    const segment = state.snake[index];

    if (segment.x === nextX && segment.y === nextY) {
      failRun(state);
      return;
    }
  }

  if (eatingFood) {
    state.snake.unshift({ x: nextX, y: nextY });
    state.apples += 1;
    state.score += SCORE_PER_ORB;
    state.stepMs = Math.max(MIN_STEP_MS, START_STEP_MS - state.apples * STEP_GAIN_MS);
    state.pendingScore = state.score;
    state.statusMessage = 'Speed is climbing. Keep weaving.';
    state.statusDirty = true;
    placeFood(state);
    return;
  }

  const recycledTail = state.snake.pop();
  recycledTail.x = nextX;
  recycledTail.y = nextY;
  state.snake.unshift(recycledTail);
}

export function updateSnakeState(state, deltaMs) {
  if (state.gameOver) {
    return;
  }

  state.accumulatorMs += deltaMs;

  while (state.accumulatorMs >= state.stepMs && !state.gameOver) {
    state.accumulatorMs -= state.stepMs;
    advanceSnakeStep(state);
  }
}

function drawHeader(context, state) {
  context.fillStyle = '#3cf2ff';
  context.font = '600 14px "Trebuchet MS", sans-serif';
  context.fillText('NEON SNAKE', 34, 42);

  context.fillStyle = '#ffffff';
  context.font = '600 28px "Trebuchet MS", sans-serif';
  context.fillText(`Score ${state.score}`, 34, 76);

  context.textAlign = 'right';
  context.fillStyle = '#f5d0fe';
  context.font = '600 14px "Trebuchet MS", sans-serif';
  context.fillText('Arrow keys or WASD', CANVAS_SIZE - 34, 42);
  context.fillStyle = '#cbd5e1';
  context.fillText(`${state.stepMs} ms step speed`, CANVAS_SIZE - 34, 76);
  context.textAlign = 'left';
}

function drawFood(context, state) {
  const x = getCellX(state.food.x);
  const y = getCellY(state.food.y);

  context.save();
  context.shadowColor = '#ff4fd8';
  context.shadowBlur = 12;
  context.fillStyle = '#ff4fd8';
  context.beginPath();
  context.roundRect(x, y, CELL_SIZE, CELL_SIZE, 14);
  context.fill();
  context.restore();
}

function drawSnake(context, state) {
  for (let index = state.snake.length - 1; index >= 0; index -= 1) {
    const segment = state.snake[index];
    const x = getCellX(segment.x);
    const y = getCellY(segment.y);
    const isHead = index === 0;

    context.save();
    context.shadowColor = isHead ? '#3cf2ff' : 'rgba(60,242,255,0.55)';
    context.shadowBlur = isHead ? 14 : 8;
    context.fillStyle = isHead ? '#67e8f9' : '#22d3ee';
    context.beginPath();
    context.roundRect(x, y, CELL_SIZE, CELL_SIZE, 14);
    context.fill();

    if (isHead) {
      const eyeOffsetX = state.direction === 'left' ? 9 : state.direction === 'right' ? CELL_SIZE - 15 : 13;
      const eyeOffsetYTop = state.direction === 'up' ? 9 : 13;
      const eyeOffsetYBottom = state.direction === 'down' ? CELL_SIZE - 15 : CELL_SIZE - 19;

      context.fillStyle = '#0f172a';
      context.beginPath();
      context.arc(x + eyeOffsetX, y + eyeOffsetYTop, 2.2, 0, Math.PI * 2);
      context.arc(x + eyeOffsetX, y + eyeOffsetYBottom, 2.2, 0, Math.PI * 2);
      context.fill();
    }

    context.restore();
  }
}

function drawGameOverOverlay(context) {
  context.fillStyle = 'rgba(3, 7, 18, 0.66)';
  context.beginPath();
  context.roundRect(130, 248, 380, 114, 24);
  context.fill();

  context.fillStyle = '#ffffff';
  context.font = '600 28px "Trebuchet MS", sans-serif';
  context.textAlign = 'center';
  context.fillText('Run ended', CANVAS_SIZE / 2, 294);
  context.fillStyle = '#cbd5e1';
  context.font = '600 15px "Trebuchet MS", sans-serif';
  context.fillText('Use Play Again to restart the cabinet.', CANVAS_SIZE / 2, 326);
  context.textAlign = 'left';
}

export function renderSnakeFrame(context, state) {
  context.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  context.drawImage(getBoardLayer(), 0, 0);
  drawHeader(context, state);
  drawFood(context, state);
  drawSnake(context, state);

  if (state.gameOver) {
    drawGameOverOverlay(context);
  }
}

export function flushSnakeEffects(state, effects) {
  if (state.statusDirty) {
    effects.onStatusChange(state.statusMessage);
    state.statusDirty = false;
  }

  if (state.pendingScore !== null) {
    effects.onScore(state.pendingScore);
    state.pendingScore = null;
  }

  if (state.pendingGameOver) {
    effects.onGameOver(state.pendingGameOver);
    state.pendingGameOver = null;
  }
}
