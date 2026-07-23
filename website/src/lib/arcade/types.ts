export type ArcadeControlAction =
  | "UP"
  | "DOWN"
  | "LEFT"
  | "RIGHT"
  | "SELECT"
  | "A"
  | "B";

export type ArcadeControlScheme =
  | "dpad"
  | "vertical"
  | "horizontal"
  | "none"
  | string;

export type ArcadeHud = {
  score: string;
  status: string;
  pauseLabel: string;
  pauseDisabled: boolean;
};

export type ArcadeGame = {
  title: string;
  controlScheme: ArcadeControlScheme;
  start: () => void;
  stop: () => void;
  tick: () => void;
  render: () => void;
  onKeyDown: (key: string) => boolean;
  onKeyUp?: (key: string) => boolean;
  onControl?: (action: ArcadeControlAction) => boolean;
  togglePause?: () => void;
  restart?: () => void;
  setDifficulty?: (difficulty: string) => void;
  getTickMs: () => number;
  getHud: () => ArcadeHud;
};

export type ArcadeGameId =
  | "snake"
  | "blockfall"
  | "g2048"
  | "pong"
  | "breakout";

export type ArcadeGameFactory = (
  ctx: CanvasRenderingContext2D
) => ArcadeGame;
