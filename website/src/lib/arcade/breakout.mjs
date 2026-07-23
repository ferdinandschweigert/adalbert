import { CANVAS_SIZE, clearCanvas, clamp, drawDot } from "./shared.mjs";

export function createBreakoutGame(ctx) {
  const paddleHeight = 12;
  const paddleY = CANVAS_SIZE - 28;
  const ballRadius = 8;

  const brickCols = 8;
  const brickGap = 4;
  const brickHeight = 18;
  const brickPaddingX = 16;
  const brickOffsetTop = 56;
  const brickWidth =
    (CANVAS_SIZE - brickPaddingX * 2 - (brickCols - 1) * brickGap) / brickCols;

  const brickPalette = ["#f94144", "#f3722c", "#f8961e", "#f9c74f", "#43aa8b", "#277da1", "#4d908e"];

  const difficultyPresets = {
    easy: {
      lives: 4,
      paddleWidth: 96,
      paddleStep: 7.4,
      baseBallSpeed: 3,
      maxLevel: 4,
      hardBrickBias: 0.08,
    },
    normal: {
      lives: 3,
      paddleWidth: 90,
      paddleStep: 7,
      baseBallSpeed: 3.3,
      maxLevel: 5,
      hardBrickBias: 0.14,
    },
    hard: {
      lives: 3,
      paddleWidth: 80,
      paddleStep: 6.2,
      baseBallSpeed: 3.8,
      maxLevel: 6,
      hardBrickBias: 0.22,
    },
  };

  let difficulty = "normal";
  let bestScore = 0;
  let state = createState();

  function preset() {
    return difficultyPresets[difficulty] || difficultyPresets.normal;
  }

  function buildBricks(level) {
    const config = preset();
    const rows = Math.min(7, 5 + Math.floor((level - 1) / 2));
    const bricks = [];

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < brickCols; col += 1) {
        const shouldSkip = level >= 3 && (row + col + level) % 11 === 0;
        if (shouldSkip) {
          continue;
        }

        let hp = 1;
        if (row >= 2 + Math.floor(level / 2) || Math.random() < config.hardBrickBias) {
          hp = 2;
        }
        if (level >= 5 && Math.random() < config.hardBrickBias * 0.5) {
          hp = 3;
        }

        bricks.push({
          x: brickPaddingX + col * (brickWidth + brickGap),
          y: brickOffsetTop + row * (brickHeight + brickGap),
          hp,
          maxHp: hp,
        });
      }
    }

    return bricks;
  }

  function createState() {
    const config = preset();
    const paddleWidth = config.paddleWidth;
    const level = 1;

    return {
      status: "running",
      won: false,
      score: 0,
      lives: config.lives,
      level,
      maxLevel: config.maxLevel,
      message: "",
      input: {
        left: false,
        right: false,
      },
      paddleWidth,
      paddleStep: config.paddleStep,
      paddleX: CANVAS_SIZE / 2 - paddleWidth / 2,
      ballX: CANVAS_SIZE / 2,
      ballY: CANVAS_SIZE - 72,
      ballVx: config.baseBallSpeed,
      ballVy: -config.baseBallSpeed * 1.12,
      bricks: buildBricks(level),
    };
  }

  function levelSpeed() {
    return preset().baseBallSpeed + (state.level - 1) * 0.34;
  }

  function resetBall() {
    const baseSpeed = levelSpeed();
    state.ballX = state.paddleX + state.paddleWidth / 2;
    state.ballY = CANVAS_SIZE - 72;
    state.ballVx = (state.ballVx >= 0 ? 1 : -1) * baseSpeed;
    state.ballVy = -baseSpeed * 1.08;
  }

  function clampPaddle() {
    state.paddleX = clamp(state.paddleX, 0, CANVAS_SIZE - state.paddleWidth);
  }

  function progressLevel() {
    if (state.level >= state.maxLevel) {
      state.status = "game_over";
      state.won = true;
      return;
    }

    state.level += 1;
    state.bricks = buildBricks(state.level);
    state.paddleWidth = Math.max(58, preset().paddleWidth - (state.level - 1) * 5);
    clampPaddle();
    resetBall();
    state.message = `Level ${state.level}`;
  }

  function collideBallWithBrick(brick) {
    const overlapLeft = Math.abs(state.ballX + ballRadius - brick.x);
    const overlapRight = Math.abs(brick.x + brickWidth - (state.ballX - ballRadius));
    const overlapTop = Math.abs(state.ballY + ballRadius - brick.y);
    const overlapBottom = Math.abs(brick.y + brickHeight - (state.ballY - ballRadius));

    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft || minOverlap === overlapRight) {
      state.ballVx *= -1;
    } else {
      state.ballVy *= -1;
    }
  }

  return {
    title: "Breakout",
    controlScheme: "horizontal",
    setDifficulty(nextDifficulty) {
      if (!difficultyPresets[nextDifficulty]) {
        difficulty = "normal";
        return;
      }
      difficulty = nextDifficulty;
    },
    start() {
      state = createState();
    },
    stop() {
      if (state.status === "running") {
        state.status = "paused";
      }
    },
    tick() {
      if (state.status !== "running") {
        return;
      }

      if (state.input.left) {
        state.paddleX -= state.paddleStep;
      }
      if (state.input.right) {
        state.paddleX += state.paddleStep;
      }
      clampPaddle();

      state.ballX += state.ballVx;
      state.ballY += state.ballVy;

      if (state.ballX - ballRadius <= 0 || state.ballX + ballRadius >= CANVAS_SIZE) {
        state.ballVx *= -1;
      }

      if (state.ballY - ballRadius <= 0) {
        state.ballVy *= -1;
      }

      if (
        state.ballVy > 0 &&
        state.ballY + ballRadius >= paddleY &&
        state.ballY + ballRadius <= paddleY + paddleHeight &&
        state.ballX >= state.paddleX &&
        state.ballX <= state.paddleX + state.paddleWidth
      ) {
        const hitOffset =
          (state.ballX - (state.paddleX + state.paddleWidth / 2)) / (state.paddleWidth / 2);
        state.ballVy = -Math.abs(state.ballVy);
        state.ballVx = clamp(state.ballVx + hitOffset * 1.4, -8.6, 8.6);
      }

      for (const brick of state.bricks) {
        const hit =
          state.ballX + ballRadius > brick.x &&
          state.ballX - ballRadius < brick.x + brickWidth &&
          state.ballY + ballRadius > brick.y &&
          state.ballY - ballRadius < brick.y + brickHeight;

        if (!hit) {
          continue;
        }

        collideBallWithBrick(brick);
        brick.hp -= 1;

        if (brick.hp <= 0) {
          state.score += 10 * state.level;
          if (state.score > bestScore) {
            bestScore = state.score;
          }
        }

        break;
      }

      state.bricks = state.bricks.filter((brick) => brick.hp > 0);
      if (state.bricks.length === 0) {
        progressLevel();
      }

      if (state.ballY - ballRadius > CANVAS_SIZE) {
        state.lives -= 1;
        if (state.lives <= 0) {
          state.status = "game_over";
          state.won = false;
        } else {
          resetBall();
        }
      }
    },
    render() {
      clearCanvas(ctx, "#f8fbfd");

      for (const brick of state.bricks) {
        const paletteIndex = (brick.maxHp - 1 + state.level - 1) % brickPalette.length;
        ctx.fillStyle = brickPalette[paletteIndex];
        ctx.fillRect(brick.x, brick.y, brickWidth, brickHeight);

        if (brick.hp > 1) {
          ctx.fillStyle = "rgba(255,255,255,0.75)";
          ctx.font = "700 10px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(brick.hp), brick.x + brickWidth / 2, brick.y + brickHeight / 2 + 1);
        }
      }

      ctx.fillStyle = "#283043";
      ctx.fillRect(state.paddleX, paddleY, state.paddleWidth, paddleHeight);
      ctx.fillStyle = "#20c7e5";
      drawDot(ctx, state.ballX, state.ballY, ballRadius);
    },
    onKeyDown(key) {
      const normalized = String(key).toLowerCase();

      if (normalized === " ") {
        this.togglePause();
        return true;
      }

      if (normalized === "enter" && state.status === "game_over") {
        this.restart();
        return true;
      }

      if (normalized === "arrowleft" || normalized === "a") {
        state.input.left = true;
        return true;
      }

      if (normalized === "arrowright" || normalized === "d") {
        state.input.right = true;
        return true;
      }

      return false;
    },
    onKeyUp(key) {
      const normalized = String(key).toLowerCase();

      if (normalized === "arrowleft" || normalized === "a") {
        state.input.left = false;
        return true;
      }

      if (normalized === "arrowright" || normalized === "d") {
        state.input.right = false;
        return true;
      }

      return false;
    },
    onControl(action) {
      if (action === "LEFT") {
        state.paddleX -= 30;
        clampPaddle();
        return true;
      }

      if (action === "RIGHT") {
        state.paddleX += 30;
        clampPaddle();
        return true;
      }

      return false;
    },
    togglePause() {
      if (state.status === "game_over") {
        return;
      }

      state.status = state.status === "paused" ? "running" : "paused";
    },
    restart() {
      state = createState();
    },
    getTickMs() {
      return 16;
    },
    getHud() {
      const scoreLine = `Score: ${state.score} | Lives: ${state.lives} | Level: ${state.level}/${state.maxLevel} | Best: ${bestScore}`;

      if (state.status === "game_over") {
        const winText = state.won ? "Campaign cleared" : "Out of lives";
        return {
          score: scoreLine,
          status: `${winText} (${difficulty}). Press Restart or Enter.`,
          pauseLabel: "Pause",
          pauseDisabled: true,
        };
      }

      if (state.status === "paused") {
        return {
          score: scoreLine,
          status: `Paused (${difficulty}). Press Pause or Space to continue.`,
          pauseLabel: "Resume",
          pauseDisabled: false,
        };
      }

      const message = state.message ? `${state.message}. ` : "";
      return {
        score: scoreLine,
        status: `${message}Move with Arrow keys/A,D and clear every wave.`,
        pauseLabel: "Pause",
        pauseDisabled: false,
      };
    },
  };
}
