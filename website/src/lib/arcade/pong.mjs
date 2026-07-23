import { clamp, clearCanvas, drawDot } from "./shared.mjs";
import { CANVAS_SIZE } from "./shared.mjs";

export function createPongGame(ctx) {
  const paddleWidth = 12;
  const paddleHeight = 88;
  const ballRadius = 8;
  const paddleMargin = 18;

  const difficultyPresets = {
    easy: {
      playerStep: 7.8,
      cpuStep: 3.5,
      baseBallSpeed: 3.8,
      winScore: 6,
    },
    normal: {
      playerStep: 7,
      cpuStep: 4.5,
      baseBallSpeed: 4.2,
      winScore: 7,
    },
    hard: {
      playerStep: 6.4,
      cpuStep: 5.5,
      baseBallSpeed: 4.8,
      winScore: 9,
    },
  };

  let difficulty = "normal";
  let state = createState();

  function currentPreset() {
    return difficultyPresets[difficulty] || difficultyPresets.normal;
  }

  function createState() {
    const preset = currentPreset();
    return {
      status: "running",
      playerY: CANVAS_SIZE / 2 - paddleHeight / 2,
      cpuY: CANVAS_SIZE / 2 - paddleHeight / 2,
      input: {
        up: false,
        down: false,
      },
      playerScore: 0,
      cpuScore: 0,
      level: 1,
      targetScore: preset.winScore,
      ballX: CANVAS_SIZE / 2,
      ballY: CANVAS_SIZE / 2,
      ballVx: preset.baseBallSpeed,
      ballVy: preset.baseBallSpeed * 0.52,
    };
  }

  function refreshLevelAndTarget() {
    const totalPoints = state.playerScore + state.cpuScore;
    state.level = Math.min(10, Math.floor(totalPoints / 2) + 1);
    state.targetScore = currentPreset().winScore;
  }

  function resetBall(towardsPlayer) {
    const preset = currentPreset();
    const direction = towardsPlayer ? -1 : 1;
    const speed = preset.baseBallSpeed + (state.level - 1) * 0.28;

    state.ballX = CANVAS_SIZE / 2;
    state.ballY = CANVAS_SIZE / 2;
    state.ballVx = speed * direction;
    state.ballVy = (Math.random() * (speed * 0.8) + speed * 0.3) * (Math.random() > 0.5 ? 1 : -1);
  }

  function clampPaddles() {
    state.playerY = clamp(state.playerY, 0, CANVAS_SIZE - paddleHeight);
    state.cpuY = clamp(state.cpuY, 0, CANVAS_SIZE - paddleHeight);
  }

  function addSpinAndSpeed(offset) {
    const maxVy = 8.2 + state.level * 0.24;
    state.ballVy = clamp(state.ballVy + offset * 1.6, -maxVy, maxVy);

    const speedBoost = 1 + Math.min(0.16, state.level * 0.02);
    state.ballVx *= speedBoost;
    const maxVx = 8.8 + state.level * 0.26;
    state.ballVx = clamp(state.ballVx, -maxVx, maxVx);
  }

  return {
    title: "Pong",
    controlScheme: "vertical",
    setDifficulty(nextDifficulty) {
      if (!difficultyPresets[nextDifficulty]) {
        difficulty = "normal";
        return;
      }
      difficulty = nextDifficulty;
      state.targetScore = currentPreset().winScore;
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

      const preset = currentPreset();

      if (state.input.up) {
        state.playerY -= preset.playerStep;
      }
      if (state.input.down) {
        state.playerY += preset.playerStep;
      }

      const cpuCenter = state.cpuY + paddleHeight / 2;
      const cpuDeadZone = 8 - Math.min(5, state.level * 0.4);
      const cpuSpeed = preset.cpuStep + state.level * 0.16;

      if (cpuCenter < state.ballY - cpuDeadZone) {
        state.cpuY += cpuSpeed;
      } else if (cpuCenter > state.ballY + cpuDeadZone) {
        state.cpuY -= cpuSpeed;
      }

      clampPaddles();

      state.ballX += state.ballVx;
      state.ballY += state.ballVy;

      if (state.ballY - ballRadius <= 0 || state.ballY + ballRadius >= CANVAS_SIZE) {
        state.ballVy *= -1;
      }

      const playerPaddleX = paddleMargin;
      const cpuPaddleX = CANVAS_SIZE - paddleMargin - paddleWidth;

      if (
        state.ballVx < 0 &&
        state.ballX - ballRadius <= playerPaddleX + paddleWidth &&
        state.ballX - ballRadius >= playerPaddleX &&
        state.ballY >= state.playerY &&
        state.ballY <= state.playerY + paddleHeight
      ) {
        const offset = (state.ballY - (state.playerY + paddleHeight / 2)) / (paddleHeight / 2);
        state.ballVx = Math.abs(state.ballVx);
        addSpinAndSpeed(offset);
      }

      if (
        state.ballVx > 0 &&
        state.ballX + ballRadius >= cpuPaddleX &&
        state.ballX + ballRadius <= cpuPaddleX + paddleWidth &&
        state.ballY >= state.cpuY &&
        state.ballY <= state.cpuY + paddleHeight
      ) {
        const offset = (state.ballY - (state.cpuY + paddleHeight / 2)) / (paddleHeight / 2);
        state.ballVx = -Math.abs(state.ballVx);
        addSpinAndSpeed(offset);
      }

      if (state.ballX + ballRadius < 0) {
        state.cpuScore += 1;
        refreshLevelAndTarget();
        if (state.cpuScore >= state.targetScore) {
          state.status = "game_over";
        } else {
          resetBall(false);
        }
      }

      if (state.ballX - ballRadius > CANVAS_SIZE) {
        state.playerScore += 1;
        refreshLevelAndTarget();
        if (state.playerScore >= state.targetScore) {
          state.status = "game_over";
        } else {
          resetBall(true);
        }
      }
    },
    render() {
      clearCanvas(ctx, "#f8fbfd");

      ctx.strokeStyle = "#c7d5df";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 10]);
      ctx.beginPath();
      ctx.moveTo(CANVAS_SIZE / 2, 0);
      ctx.lineTo(CANVAS_SIZE / 2, CANVAS_SIZE);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#20c7e5";
      ctx.fillRect(paddleMargin, state.playerY, paddleWidth, paddleHeight);
      ctx.fillStyle = "#ff5d73";
      ctx.fillRect(CANVAS_SIZE - paddleMargin - paddleWidth, state.cpuY, paddleWidth, paddleHeight);

      ctx.fillStyle = "#ffd34f";
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

      if (normalized === "arrowup" || normalized === "w") {
        state.input.up = true;
        return true;
      }

      if (normalized === "arrowdown" || normalized === "s") {
        state.input.down = true;
        return true;
      }

      return false;
    },
    onKeyUp(key) {
      const normalized = String(key).toLowerCase();

      if (normalized === "arrowup" || normalized === "w") {
        state.input.up = false;
        return true;
      }

      if (normalized === "arrowdown" || normalized === "s") {
        state.input.down = false;
        return true;
      }

      return false;
    },
    onControl(action) {
      if (action === "UP") {
        state.playerY -= 24;
        clampPaddles();
        return true;
      }

      if (action === "DOWN") {
        state.playerY += 24;
        clampPaddles();
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
      const scoreLine = `Player ${state.playerScore} : ${state.cpuScore} CPU | Level: ${state.level} | Best: ${Math.max(state.playerScore, 0)} `;
      if (state.status === "game_over") {
        const winner = state.playerScore > state.cpuScore ? "You win" : "CPU wins";
        return {
          score: `Player ${state.playerScore} : ${state.cpuScore} CPU | Level: ${state.level} | Best: ${state.playerScore}`,
          status: `${winner} (${difficulty}). Press Restart or Enter.`,
          pauseLabel: "Pause",
          pauseDisabled: true,
        };
      }

      if (state.status === "paused") {
        return {
          score: `Player ${state.playerScore} : ${state.cpuScore} CPU | Level: ${state.level} | Best: ${state.playerScore}`,
          status: `Paused (${difficulty}). Press Pause or Space to continue.`,
          pauseLabel: "Resume",
          pauseDisabled: false,
        };
      }

      return {
        score: `Player ${state.playerScore} : ${state.cpuScore} CPU | Level: ${state.level} | Best: ${state.playerScore}`,
        status: `Use Arrow keys/W,S (${difficulty}). First to ${state.targetScore} wins.`,
        pauseLabel: "Pause",
        pauseDisabled: false,
      };
    },
  };
}
