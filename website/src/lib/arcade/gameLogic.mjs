const DIRECTION_VECTORS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
};

const OPPOSITES = {
  UP: "DOWN",
  DOWN: "UP",
  LEFT: "RIGHT",
  RIGHT: "LEFT",
};

const BASE_TICK_MS = 130;
const FAST_TICK_MS = 85;
const POWER_UP_INTERVAL = 12;

export const DIRECTIONS = Object.freeze(Object.keys(DIRECTION_VECTORS));
export const POWER_UP_TYPES = Object.freeze(["speed", "multiplier", "phase"]);

export const POWER_UP_META = Object.freeze({
  speed: {
    label: "Speed",
    duration: 45,
    color: "#4a8cff",
  },
  multiplier: {
    label: "x2 Score",
    duration: 60,
    color: "#9b50ff",
  },
  phase: {
    label: "Phase",
    duration: 30,
    color: "#ff9b45",
  },
});

export function createInitialState({ gridSize = 20, rng = Math.random } = {}) {
  const center = Math.floor(gridSize / 2);
  const snake = [
    { x: center, y: center },
    { x: center - 1, y: center },
    { x: center - 2, y: center },
  ];

  return {
    gridSize,
    snake,
    direction: "RIGHT",
    nextDirection: "RIGHT",
    food: spawnFood(gridSize, snake, rng),
    score: 0,
    status: "running", // running | paused | game_over
    powerUp: null,
    ticksUntilPowerUp: POWER_UP_INTERVAL,
    activeEffects: createEmptyEffects(),
    tick: 0,
  };
}

export function getTickMs(state) {
  const normalized = normalizeState(state);
  return normalized.activeEffects.speed > 0 ? FAST_TICK_MS : BASE_TICK_MS;
}

export function directionFromKey(key) {
  const normalized = String(key || "").toLowerCase();
  const keyToDirection = {
    arrowup: "UP",
    w: "UP",
    arrowdown: "DOWN",
    s: "DOWN",
    arrowleft: "LEFT",
    a: "LEFT",
    arrowright: "RIGHT",
    d: "RIGHT",
  };

  return keyToDirection[normalized] || null;
}

export function changeDirection(state, direction) {
  if (!DIRECTION_VECTORS[direction]) {
    return state;
  }

  const activeDirection = state.nextDirection || state.direction;
  if (OPPOSITES[activeDirection] === direction) {
    return state;
  }

  return {
    ...state,
    nextDirection: direction,
  };
}

export function togglePause(state) {
  if (state.status === "game_over") {
    return state;
  }

  return {
    ...state,
    status: state.status === "paused" ? "running" : "paused",
  };
}

export function restartGame(state, rng = Math.random) {
  return createInitialState({
    gridSize: state.gridSize,
    rng,
  });
}

export function advanceState(inputState, rng = Math.random) {
  const state = normalizeState(inputState);
  if (state.status !== "running") {
    return state;
  }

  const direction = state.nextDirection || state.direction;
  const vector = DIRECTION_VECTORS[direction];
  const currentHead = state.snake[0];
  const nextHead = wrapPosition(
    {
      x: currentHead.x + vector.x,
      y: currentHead.y + vector.y,
    },
    state.gridSize,
  );

  const eatingFood =
    state.food &&
    nextHead.x === state.food.x &&
    nextHead.y === state.food.y;

  const phaseActive = state.activeEffects.phase > 0;
  const collisionBody = eatingFood ? state.snake : state.snake.slice(0, -1);

  if (!phaseActive && hasCollision(nextHead, collisionBody)) {
    return {
      ...state,
      direction,
      nextDirection: direction,
      status: "game_over",
      activeEffects: decreaseEffects(state.activeEffects),
      tick: state.tick + 1,
    };
  }

  let snake = [nextHead, ...state.snake];
  let score = state.score;
  let food = state.food;
  let status = state.status;
  let powerUp = state.powerUp;
  let ticksUntilPowerUp = state.ticksUntilPowerUp;
  let activeEffects = { ...state.activeEffects };

  if (eatingFood) {
    const points = activeEffects.multiplier > 0 ? 2 : 1;
    score += points;
    food = spawnFood(state.gridSize, snake, rng, powerUp ? [powerUp] : []);
    if (!food) {
      status = "game_over";
    }
  } else {
    snake = snake.slice(0, -1);
  }

  if (powerUp && positionsEqual(nextHead, powerUp)) {
    activeEffects = applyPowerUp(activeEffects, powerUp.type);
    powerUp = null;
    ticksUntilPowerUp = POWER_UP_INTERVAL;
  }

  if (!powerUp && status === "running") {
    ticksUntilPowerUp -= 1;
    if (ticksUntilPowerUp <= 0) {
      powerUp = spawnPowerUp(state.gridSize, snake, food, rng);
      ticksUntilPowerUp = POWER_UP_INTERVAL;
    }
  }

  activeEffects = decreaseEffects(activeEffects);

  return {
    ...state,
    snake,
    direction,
    nextDirection: direction,
    food,
    score,
    status,
    powerUp,
    ticksUntilPowerUp,
    activeEffects,
    tick: state.tick + 1,
  };
}

