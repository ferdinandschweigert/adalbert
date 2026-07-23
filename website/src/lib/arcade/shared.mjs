export const CANVAS_SIZE = 480;

export function drawDot(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

export function drawDiamond(ctx, x, y, radius) {
  ctx.beginPath();
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x + radius, y);
  ctx.lineTo(x, y + radius);
  ctx.lineTo(x - radius, y);
  ctx.closePath();
  ctx.fill();
}

export function drawGrid(ctx, gridSize, cellSize, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;

  for (let line = 0; line <= gridSize; line += 1) {
    const position = line * cellSize;

    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position, CANVAS_SIZE);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, position);
    ctx.lineTo(CANVAS_SIZE, position);
    ctx.stroke();
  }
}

export function clearCanvas(ctx, fill = "#0f141a") {
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

export function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function pointerToGridCell(clientX, clientY, canvas, layout) {
  if (!canvas || !layout) {
    return null;
  }

  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const x = ((clientX - rect.left) / rect.width) * CANVAS_SIZE;
  const y = ((clientY - rect.top) / rect.height) * CANVAS_SIZE;

  const {
    cols,
    rows,
    offsetX = 0,
    offsetY = 0,
    cellSize,
  } = layout;

  if (!Number.isFinite(cellSize) || cellSize <= 0) {
    return null;
  }

  const col = Math.floor((x - offsetX) / cellSize);
  const row = Math.floor((y - offsetY) / cellSize);

  if (col < 0 || row < 0 || col >= cols || row >= rows) {
    return null;
  }

  return { col, row };
}
