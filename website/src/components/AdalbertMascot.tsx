'use client';

import Image from 'next/image';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Original: Der kleine Nick – Der Nick Song */
const YT_VIDEO_ID = 'v8sceO61IWQ';

type YtPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
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
 * Click Adalbert → play Nick Song (corner peek). Click again or Stop → off.
 */
export function AdalbertMascot() {
  const reactId = useId().replace(/:/g, '');
  const playerElementId = `adalbert-yt-${reactId}`;
  const playerRef = useRef<YtPlayer | null>(null);
  const pendingPlayRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [bounced, setBounced] = useState(false);
  const [docked, setDocked] = useState(false);

  const startPlayback = useCallback((player: YtPlayer) => {
    try {
      player.seekTo(0, true);
      player.playVideo();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  }, []);

  const stopTheme = useCallback(() => {
    pendingPlayRef.current = false;
    try {
      playerRef.current?.stopVideo();
    } catch {
      /* ignore */
    }
    playerRef.current?.destroy();
    playerRef.current = null;
    setPlaying(false);
    setDocked(false);
  }, []);

  useEffect(() => {
    if (!docked) return;

    let cancelled = false;

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;

      if (playerRef.current) {
        if (pendingPlayRef.current) {
          pendingPlayRef.current = false;
          startPlayback(playerRef.current);
        }
        return;
      }

      if (!document.getElementById(playerElementId)) return;

      playerRef.current = new YT.Player(playerElementId, {
        videoId: YT_VIDEO_ID,
        width: 160,
        height: 90,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event) => {
            if (cancelled) return;
            if (pendingPlayRef.current) {
              pendingPlayRef.current = false;
              startPlayback(event.target);
            } else {
              setPlaying(true);
            }
          },
          onStateChange: (event) => {
            if (event.data === YT.PlayerState.ENDED) {
              // Song finished → hide peek + stop chip
              pendingPlayRef.current = false;
              playerRef.current?.destroy();
              playerRef.current = null;
              setPlaying(false);
              setDocked(false);
            } else if (event.data === YT.PlayerState.PLAYING) {
              setPlaying(true);
            } else if (event.data === YT.PlayerState.PAUSED) {
              setPlaying(false);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
    };
  }, [docked, playerElementId, startPlayback]);

  useEffect(() => {
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, []);

  const toggleTheme = useCallback(() => {
    setBounced(true);
    window.setTimeout(() => setBounced(false), 450);

    if (docked || playing) {
      stopTheme();
      return;
    }

    setDocked(true);
    if (playerRef.current) {
      startPlayback(playerRef.current);
    } else {
      pendingPlayRef.current = true;
      setPlaying(true);
    }
  }, [docked, playing, startPlayback, stopTheme]);

  return (
    <>
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="relative mb-3 inline-block">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              playing || docked
                ? 'Adalbert — Nick Song stoppen'
                : 'Adalbert — Nick Song im Hintergrund abspielen'
            }
            title={playing || docked ? 'Nochmal klicken = Stop' : 'Klick mich!'}
            className={cn(
              'group cursor-pointer rounded-2xl outline-none transition',
              'focus-visible:ring-2 focus-visible:ring-[#002F5D]/40 focus-visible:ring-offset-2'
            )}
          >
            <span
              className={cn(
                'block transition-transform duration-300 ease-out',
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
          </button>

          {docked ? (
            <button
              type="button"
              onClick={stopTheme}
              aria-label="Nick Song stoppen"
              className={cn(
                'absolute -bottom-1 -right-3 z-10',
                'rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold tracking-wide',
                'text-[#002F5D] shadow-sm ring-1 ring-[#e2e8f0]',
                'transition hover:bg-[#eef5fb] hover:ring-[#002F5D]/25'
              )}
            >
              Stop
            </button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          className={cn(
            'group cursor-pointer rounded-md outline-none',
            'focus-visible:ring-2 focus-visible:ring-[#002F5D]/40 focus-visible:ring-offset-2'
          )}
          aria-label={
            playing || docked
              ? 'Adalbert — Nick Song stoppen'
              : 'Adalbert — Nick Song im Hintergrund abspielen'
          }
        >
          <h1
            className={cn(
              'text-3xl font-bold tracking-tight text-[#002F5D] md:text-4xl',
              'underline decoration-transparent decoration-2 underline-offset-4',
              'transition group-hover:decoration-[#2C94CC]/50'
            )}
          >
            Adalbert
          </h1>
        </button>

        <p className="mt-2 max-w-md text-sm text-zinc-600">
          Altklausuren kreuzen (Fachschaft) oder Anki-Decks lokal anreichern.
        </p>
        <span
          className={cn(
            'mt-1.5 h-4 text-xs transition',
            playing || docked
              ? 'text-[#2C94CC]'
              : 'text-transparent hover:text-[#2C94CC]/80'
          )}
          aria-live="polite"
        >
          {playing || docked ? 'Nochmal klicken = Stop' : 'Klick fürs Theme'}
        </span>
      </div>

      {docked ? (
        <div
          className={cn(
            'fixed bottom-0 right-0 z-50 p-2',
            'translate-x-[42%] translate-y-[42%] opacity-70',
            'transition duration-300 ease-out',
            'hover:translate-x-0 hover:translate-y-0 hover:opacity-100',
            'focus-within:translate-x-0 focus-within:translate-y-0 focus-within:opacity-100'
          )}
          aria-hidden
        >
          <div
            id={playerElementId}
            className="h-[90px] w-[160px] overflow-hidden rounded-tl-lg border border-[#e2e8f0] bg-black shadow-lg"
            title="YouTube — Der Nick Song"
          />
        </div>
      ) : null}
    </>
  );
}
