'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const THEME_SRC = '/adalbert-theme.mp3';

/**
 * Homepage mascot: click Adalbert to play a short theme.
 * Hover lift + subtle hint invite the click; no extra chrome.
 */
export function AdalbertMascot() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [bounced, setBounced] = useState(false);

  useEffect(() => {
    const audio = new Audio(THEME_SRC);
    audio.preload = 'auto';
    audioRef.current = audio;

    const onEnded = () => setPlaying(false);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  const playTheme = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    try {
      audio.currentTime = 0;
      setPlaying(true);
      setBounced(true);
      window.setTimeout(() => setBounced(false), 450);
      await audio.play();
    } catch {
      setPlaying(false);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={playTheme}
      aria-label="Adalbert — Theme abspielen"
      title="Klick mich!"
      className={cn(
        'group mx-auto flex max-w-3xl cursor-pointer flex-col items-center text-center',
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
        {playing ? 'Theme läuft…' : 'Klick fürs Theme'}
      </span>
    </button>
  );
}
