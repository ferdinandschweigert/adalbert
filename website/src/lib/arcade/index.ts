import { createBlockfallGame } from "./blockfall.mjs";
import { createBreakoutGame } from "./breakout.mjs";
import { create2048Game } from "./g2048.mjs";
import { createPongGame } from "./pong.mjs";
import { createSnakeGame } from "./snake.mjs";
import { CANVAS_SIZE } from "./shared.mjs";
import type { ArcadeGameFactory, ArcadeGameId } from "./types";

export { CANVAS_SIZE };
export type { ArcadeGame, ArcadeGameId, ArcadeHud } from "./types";

export const ARCADE_GAMES: {
  id: ArcadeGameId;
  title: string;
  subtitle: string;
  controlScheme: "dpad" | "vertical" | "horizontal";
  create: ArcadeGameFactory;
}[] = [
  {
    id: "snake",
    title: "Snake",
    subtitle: "Wachsen, ohne zu crashen",
    controlScheme: "dpad",
    create: createSnakeGame as ArcadeGameFactory,
  },
  {
    id: "blockfall",
    title: "Tetris",
    subtitle: "Reihen freiräumen",
    controlScheme: "dpad",
    create: createBlockfallGame as ArcadeGameFactory,
  },
  {
    id: "g2048",
    title: "2048",
    subtitle: "Kacheln bis 2048 mergen",
    controlScheme: "dpad",
    create: create2048Game as ArcadeGameFactory,
  },
  {
    id: "pong",
    title: "Pong",
    subtitle: "Paddle-Duell gegen die CPU",
    controlScheme: "vertical",
    create: createPongGame as ArcadeGameFactory,
  },
  {
    id: "breakout",
    title: "Breakout",
    subtitle: "Alle Steine zerstören",
    controlScheme: "horizontal",
    create: createBreakoutGame as ArcadeGameFactory,
  },
];

export function getArcadeGame(id: ArcadeGameId) {
  return ARCADE_GAMES.find((game) => game.id === id) ?? null;
}
