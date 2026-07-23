import { directionFromKey } from "./gameLogic.mjs";
import {
  CANVAS_SIZE,
  drawDot,
  drawDiamond,
  drawGrid,
  clearCanvas,
  rectsOverlap,
  clamp,
} from "./shared.mjs";

export function create2048Game(ctx) {
  const size = 4;
  const tileGap = 10;
  const boardPixels = 360;
  const boardX = (CANVAS_SIZE - boardPixels) / 2;
  const boardY = 58;
  const tileSize = (boardPixels - tileGap * (size + 1)) / size;
  const tileColors = {
    0: "#ffffff",
    2: "#dff7fc",
    4: "#dce8ff",
    8: "#ffd34f",
    16: "#ff9d62",
    32: "#ff7184",
    64: "#ff5d73",
    128: "#7bd66f",
    256: "#20c7e5",
    512: "#62a7ff",
    1024: "#9b78f6",
    2048: "#283043",
  };

  let bestScore = 0;
  let state = createState();

  function createBoard() {
    return Array.from({ length: size }, () => Array(size).fill(0));
  }

  function addRandomTile(board) {
    const empty = [];

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        if (board[y][x] === 0) {
          empty.push({ x, y });
        }
      }
    }

    if (empty.length === 0) {
      return false;
    }

    const cell = empty[Math.floor(Math.random() * empty.length)];
    board[cell.y][cell.x] = Math.random() < 0.9 ? 2 : 4;
    return true;
  }

  function createState() {
    const board = createBoard();
    addRandomTile(board);
    addRandomTile(board);
    return {
      status: "running",
      board,
      score: 0,
    };
  }

  function boardHasMoves(board) {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const value = board[y][x];
        if (value === 0) {
          return true;
        }
        if (x + 1 < size && board[y][x + 1] === value) {
          return true;
        }
        if (y + 1 < size && board[y + 1][x] === value) {
          return true;
        }
      }
    }

    return false;
  }

  function slideLine(line) {
    const compact = line.filter((value) => value !== 0);
    const output = [];
    let gained = 0;

    for (let index = 0; index < compact.length; index += 1) {
      const current = compact[index];
      const next = compact[index + 1];

      if (current === next) {
        const merged = current * 2;
        output.push(merged);
        gained += merged;
        index += 1;
      } else {
        output.push(current);
      }
    }

    while (output.length < size) {
      output.push(0);
    }

    const changed = output.some((value, index) => value !== line[index]);
    return {
      line: output,
      gained,
      changed,
    };
  }

  function applyMove(direction) {
    if (state.status !== "running") {
      return false;
    }

    const board = state.board.map((row) => row.slice());
    let moved = false;
    let gained = 0;

    if (direction === "LEFT" || direction === "RIGHT") {
      for (let y = 0; y < size; y += 1) {
        const original = board[y].slice();
        const working = direction === "RIGHT" ? original.reverse() : original;
        const result = slideLine(working);
        const nextLine = direction === "RIGHT" ? result.line.reverse() : result.line;
        board[y] = nextLine;
        moved = moved || result.changed;
        gained += result.gained;
      }
    } else {
      for (let x = 0; x < size; x += 1) {
        const column = [];
        for (let y = 0; y < size; y += 1) {
          column.push(board[y][x]);
        }

        const working = direction === "DOWN" ? column.reverse() : column;
        const result = slideLine(working);
        const nextColumn = direction === "DOWN" ? result.line.reverse() : result.line;

        for (let y = 0; y < size; y += 1) {
          board[y][x] = nextColumn[y];
        }

        moved = moved || result.changed;
        gained += result.gained;
      }
    }

    if (!moved) {
      return true;
    }

    state.board = board;
    state.score += gained;
    if (state.score > bestScore) {
      bestScore = state.score;
    }

    addRandomTile(state.board);

    if (!boardHasMoves(state.board)) {
      state.status = "game_over";
    }

    return true;
  }

  return {
    title: "2048 Grid",
    controlScheme: "dpad",
    start() {
      state = createState();
    },
    stop() {
      if (state.status === "running") {
        state.status = "paused";
      }
    },
    tick() {
      // Intentional no-op. This game advances on input.
    },
    render() {
      clearCanvas(ctx, "#f8fbfd");

      ctx.fillStyle = "#d8e3ea";
      ctx.fillRect(boardX, boardY, boardPixels, boardPixels);

      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const value = state.board[y][x];
          const px = boardX + tileGap + x * (tileSize + tileGap);
          const py = boardY + tileGap + y * (tileSize + tileGap);
          const color = tileColors[value] || "#283043";

          ctx.fillStyle = color;
          ctx.fillRect(px, py, tileSize, tileSize);

          if (value === 0) {
            continue;
          }

          ctx.fillStyle = value <= 4 || value === 8 || value === 128 ? "#1b2533" : "#ffffff";
          ctx.font = value >= 1024 ? "700 22px Arial" : "700 30px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(value), px + tileSize / 2, py + tileSize / 2);
        }
      }
    },
    onKeyDown(keyText) {
      const normalized = String(keyText).toLowerCase();

      if (normalized === " ") {
        this.togglePause();
        return true;
      }

      if (normalized === "enter" && state.status === "game_over") {
        this.restart();
        return true;
      }

      const direction = directionFromKey(keyText);
      if (!direction) {
        return false;
      }

      applyMove(direction);
      return true;
    },
    onKeyUp() {
      return false;
    },
    onControl(action) {
      if (!["UP", "DOWN", "LEFT", "RIGHT"].includes(action)) {
        return false;
      }

      applyMove(action);
      return true;
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
      return 180;
    },
    getHud() {
      if (state.status === "game_over") {
        return {
          score: `Score: ${state.score} | Best: ${bestScore}`,
          status: "No moves left. Press Restart or Enter.",
          pauseLabel: "Pause",
          pauseDisabled: true,
        };
      }

      if (state.status === "paused") {
        return {
          score: `Score: ${state.score} | Best: ${bestScore}`,
          status: "Paused. Press Pause or Space to continue.",
          pauseLabel: "Resume",
          pauseDisabled: false,
        };
      }

      return {
        score: `Score: ${state.score} | Best: ${bestScore}`,
        status: "Use Arrow keys/WASD to merge tiles.",
        pauseLabel: "Pause",
        pauseDisabled: false,
      };
    },
  };
}
