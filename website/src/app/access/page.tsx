'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Lock } from 'lucide-react';

function safeNextPath(raw: string | null): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//')) return '/';
  if (raw.startsWith('/access')) return '/';
  return raw;
}

function AccessForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get('next'));

  const [checking, setChecking] = useState(true);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/access', { cache: 'no-store' });
        const data = await res.json();
        if (cancelled) return;
        if (!data.required || data.unlocked) {
          router.replace(nextPath);
          return;
        }
      } catch {
        // stay on form
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  const handleUnlock = async (e?: FormEvent) => {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Zugang fehlgeschlagen');
      router.replace(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Lade…
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleUnlock(e)} className="mx-auto w-full max-w-md space-y-4">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/adalbert-full.webp"
          alt="Adalbert"
          width={320}
          height={480}
          priority
          className="mb-4 h-auto w-[96px] object-contain"
        />
        <h1 className="text-2xl font-bold tracking-tight text-[#002F5D]">Adalbert</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Fachschafts-Zugang für die gesamte Seite (Kreuzen &amp; Anki).
        </p>
      </div>

      <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2 text-[#002F5D]">
          <Lock className="h-5 w-5" />
          <span className="font-semibold">Zugangscode</span>
        </div>
        <p className="mb-4 text-sm text-zinc-600">
          Den Code bekommst du über die Fachschaft (Forum, Drive, Intranet) — nicht öffentlich
          teilen.
        </p>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Zugangscode"
          className="mb-3 w-full rounded-md border border-[#e2e8f0] px-3 py-2.5 text-sm outline-none focus:border-[#002F5D] focus:ring-1 focus:ring-[#002F5D]"
        />
        <Button type="submit" className="w-full" disabled={loading || !code.trim()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Freischalten
        </Button>
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        <p className="mt-3 text-xs text-zinc-500">
          Kein Account nötig. Nach dem Freischalten bleibt der Zugang in diesem Browser gespeichert.
        </p>
      </div>
    </form>
  );
}

export default function AccessPage() {
  return (
    <div className="flex min-h-screen items-center bg-[radial-gradient(ellipse_at_top,_#eef5fb_0%,_#ffffff_55%)] px-6 py-12">
      <Suspense
        fallback={
          <div className="mx-auto flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Lade…
          </div>
        }
      >
        <AccessForm />
      </Suspense>
    </div>
  );
}
