'use client';

/**
 * Legacy soft-gate — site-wide protection is handled by middleware + /access.
 * Kept for any remaining wrappers; redirects to /access when locked.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export function AltfragenAccessGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/access', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (data.required && !data.unlocked) {
          const next = `${window.location.pathname}${window.location.search}`;
          router.replace(`/access?next=${encodeURIComponent(next)}`);
          return;
        }
        setReady(true);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Lade…
      </div>
    );
  }

  return <>{children}</>;
}
