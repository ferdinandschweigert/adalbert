'use client';

import Image from 'next/image';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
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

type ThemeCtx = {
  docked: boolean;
  playing: boolean;
  bounced: boolean;
  playerElementId: string;
  toggleTheme: () => void;
  stopTheme: () => void;
  registerPlayerHost: (hostReady: boolean) => void;
};

const AdalbertThemeContext = createContext<ThemeCtx | null>(null);

function useAdalbertTheme() {
  const ctx = useContext(AdalbertThemeContext);
  if (!ctx) {
    throw new Error('AdalbertThemeProvider missing');
  }
  return ctx;
}

export function AdalbertThemeProvider({ children }: { children: ReactNode }) {
  const reactId = useId().replace(/:/g, '');
  const playerElementId = `adalbert-yt-${reactId}`;
  const playerRef = useRef<YtPlayer | null>(null);
  const pendingPlayRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [bounced, setBounced] = useState(false);
  const [docked, setDocked] = useState(false);
  const [hostReady, setHostReady] = useState(false);

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

  const registerPlayerHost = useCallback((ready: boolean) => {
    setHostReady(ready);
  }, []);

  useEffect(() => {
    if (!docked || !hostReady) return;

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
        width: 320,
        height: 180,
        playerVars: {
          autoplay: 1,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          controls: 1,
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
  }, [docked, hostReady, playerElementId, startPlayback]);

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

  const value = useMemo(
    () => ({
      docked,
      playing,
      bounced,
      playerElementId,
      toggleTheme,
      stopTheme,
      registerPlayerHost,
    }),
    [docked, playing, bounced, playerElementId, toggleTheme, stopTheme, registerPlayerHost]
  );

  return (
    <AdalbertThemeContext.Provider value={value}>{children}</AdalbertThemeContext.Provider>
  );
}

/** Hero mascot — click toggles the theme; Stop sits on the figure. */
export function AdalbertMascot() {
  const { docked, playing, bounced, toggleTheme, stopTheme } = useAdalbertTheme();

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
      <div className="relative mb-3 inline-block">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={
            playing || docked
              ? 'Adalbert — Nick Song stoppen'
              : 'Adalbert — Nick Song abspielen'
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
            : 'Adalbert — Nick Song abspielen'
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
          playing || docked ? 'text-[#2C94CC]' : 'text-transparent hover:text-[#2C94CC]/80'
        )}
        aria-live="polite"
      >
        {playing || docked ? 'Nochmal klicken = Stop' : 'Klick fürs Theme'}
      </span>
    </div>
  );
}

/** YouTube embed at the very end of the page (after footer). */
export function AdalbertThemeEndPlayer() {
  const { docked, playerElementId, registerPlayerHost } = useAdalbertTheme();

  useEffect(() => {
    if (!docked) {
      registerPlayerHost(false);
      return;
    }
    registerPlayerHost(true);
    return () => registerPlayerHost(false);
  }, [docked, registerPlayerHost]);

  if (!docked) return null;

  return (
    <section className="border-t border-[#e2e8f0] bg-[#f8fafc] py-8" aria-label="Nick Song">
      <div className="container mx-auto flex justify-center px-6">
        <div
          id={playerElementId}
          className="h-[180px] w-[320px] max-w-full overflow-hidden rounded-lg border border-[#e2e8f0] bg-black shadow-sm"
          title="YouTube — Der Nick Song"
        />
      </div>
    </section>
  );
}
