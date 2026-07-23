import {
  POWER_UP_META,
  advanceState,
  changeDirection,
  createInitialState,
  directionFromKey,
  getTickMs as getSnakeTickMs,
  restartGame,
  togglePause,
} from "./gameLogic.mjs";
import {
  CANVAS_SIZE,
  drawDot,
  drawDiamond,
  drawGrid,
  clearCanvas,
} from "./shared.mjs";

export function createSnakeGame(ctx) {
  const colors = {
    background: "#f8fbfd",
    grid: "#dce8ef",
    snakeBody: "#7bd66f",
    snakeHead: "#20c7e5",
    food: "#ff5d73",
  };

  const difficultySettings = {
    easy: { speedScale: 1.12, levelStep: 8 },
    normal: { speedScale: 1, levelStep: 6 },
    hard: { speedScale: 0.9, levelStep: 5 },
  };

  let state = createInitialState({ gridSize: 20 });
  let bestScore = 0;
  let difficulty = "normal";

  return {
    title: "Snake",
    controlScheme: "dpad",
    start() {
      state = createInitialState({ gridSize: 20 });
    },
    stop() {
      if (state.status === "running") {
        state = togglePause(state);
      }
    },
    tick() {
      state = advanceState(state);
      if (state.score > bestScore) {
        bestScore = state.score;
      }
    },
    render() {
      clearCanvas(ctx, colors.background);

      const cellSize = CANVAS_SIZE / state.gridSize;

      drawGrid(ctx, state.gridSize, cellSize, colors.grid);

      for (let index = state.snake.length - 1; index >= 0; index -= 1) {
        const segment = state.snake[index];
        const inset = index === 0 ? 1 : 2;
        ctx.fillStyle = index === 0 ? colors.snakeHead : colors.snakeBody;
        ctx.fillRect(
          segment.x * cellSize + inset,
          segment.y * cellSize + inset,
          cellSize - inset * 2,
          cellSize - inset * 2,
        );
      }

      if (state.food) {
        ctx.fillStyle = colors.food;
        drawDot(
          ctx,
          state.food.x * cellSize + cellSize / 2,
          state.food.y * cellSize + cellSize / 2,
          cellSize * 0.28,
        );
      }

      if (state.powerUp) {
        const meta = POWER_UP_META[state.powerUp.type] || POWER_UP_META.speed;
        const centerX = state.powerUp.x * cellSize + cellSize / 2;
        const centerY = state.powerUp.y * cellSize + cellSize / 2;

        ctx.fillStyle = meta.color;
        drawDiamond(ctx, centerX, centerY, cellSize * 0.36);

        ctx.fillStyle = "#ffffff";
        ctx.font = `${Math.floor(cellSize * 0.36)}px Helvetica`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const glyphMap = {
          speed: "S",
          multiplier: "2",
          phase: "P",
        };

        ctx.fillText(glyphMap[state.powerUp.type] || "*", centerX, centerY + 1);
      }
    },
    onKeyDown(key) {
      if (key === " ") {
        state = togglePause(state);
        return true;
      }

      if (key === "Enter" && state.status === "game_over") {
        state = restartGame(state);
        return true;
      }

      const direction = directionFromKey(key);
      if (!direction) {
        return false;
      }

      state = changeDirection(state, direction);
      return true;
    },
    onKeyUp() {
      return false;
    },
    onControl(action) {
      if (!["UP", "DOWN", "LEFT", "RIGHT"].includes(action)) {
        return false;
      }

      state = changeDirection(state, action);
      return true;
    },
    togglePause() {
      state = togglePause(state);
    },
    restart() {
      state = restartGame(state);
    },
    setDifficulty(nextDifficulty) {
      if (!difficultySettings[nextDifficulty]) {
        difficulty = "normal";
        return;
      }
      difficulty = nextDifficulty;
    },
    getTickMs() {
      const baseTick = getSnakeTickMs(state);
      const level = getSnakeLevel(state.score, difficultySettings[difficulty].levelStep);
      const levelScale = 1 - Math.min(0.35, (level - 1) * 0.035);
      const difficultyScale = difficultySettings[difficulty].speedScale;
      return Math.max(52, Math.round(baseTick * levelScale * difficultyScale));
    },
    getHud() {
      const activeFeatures = getSnakeFeatureLabel(state.activeEffects);
      const level = getSnakeLevel(state.score, difficultySettings[difficulty].levelStep);

      if (state.status === "game_over") {
        return {
          score: `Score: ${state.score} | Level: ${level} | Best: ${bestScore}`,
          status: `Game over (${difficulty}). Press Restart or Enter.`,
          pauseLabel: "Pause",
          pauseDisabled: true,
        };
      }

      if (state.status === "paused") {
        return {
          score: `Score: ${state.score} | Level: ${level} | Best: ${bestScore}`,
          status: `Paused (${difficulty}). Press Pause or Space to continue.`,
          pauseLabel: "Resume",
          pauseDisabled: false,
        };
      }

      const featureText = activeFeatures.length
        ? ` Active: ${activeFeatures.join(", ")}.`
        : "";

      return {
        score: `Score: ${state.score} | Level: ${level} | Best: ${bestScore}`,
        status:
          `Use Arrow keys or WASD (${difficulty}). Collect food and upgrades.` + featureText,
        pauseLabel: "Pause",
        pauseDisabled: false,
      };
    },
  };
}

function getSnakeLevel(score, levelStep) {
  return Math.max(1, Math.floor(score / levelStep) + 1);
}

function getSnakeFeatureLabel(effects) {
  const labels = [];

  if (effects.speed > 0) {
    labels.push(`Speed (${effects.speed})`);
  }

  if (effects.multiplier > 0) {
    labels.push(`x2 (${effects.multiplier})`);
  }

  if (effects.phase > 0) {
    labels.push(`Phase (${effects.phase})`);
  }

  return labels;
}
