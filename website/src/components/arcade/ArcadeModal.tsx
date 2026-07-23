"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ARCADE_GAMES, type ArcadeGameId } from "@/lib/arcade";
import { ArcadeStage } from "./ArcadeStage";

type ArcadeModalProps = {
  open: boolean;
  onClose: () => void;
  activeGameId: ArcadeGameId | null;
  onSelectGame: (id: ArcadeGameId) => void;
  onBackToMenu: () => void;
};

export function ArcadeModal({
  open,
  onClose,
  activeGameId,
  onSelectGame,
  onBackToMenu,
}: ArcadeModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const frame = requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        if (activeGameId) {
          onBackToMenu();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [activeGameId, onBackToMenu, onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Arcade schließen"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex max-h-[min(92vh,820px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-lg outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e2e8f0] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-[#2C94CC]">
              Pause
            </p>
            <h2
              id={titleId}
              className="truncate text-lg font-bold tracking-tight text-[#002F5D]"
            >
              Arcade
            </h2>
            {!activeGameId ? (
              <p className="mt-0.5 text-sm text-zinc-500">
                Fünf Klassiker für kurze Pausen.
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Schließen
          </Button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5">
          {activeGameId ? (
            <ArcadeStage gameId={activeGameId} onBack={onBackToMenu} />
          ) : (
            <ul className="grid gap-2">
              {ARCADE_GAMES.map((game) => (
                <li key={game.id}>
                  <button
                    type="button"
                    onClick={() => onSelectGame(game.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#e2e8f0] bg-white px-4 py-3 text-left transition hover:border-[#2C94CC]/40 hover:bg-[#eef5fb]"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold text-[#002F5D]">
                        {game.title}
                      </span>
                      <span className="block text-sm text-zinc-500">
                        {game.subtitle}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium text-[#2C94CC]">
                      Spielen
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
