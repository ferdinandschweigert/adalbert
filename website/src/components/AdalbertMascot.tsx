'use client';

import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Original: Der kleine Nick – Der Nick Song */
const YT_VIDEO_ID = 'v8sceO61IWQ';

type YtPlayer = {
  playVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};

type YtNamespace = {
  Player: new (
    elementId: string,
    options: {
      videoId: string;
      width?: number | string;
      height?: number | string;
      playerVars?: Record<string, number | string>;
      events?: {
        onReady?: (event: { target: YtPlayer }) => void;
        onStateChange?: (event: { data: number }) => void;
      };
    }
  ) => YtPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};

declare global {
  interface Window {
    YT?: YtNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<YtNamespace> | null = null;

function loadYouTubeApi(): Promise<YtNamespace> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('no window'));
  }
  if (window.YT?.Player) {
    return Promise.resolve(window.YT);
  }
  if (ytApiPromise) return ytApiPromise;

  ytApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      script.async = true;
      document.body.appendChild(script);
    } else if (window.YT?.Player) {
      resolve(window.YT);
    }
  });

  return ytApiPromise;
}

/**
 * Homepage mascot: click Adalbert → original Nick Song via YouTube embed.
 */
export function AdalbertMascot() {
  const reactId = useId().replace(/:/g, '');
  const playerElementId = `adalbert-yt-${reactId}`;
  const playerRef = useRef<YtPlayer | null>(null);
  const pendingPlayRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [bounced, setBounced] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);

  const startPlayback = useCallback((player: YtPlayer) => {
    try {
      player.seekTo(0, true);
      player.playVideo();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, []);

  useEffect(() => {
    if (!showPlayer) return;

    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;

      // Player API replaces the element; recreate only once per mount cycle
      if (playerRef.current) {
        if (pendingPlayRef.current) {
          pendingPlayRef.current = false;
          startPlayback(playerRef.current);
        }
        return;
      }

      const el = document.getElementById(playerElementId);
      if (!el) return;

      playerRef.current = new YT.Player(playerElementId, {
        videoId: YT_VIDEO_ID,
        width: 280,
        height: 158,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            if (pendingPlayRef.current) {
              pendingPlayRef.current = false;
              startPlayback(event.target);
            } else {
              // autoplay=1 may already be going
              setPlaying(true);
            }
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.ENDED || event.data === YT.PlayerState.PAUSED) {
              setPlaying(false);
            } else if (event.data === YT.PlayerState.PLAYING) {
              setPlaying(true);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [showPlayer, playerElementId, startPlayback]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  const playTheme = useCallback(() => {
    setShowPlayer(true);
    setBounced(true);
    window.setTimeout(() => setBounced(false), 450);

    if (playerRef.current) {
      startPlayback(playerRef.current);
    } else {
      pendingPlayRef.current = true;
      setPlaying(true);
    }
  }, [startPlayback]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
      <button
        type="button"
        onClick={playTheme}
        aria-label="Adalbert — Nick Song abspielen"
        title="Klick mich!"
        className={cn(
          'group flex cursor-pointer flex-col items-center text-center',
          'rounded-2xl outline-none transition',
          'focus-visible:ring-2 focus-visible:ring-[#002F5D]/40 focus-visible:ring-offset-2'
        )}
      >
        <span
          className={cn(
            'mb-3 block transition-transform duration-300 ease-out',
            !playing && 'group-hover:-translate-y-1 group-hover:scale-[1.04]',
            'group-active:scale-[0.98]',
            bounced && 'adalbert-bounce',
            playing && 'adalbert-sway'
          )}
        >
          <Image
            src="/adalbert-full.webp"
            alt=""
            width={480}
            height={720}
            priority
            className="h-auto w-[88px] object-contain sm:w-[104px]"
            draggable={false}
          />
        </span>

        <h1
          className={cn(
            'text-3xl font-bold tracking-tight text-[#002F5D] md:text-4xl',
            'underline decoration-transparent decoration-2 underline-offset-4',
            'transition group-hover:decoration-[#2C94CC]/50'
          )}
        >
          Adalbert
        </h1>
        <p className="mt-2 max-w-md text-sm text-zinc-600">
          Altklausuren kreuzen (Fachschaft) oder Anki-Decks lokal anreichern.
        </p>
        <span
          className={cn(
            'mt-1.5 h-4 text-xs transition',
            playing
              ? 'text-[#2C94CC]'
              : 'text-transparent group-hover:text-[#2C94CC]/80 group-focus-visible:text-[#2C94CC]/80'
          )}
          aria-live="polite"
        >
          {playing ? 'Nick Song läuft…' : 'Klick fürs Theme'}
        </span>
      </button>

      <div
        className={cn(
          'mt-4 overflow-hidden transition-all duration-300',
          showPlayer ? 'max-h-48 opacity-100' : 'pointer-events-none max-h-0 opacity-0'
        )}
      >
        <div
          id={playerElementId}
          className="mx-auto h-[158px] w-[280px] overflow-hidden rounded-lg border border-[#e2e8f0] bg-black shadow-sm"
        />
      </div>
    </div>
  );
}
