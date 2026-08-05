'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock } from 'lucide-react';

const LOCAL_KEY = 'adalbert-altfragen-access-ok';

function readOptimisticUnlock(): boolean {
  try {
    return typeof window !== 'undefined' && localStorage.getItem(LOCAL_KEY) === '1';
  } catch {
    return false;
  }
}

export function AltfragenAccessGate({ children }: { children: React.ReactNode }) {
  const [required, setRequired] = useState(false);
  const [unlocked, setUnlocked] = useState(readOptimisticUnlock);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/altfragen/access', { credentials: 'same-origin' });
        const data = await res.json();
        if (cancelled) return;
        if (!data.required) {
          setRequired(false);
          setUnlocked(true);
          return;
        }
        setRequired(true);
        if (data.unlocked) {
          setUnlocked(true);
          localStorage.setItem(LOCAL_KEY, '1');
        } else {
          setUnlocked(false);
          if (localStorage.getItem(LOCAL_KEY) === '1') {
            localStorage.removeItem(LOCAL_KEY);
          }
        }
      } catch {
        if (!cancelled) {
          setRequired(false);
          setUnlocked(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUnlock = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/altfragen/access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Zugang fehlgeschlagen');
      localStorage.setItem(LOCAL_KEY, '1');
      setUnlocked(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  // Mount children immediately so list/practice fetch in parallel with the access check.
  // Only block when we know a code is required and the session is locked.
  if (required && !unlocked) {
    return (
      <div className="mx-auto max-w-md py-10">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-[#002F5D]" />
              Zugang
            </CardTitle>
            <CardDescription>
              Diese Klausuren sind passwortgeschützt. Bitte den geteilten Zugangscode eingeben.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void handleUnlock();
              }}
              placeholder="Zugangscode"
              className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm outline-none focus:border-[#002F5D] focus:ring-1 focus:ring-[#002F5D]"
            />
            <Button
              type="button"
              className="w-full"
              disabled={loading || !code.trim()}
              onClick={() => void handleUnlock()}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Freischalten &amp; kreuzen
            </Button>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <p className="text-xs text-zinc-500">
              Kein Account nötig — nur der geteilte Code.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
