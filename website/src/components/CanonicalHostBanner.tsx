'use client';

import { useSyncExternalStore } from 'react';
import {
  CANONICAL_HOST,
  CANONICAL_URL,
  isNonCanonicalHost,
} from '@/lib/altfragenLocalMigrate';
import { ExternalLink } from 'lucide-react';

function subscribe() {
  return () => {};
}

function getHost(): string {
  return window.location.hostname;
}

function getServerHost(): string {
  return '';
}

/**
 * Warn when the user is on a duplicate Vercel deployment.
 * Kreuzungsdaten sitzen in localStorage und sind origin-gebunden —
 * adalbertanki.vercel.app ≠ adalbert.vercel.app.
 */
export function CanonicalHostBanner() {
  const host = useSyncExternalStore(subscribe, getHost, getServerHost);
  if (!isNonCanonicalHost(host)) return null;

  const target = `${CANONICAL_URL}${window.location.pathname}${window.location.search}`;

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
      <div className="container mx-auto flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
        <p>
          Du bist auf <span className="font-medium">{host}</span> — Kreuzungsdaten liegen auf{' '}
          <span className="font-medium">{CANONICAL_HOST}</span>. Bitte die kanonische URL nutzen,
          sonst wirken Fortschritt & Stats „weg“.
        </p>
        <a
          href={target}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#002F5D] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#003d7a]"
        >
          Zu {CANONICAL_HOST}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
