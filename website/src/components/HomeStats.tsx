'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ExamBar = {
  examId: string;
  title: string;
  attempts: number;
  correct: number;
  questionsWithData: number;
};

type Overview = {
  totalAttempts: number;
  totalCorrect: number;
  exams: ExamBar[];
  heatmap: Array<{ date: string; count: number }>;
};

function heatClass(count: number, max: number): string {
  if (count <= 0) return 'bg-zinc-100';
  const t = max > 0 ? count / max : 0;
  if (t < 0.25) return 'bg-[#c5d4e3]';
  if (t < 0.5) return 'bg-[#7ba3c4]';
  if (t < 0.75) return 'bg-[#2C94CC]';
  return 'bg-[#002F5D]';
}

function shortTitle(title: string): string {
  return title.replace(/^M2\s+/i, '').replace(/\s+–\s+/g, ' · ');
}

export function HomeStats() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/altfragen/stats/overview', { cache: 'no-store' });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Stats fehlgeschlagen');
        if (!cancelled) {
          setData({
            totalAttempts: json.totalAttempts || 0,
            totalCorrect: json.totalCorrect || 0,
            exams: json.exams || [],
            heatmap: json.heatmap || [],
          });
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxAttempts = useMemo(
    () => Math.max(1, ...(data?.exams.map((e) => e.attempts) || [0])),
    [data]
  );
  const maxHeat = useMemo(
    () => Math.max(1, ...(data?.heatmap.map((d) => d.count) || [0])),
    [data]
  );

  const weeks = useMemo(() => {
    const cells = data?.heatmap || [];
    const cols: Array<Array<{ date: string; count: number }>> = [];
    for (let i = 0; i < cells.length; i += 7) {
      cols.push(cells.slice(i, i + 7));
    }
    return cols;
  }, [data]);

  const accuracy =
    data && data.totalAttempts > 0
      ? Math.round((data.totalCorrect / data.totalAttempts) * 100)
      : null;

  return (
    <section id="stats" className="scroll-mt-20 border-b border-[#e2e8f0] bg-white py-10 md:py-14">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-6 max-w-3xl text-center">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
            Aktivität beim Kreuzen
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Versuche je Klausur und Heatmap der letzten Wochen
          </p>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Lade Statistiken…
          </div>
        )}

        {error && (
          <p className="mx-auto max-w-lg rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-800">
            {error}
          </p>
        )}

        {!loading && !error && data && (
          <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-2">
            {/* Summary + bar chart */}
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5 md:p-6">
              <div className="mb-5 flex flex-wrap gap-6">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Kreuzungen
                  </p>
                  <p className="mt-1 text-3xl font-bold text-[#002F5D]">{data.totalAttempts}</p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Richtig
                  </p>
                  <p className="mt-1 text-3xl font-bold text-emerald-700">
                    {accuracy !== null ? `${accuracy}%` : '—'}
                  </p>
                </div>
              </div>

              <p className="mb-3 text-sm font-medium text-zinc-800">Versuche je Klausur</p>
              {data.exams.length === 0 || data.totalAttempts === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  Noch keine Kreuzungen —{' '}
                  <Link href="/altfragen" className="font-medium text-[#002F5D] underline">
                    jetzt üben
                  </Link>
                  , dann erscheinen die Balken.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.exams.map((exam) => {
                    const pct = Math.round((exam.attempts / maxAttempts) * 100);
                    const right =
                      exam.attempts > 0
                        ? Math.round((exam.correct / exam.attempts) * 100)
                        : 0;
                    return (
                      <li key={exam.examId}>
                        <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                          <Link
                            href={`/altfragen/${exam.examId}`}
                            className="truncate font-medium text-zinc-800 hover:text-[#002F5D]"
                          >
                            {shortTitle(exam.title)}
                          </Link>
                          <span className="shrink-0 tabular-nums text-zinc-500">
                            {exam.attempts}× · {right}%
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-md bg-zinc-200/80">
                          <div
                            className="h-full rounded-md bg-[#002F5D] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Heatmap */}
            <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5 md:p-6">
              <p className="mb-1 text-sm font-medium text-zinc-800">Aktivität (14 Wochen)</p>
              <p className="mb-4 text-xs text-zinc-500">
                Jedes Kästchen = ein Tag · dunkler = mehr Kreuzungen
              </p>
              <div className="overflow-x-auto">
                <div className="inline-flex gap-1">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1">
                      {week.map((day) => (
                        <div
                          key={day.date}
                          title={`${day.date}: ${day.count} Kreuzung${day.count === 1 ? '' : 'en'}`}
                          className={cn(
                            'h-3 w-3 rounded-sm sm:h-3.5 sm:w-3.5',
                            heatClass(day.count, maxHeat)
                          )}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 text-xs text-zinc-500">
                <span>weniger</span>
                <span className="h-3 w-3 rounded-sm bg-zinc-100" />
                <span className="h-3 w-3 rounded-sm bg-[#c5d4e3]" />
                <span className="h-3 w-3 rounded-sm bg-[#7ba3c4]" />
                <span className="h-3 w-3 rounded-sm bg-[#2C94CC]" />
                <span className="h-3 w-3 rounded-sm bg-[#002F5D]" />
                <span>mehr</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
