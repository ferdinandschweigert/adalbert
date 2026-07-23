'use client';

import { useEffect, useState } from 'react';
import {
  detectLikelyPrivateMode,
  probeStorageHealth,
  requestPersistentStorage,
} from '@/lib/altfragenStorage';
import { AlertTriangle } from 'lucide-react';

/**
 * Only shown when Kreuzungsdaten will NOT survive this browser context
 * (blocked localStorage or likely private/incognito profile).
 */
export function StorageHealthBanner() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const health = probeStorageHealth();
      if (cancelled) return;

      if (!health.writable) {
        setMessage(
          health.detail ||
            'Browser-Speicher blockiert — Kreuzungen gehen verloren, sobald du den Tab schließt. Bitte normalen (nicht-privaten) Browser auf https://adalbert.vercel.app nutzen.'
        );
        return;
      }

      const privateLike = await detectLikelyPrivateMode();
      if (cancelled) return;

      if (privateLike) {
        setMessage(
          'Privatmodus erkannt — Fortschritt bleibt nur bis zum Schließen des Tabs. Bitte normales Fenster auf https://adalbert.vercel.app nutzen (nicht Inkognito).'
        );
        return;
      }

      void requestPersistentStorage();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!message) return null;

  return (
    <div className="border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-950">
      <div className="container mx-auto flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" />
        <p>{message}</p>
      </div>
    </div>
  );
}
