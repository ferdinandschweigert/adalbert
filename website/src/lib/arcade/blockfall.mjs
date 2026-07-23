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

export function createBlockfallGame(ctx) {
  const boardWidth = 10;
  const boardHeight = 20;
  const cell = 20;
  const boardX = 72;
  const boardY = 34;
  const scoreX = boardX + boardWidth * cell + 30;
  const scoreY = boardY + 10;
  const linePoints = [0, 120, 320, 520, 900];

  const shapes = [
    {
      color: "#20c7e5",
      cells: [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 3, y: 1 },
      ],
    },
    {
      color: "#62a7ff",
      cells: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
    },
    {
      color: "#ff5d73",
      cells: [
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
    },
    {
      color: "#ffd34f",
      cells: [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
    },
    {
      color: "#7bd66f",
      cells: [
        { x: 1, y: 0 },
        { x: 2, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
      ],
    },
    {
      color: "#9b78f6",
      cells: [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
    },
    {
      color: "#ff8b4a",
      cells: [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 2, y: 1 },
      ],
    },
  ];

  let bestScore = 0;
  let state = createState();

  function emptyBoard() {
    return Array.from({ length: boardHeight }, () => Array(boardWidth).fill(null));
  }

  function makePiece(index = Math.floor(Math.random() * shapes.length)) {
    return {
      index,
      x: 3,
      y: -1,
      rotation: 0,
    };
  }

  function rotateCell(cell, rotation, noRotate) {
    if (noRotate) {
      return { x: cell.x, y: cell.y };
    }

    let x = cell.x;
    let y = cell.y;

    for (let i = 0; i < rotation; i += 1) {
      const nextX = y;
      const nextY = 3 - x;
      x = nextX;
      y = nextY;
    }

    return { x, y };
  }

  function getCells(piece, rotation = piece.rotation) {
    const shape = shapes[piece.index];
    const noRotate = piece.index === 3; // O-piece stays the same.
    return shape.cells.map((cellDef) => rotateCell(cellDef, rotation, noRotate));
  }

  function collides(board, piece, dx = 0, dy = 0, rotation = piece.rotation) {
    for (const cellDef of getCells(piece, rotation)) {
      const x = piece.x + cellDef.x + dx;
      const y = piece.y + cellDef.y + dy;

      if (x < 0 || x >= boardWidth || y >= boardHeight) {
        return true;
      }

      if (y >= 0 && board[y][x]) {
        return true;
      }
    }

    return false;
  }

  function createState() {
    return {
      status: "running",
      board: emptyBoard(),
      current: makePiece(),
      next: makePiece(),
      score: 0,
      lines: 0,
      level: 1,
    };
  }

  function updateBest() {
    if (state.score > bestScore) {
      bestScore = state.score;
    }
  }

  function moveHorizontal(direction) {
    if (state.status !== "running") {
      return false;
    }

    if (collides(state.board, state.current, direction, 0)) {
      return false;
    }

    state.current.x += direction;
    return true;
  }

  function rotateCurrent() {
    if (state.status !== "running") {
      return false;
    }

    const targetRotation = (state.current.rotation + 1) % 4;
    const kicks = [0, -1, 1, -2, 2];

    for (const offset of kicks) {
      if (!collides(state.board, state.current, offset, 0, targetRotation)) {
        state.current.x += offset;
        state.current.rotation = targetRotation;
        return true;
      }
    }

    return false;
  }

  function clearLines() {
    let cleared = 0;

    for (let y = boardHeight - 1; y >= 0; y -= 1) {
      if (state.board[y].every(Boolean)) {
        state.board.splice(y, 1);
        state.board.unshift(Array(boardWidth).fill(null));
        cleared += 1;
        y += 1;
      }
    }

    if (cleared > 0) {
      state.score += linePoints[cleared] * state.level;
      state.lines += cleared;
      state.level = 1 + Math.floor(state.lines / 10);
      updateBest();
    }
  }

  function spawnNextPiece() {
    state.current = {
      index: state.next.index,
      x: 3,
      y: -1,
      rotation: 0,
    };
    state.next = makePiece();

    if (collides(state.board, state.current, 0, 0)) {
      state.status = "game_over";
    }
  }

  function lockCurrentPiece() {
    for (const cellDef of getCells(state.current)) {
      const x = state.current.x + cellDef.x;
      const y = state.current.y + cellDef.y;

      if (y < 0) {
        state.status = "game_over";
        return;
      }

      if (x >= 0 && x < boardWidth && y >= 0 && y < boardHeight) {
        state.board[y][x] = shapes[state.current.index].color;
      }
    }

    clearLines();
    spawnNextPiece();
  }

  function softDrop() {
    if (state.status !== "running") {
      return false;
    }

    if (!collides(state.board, state.current, 0, 1)) {
      state.current.y += 1;
      state.score += 1;
      updateBest();
      return true;
    }

    lockCurrentPiece();
    return true;
  }

  function hardDrop() {
    if (state.status !== "running") {
      return false;
    }

    let moved = false;

    while (!collides(state.board, state.current, 0, 1)) {
      state.current.y += 1;
      state.score += 2;
      moved = true;
    }

    lockCurrentPiece();
    updateBest();
    return moved;
  }

  function stepFall() {
    if (state.status !== "running") {
      return;
    }

    if (!collides(state.board, state.current, 0, 1)) {
      state.current.y += 1;
    } else {
      lockCurrentPiece();
    }
  }

  function drawCell(x, y, color, alpha = 1) {
    if (y < 0) {
      return;
    }

    const px = boardX + x * cell;
    const py = boardY + y * cell;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(px + 1, py + 1, cell - 2, cell - 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.38)";
    ctx.fillRect(px + 3, py + 3, cell - 6, 3);
    ctx.globalAlpha = 1;
  }

  function drawPiece(piece, alpha = 1) {
    for (const cellDef of getCells(piece)) {
      drawCell(
        piece.x + cellDef.x,
        piece.y + cellDef.y,
        shapes[piece.index].color,
        alpha,
      );
    }
  }

  function drawGhost() {
    const ghost = {
      ...state.current,
    };

    while (!collides(state.board, ghost, 0, 1)) {
      ghost.y += 1;
    }

    drawPiece(ghost, 0.25);
  }

  return {
    title: "Blockfall",
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
      stepFall();
    },
    render() {
      clearCanvas(ctx, "#f8fbfd");

      ctx.fillStyle = "#91a3b3";
      ctx.fillRect(boardX - 4, boardY - 4, boardWidth * cell + 8, boardHeight * cell + 8);
      ctx.fillStyle = "#eef4f8";
      ctx.fillRect(boardX, boardY, boardWidth * cell, boardHeight * cell);

      ctx.strokeStyle = "rgba(96, 114, 134, 0.2)";
      ctx.lineWidth = 1;
      for (let y = 1; y < boardHeight; y += 1) {
        const py = boardY + y * cell + 0.5;
        ctx.beginPath();
        ctx.moveTo(boardX, py);
        ctx.lineTo(boardX + boardWidth * cell, py);
        ctx.stroke();
      }
      for (let x = 1; x < boardWidth; x += 1) {
        const px = boardX + x * cell + 0.5;
        ctx.beginPath();
        ctx.moveTo(px, boardY);
        ctx.lineTo(px, boardY + boardHeight * cell);
        ctx.stroke();
      }

      for (let y = 0; y < boardHeight; y += 1) {
        for (let x = 0; x < boardWidth; x += 1) {
          if (state.board[y][x]) {
            drawCell(x, y, state.board[y][x]);
          }
        }
      }

      if (state.status !== "game_over") {
        drawGhost();
      }
      drawPiece(state.current);

      ctx.fillStyle = "#1b2533";
      ctx.font = "700 18px Arial";
      ctx.fillText("Next", scoreX, scoreY + 14);
      ctx.fillText("Level", scoreX, scoreY + 150);
      ctx.fillText("Lines", scoreX, scoreY + 206);
      ctx.fillText("Score", scoreX, scoreY + 262);

      const previewX = scoreX + 2;
      const previewY = scoreY + 36;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(previewX, previewY, 130, 90);
      ctx.strokeStyle = "#b9c7d2";
      ctx.lineWidth = 2;
      ctx.strokeRect(previewX, previewY, 130, 90);

      const previewPiece = {
        ...state.next,
        x: 0,
        y: 0,
      };
      const previewCells = getCells(previewPiece);
      const minX = Math.min(...previewCells.map((cellDef) => cellDef.x));
      const minY = Math.min(...previewCells.map((cellDef) => cellDef.y));

      ctx.fillStyle = shapes[state.next.index].color;
      for (const cellDef of previewCells) {
        const px = previewX + (cellDef.x - minX) * 22 + 20;
        const py = previewY + (cellDef.y - minY) * 22 + 16;
        ctx.fillRect(px, py, 18, 18);
      }

      ctx.fillStyle = "#1b2533";
      ctx.font = "700 22px Arial";
      ctx.fillText(String(state.level), scoreX, scoreY + 180);
      ctx.fillText(String(state.lines), scoreX, scoreY + 236);
      ctx.fillText(String(state.score), scoreX, scoreY + 292);
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
        return moveHorizontal(-1);
      }

      if (normalized === "arrowright" || normalized === "d") {
        return moveHorizontal(1);
      }

      if (normalized === "arrowup" || normalized === "w") {
        return rotateCurrent();
      }

      if (normalized === "arrowdown" || normalized === "s") {
        return softDrop();
      }

      if (normalized === "f") {
        return hardDrop();
      }

      return false;
    },
    onKeyUp() {
      return false;
    },
    onControl(action) {
      if (action === "LEFT") {
        return moveHorizontal(-1);
      }

      if (action === "RIGHT") {
        return moveHorizontal(1);
      }

      if (action === "UP") {
        return rotateCurrent();
      }

      if (action === "DOWN") {
        return softDrop();
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
      return Math.max(90, 520 - (state.level - 1) * 35);
    },
    getHud() {
      if (state.status === "game_over") {
        return {
          score: `Score: ${state.score} | Lines: ${state.lines} | Best: ${bestScore}`,
          status: "Stack reached top. Press Restart or Enter.",
          pauseLabel: "Pause",
          pauseDisabled: true,
        };
      }

      if (state.status === "paused") {
        return {
          score: `Score: ${state.score} | Lines: ${state.lines} | Best: ${bestScore}`,
          status: "Paused. Press Pause or Space to continue.",
          pauseLabel: "Resume",
          pauseDisabled: false,
        };
      }

      return {
        score: `Score: ${state.score} | Lines: ${state.lines} | Level: ${state.level} | Best: ${bestScore}`,
        status: "Move: Left/Right, Rotate: Up, Drop: Down, Hard Drop: F.",
        pauseLabel: "Pause",
        pauseDisabled: false,
      };
    },
  };
}