export function spawnFood(gridSize, snake, rng = Math.random, blocked = []) {
  const occupied = new Set(snake.map((segment) => positionKey(segment)));
  for (const item of blocked) {
    if (item) {
      occupied.add(positionKey(item));
    }
  }

  return pickRandomEmptyCell(gridSize, occupied, rng);
}

export function spawnPowerUp(gridSize, snake, food, rng = Math.random) {
  const occupied = new Set(snake.map((segment) => positionKey(segment)));
  if (food) {
    occupied.add(positionKey(food));
  }

  const position = pickRandomEmptyCell(gridSize, occupied, rng);
  if (!position) {
    return null;
  }

  const typeIndex = Math.floor(rng() * POWER_UP_TYPES.length);
  return {
    ...position,
    type: POWER_UP_TYPES[typeIndex],
  };
}

export function isInsideGrid(position, gridSize) {
  return (
    position.x >= 0 &&
    position.x < gridSize &&
    position.y >= 0 &&
    position.y < gridSize
  );
}

export function wrapPosition(position, gridSize) {
  return {
    x: mod(position.x, gridSize),
    y: mod(position.y, gridSize),
  };
}

function normalizeState(state) {
  return {
    ...state,
    powerUp: state.powerUp || null,
    ticksUntilPowerUp:
      typeof state.ticksUntilPowerUp === "number"
        ? state.ticksUntilPowerUp
        : POWER_UP_INTERVAL,
    activeEffects: {
      ...createEmptyEffects(),
      ...(state.activeEffects || {}),
    },
    tick: typeof state.tick === "number" ? state.tick : 0,
  };
}

function createEmptyEffects() {
  return {
    speed: 0,
    multiplier: 0,
    phase: 0,
  };
}

function applyPowerUp(effects, type) {
  const meta = POWER_UP_META[type];
  if (!meta) {
    return effects;
  }

  return {
    ...effects,
    [type]: Math.max(effects[type], meta.duration),
  };
}

function decreaseEffects(effects) {
  return {
    speed: Math.max(0, effects.speed - 1),
    multiplier: Math.max(0, effects.multiplier - 1),
    phase: Math.max(0, effects.phase - 1),
  };
}

function pickRandomEmptyCell(gridSize, occupied, rng) {
  const available = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      const key = `${x},${y}`;
      if (!occupied.has(key)) {
        available.push({ x, y });
      }
    }
  }

  if (available.length === 0) {
    return null;
  }

  const index = Math.floor(rng() * available.length);
  return available[index];
}

function hasCollision(head, segments) {
  return segments.some((segment) => segment.x === head.x && segment.y === head.y);
}

function positionKey(position) {
  return `${position.x},${position.y}`;
}

function positionsEqual(a, b) {
  return a && b && a.x === b.x && a.y === b.y;
}

function mod(value, size) {
  return ((value % size) + size) % size;
}
