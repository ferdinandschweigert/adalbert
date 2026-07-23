declare module "@/lib/arcade/snake.mjs" {
  export function createSnakeGame(ctx: CanvasRenderingContext2D): unknown;
}

declare module "@/lib/arcade/blockfall.mjs" {
  export function createBlockfallGame(ctx: CanvasRenderingContext2D): unknown;
}

declare module "@/lib/arcade/g2048.mjs" {
  export function create2048Game(ctx: CanvasRenderingContext2D): unknown;
}

declare module "@/lib/arcade/pong.mjs" {
  export function createPongGame(ctx: CanvasRenderingContext2D): unknown;
}

declare module "@/lib/arcade/breakout.mjs" {
  export function createBreakoutGame(ctx: CanvasRenderingContext2D): unknown;
}

declare module "@/lib/arcade/shared.mjs" {
  export const CANVAS_SIZE: number;
  export function clearCanvas(
    ctx: CanvasRenderingContext2D,
    fill?: string
  ): void;
}
