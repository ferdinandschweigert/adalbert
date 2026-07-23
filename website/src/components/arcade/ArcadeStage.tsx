"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CANVAS_SIZE,
  getArcadeGame,
  type ArcadeGame,
  type ArcadeGameId,
  type ArcadeHud,
} from "@/lib/arcade";

type ArcadeStageProps = {
  gameId: ArcadeGameId;
  onBack: () => void;
};

type GameControls = {
  drawFrame: () => void;
  scheduleTick: () => void;
};

const BEST_STORAGE_KEY = "adalbert.arcade.best.v1";

function loadBests(): Record<string, number> {
  try {
    const raw = localStorage.getItem(BEST_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveBest(gameId: string, score: number) {
  if (!Number.isFinite(score)) return;
  const bests = loadBests();
  const prev = bests[gameId];
  if (Number.isFinite(prev) && score <= prev) return;
  bests[gameId] = score;
  try {
    localStorage.setItem(BEST_STORAGE_KEY, JSON.stringify(bests));
  } catch {
    // ignore quota / private mode
  }
}

function parseScoreFromHud(scoreText: string): number | null {
  const match = scoreText.match(/Score:\s*(-?\d+)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function controlButtonsForScheme(scheme: string): string[] {
  if (scheme === "vertical") return ["UP", "DOWN"];
  if (scheme === "horizontal") return ["LEFT", "RIGHT"];
  return ["UP", "LEFT", "DOWN", "RIGHT"];
}

function controlLabel(action: string): string {
  switch (action) {
    case "UP":
      return "↑";
    case "DOWN":
      return "↓";
    case "LEFT":
      return "←";
    case "RIGHT":
      return "→";
    default:
      return action;
  }
}

export function ArcadeStage({ gameId, onBack }: ArcadeStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef<ArcadeGame | null>(null);
  const controlsRef = useRef<GameControls | null>(null);
  const meta = getArcadeGame(gameId);

  const [hud, setHud] = useState<ArcadeHud>({
    score: "Score: 0",
    status: "Lädt…",
    pauseLabel: "Pause",
    pauseDisabled: false,
  });
  const [best, setBest] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    return loadBests()[gameId] ?? null;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !meta) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;

    let tickTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const stopLoop = () => {
      if (tickTimer) {
        clearTimeout(tickTimer);
        tickTimer = null;
      }
    };

    const drawFrame = () => {
      const game = gameRef.current;
      if (!game || disposed) return;
      game.render();
      const nextHud = game.getHud();
      setHud(nextHud);
      const score = parseScoreFromHud(nextHud.score);
      if (score !== null) {
        saveBest(gameId, score);
        setBest((prev) => (prev === null || score > prev ? score : prev));
      }
    };

    const scheduleTick = () => {
      stopLoop();
      const game = gameRef.current;
      if (!game || disposed || document.hidden) return;

      const delay = Math.max(16, game.getTickMs());
      tickTimer = setTimeout(() => {
        if (!gameRef.current || disposed || document.hidden) return;
        gameRef.current.tick();
        drawFrame();
        scheduleTick();
      }, delay);
    };

    controlsRef.current = { drawFrame, scheduleTick };

    const game = meta.create(ctx);
    gameRef.current = game;

    game.start();
    // Defer first paint/HUD update so we stay outside the sync effect body
    queueMicrotask(() => {
      if (disposed) return;
      drawFrame();
      scheduleTick();
      canvas.focus();
    });

    const onVisibility = () => {
      if (document.hidden) {
        stopLoop();
      } else if (gameRef.current && !disposed) {
        scheduleTick();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const active = gameRef.current;
      if (!active) return;
      if (event.key === "Escape") return;

      if (active.onKeyDown(event.key)) {
        event.preventDefault();
        drawFrame();
        scheduleTick();
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      const active = gameRef.current;
      if (!active?.onKeyUp) return;
      if (active.onKeyUp(event.key)) {
        event.preventDefault();
        drawFrame();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      stopLoop();
      game.stop();
      gameRef.current = null;
      controlsRef.current = null;
    };
  }, [gameId, meta]);

  const handleControl = (action: string) => {
    const game = gameRef.current;
    const controls = controlsRef.current;
    if (!game?.onControl || !controls) return;
    if (
      game.onControl(
        action as "UP" | "DOWN" | "LEFT" | "RIGHT" | "SELECT" | "A" | "B"
      )
    ) {
      controls.drawFrame();
      controls.scheduleTick();
    }
  };

  const handlePause = () => {
    const controls = controlsRef.current;
    gameRef.current?.togglePause?.();
    controls?.drawFrame();
    controls?.scheduleTick();
  };

  const handleRestart = () => {
    const controls = controlsRef.current;
    gameRef.current?.restart?.();
    controls?.drawFrame();
    controls?.scheduleTick();
  };

  if (!meta) {
    return (
      <div className="p-4 text-sm text-zinc-600">
        Spiel nicht gefunden.
        <Button variant="ghost" className="ml-2" onClick={onBack}>
          Zurück
        </Button>
      </div>
    );
  }

  const touchControls = controlButtonsForScheme(meta.controlScheme);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-[#002F5D]">
            {meta.title}
          </h3>
          <p className="truncate text-xs text-zinc-500">
            {hud.score}
            {best !== null ? ` · Best: ${best}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            Zurück
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePause}
            disabled={hud.pauseDisabled}
          >
            {hud.pauseLabel === "Resume" ? "Weiter" : "Pause"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRestart}
          >
            Neustart
          </Button>
        </div>
      </div>

      <p className="text-sm text-zinc-600" aria-live="polite">
        {hud.status}
      </p>

      <div className="mx-auto w-full max-w-[min(100%,480px)]">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          className="aspect-square w-full rounded-lg border border-[#e2e8f0] bg-[#f8fbfd] outline-none focus-visible:ring-2 focus-visible:ring-[#002F5D]"
          aria-label={`${meta.title} Spielfeld`}
        />
      </div>

      <div className="mx-auto flex max-w-xs flex-col items-center gap-2 sm:hidden">
        {touchControls.includes("UP") ? (
          <button
            type="button"
            className="rounded-md bg-[#eef5fb] px-4 py-3 text-lg text-[#002F5D]"
            onClick={() => handleControl("UP")}
            aria-label="Hoch"
          >
            {controlLabel("UP")}
          </button>
        ) : null}
        <div className="flex items-center gap-2">
          {touchControls.includes("LEFT") ? (
            <button
              type="button"
              className="rounded-md bg-[#eef5fb] px-4 py-3 text-lg text-[#002F5D]"
              onClick={() => handleControl("LEFT")}
              aria-label="Links"
            >
              {controlLabel("LEFT")}
            </button>
          ) : null}
          {touchControls.includes("DOWN") ? (
            <button
              type="button"
              className="rounded-md bg-[#eef5fb] px-4 py-3 text-lg text-[#002F5D]"
              onClick={() => handleControl("DOWN")}
              aria-label="Runter"
            >
              {controlLabel("DOWN")}
            </button>
          ) : null}
          {touchControls.includes("RIGHT") ? (
            <button
              type="button"
              className="rounded-md bg-[#eef5fb] px-4 py-3 text-lg text-[#002F5D]"
              onClick={() => handleControl("RIGHT")}
              aria-label="Rechts"
            >
              {controlLabel("RIGHT")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
