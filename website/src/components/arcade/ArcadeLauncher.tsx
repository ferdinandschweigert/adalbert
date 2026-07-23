"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ArcadeGameId } from "@/lib/arcade";
import { ArcadeModal } from "./ArcadeModal";

function GameBoyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="5"
        y="2.5"
        width="14"
        height="19"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="7.25"
        y="4.75"
        width="9.5"
        height="7"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="9.2" cy="16.2" r="1.15" fill="currentColor" />
      <circle cx="12" cy="14.5" r="1.15" fill="currentColor" />
      <circle cx="12" cy="17.9" r="1.15" fill="currentColor" />
      <circle cx="14.8" cy="16.2" r="1.15" fill="currentColor" />
      <rect
        x="16.1"
        y="14.1"
        width="1.7"
        height="4.2"
        rx="0.7"
        fill="currentColor"
      />
    </svg>
  );
}

export function ArcadeLauncher() {
  const [open, setOpen] = useState(false);
  const [activeGameId, setActiveGameId] = useState<ArcadeGameId | null>(null);

  const handleClose = () => {
    setOpen(false);
    setActiveGameId(null);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Arcade öffnen"
        title="Arcade"
        onClick={() => setOpen(true)}
        className="text-zinc-600"
      >
        <GameBoyIcon className="h-5 w-5" />
      </Button>
      <ArcadeModal
        open={open}
        onClose={handleClose}
        activeGameId={activeGameId}
        onSelectGame={setActiveGameId}
        onBackToMenu={() => setActiveGameId(null)}
      />
    </>
  );
}
