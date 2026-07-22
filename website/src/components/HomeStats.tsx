'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  buildLocalHeatmap,
  ensureLocalActivityFromExamCaches,
  mergeDaily,
  readLocalExamAggregates,
} from '@/lib/altfragenLocalActivity';

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
  totalWrong: number;
  examCount: number;
  questionsTouched: number;
  activeDays: number;
  peakDay: { date: string; count: number } | null;
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

function emptyHeatmap(): Array<{ date: string; count: number }> {
  return buildLocalHeatmap({}, 98);
}

function StatValue({
  loading,
  children,
  className,
}: {
  loading: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (loading) {
    return (
      <span
        className={cn(
          'mt-1 inline-block h-8 w-16 animate-pulse rounded-md bg-zinc-200/90',
          className
        )}
      />
    );
  }
  return (
    <span className={cn('mt-1 block text-3xl font-bold tabular-nums', className)}>{children}</span>
  );
}

function weekdayLabel(iso: string): string {
  try {
    return new Date(iso + 'T12:00:00Z').toLocaleDateString('de-DE', { weekday: 'short' });
  } catch {
    return iso.slice(5);
  }
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
        if (cancelled) return;

        const serverExams: ExamBar[] = json.exams || [];
        const examIds = serverExams.map((e) => e.examId);
        const localAggs = readLocalExamAggregates(examIds);
        const localById = Object.fromEntries(localAggs.map((a) => [a.examId, a]));
        const localAct = ensureLocalActivityFromExamCaches(examIds);

        const exams = serverExams.map((e) => {
          const local = localById[e.examId];
          const attempts = Math.max(e.attempts, local?.attempts || 0);
          // Prefer higher attempts source for correct ratio consistency
          const correct =
            (local?.attempts || 0) > e.attempts ? local?.correct || 0 : Math.max(e.correct, local?.correct || 0);
          return {
            ...e,
            attempts,
            correct,
            questionsWithData: Math.max(e.questionsWithData, local?.questionsWithData || 0),
          };
        });

        const serverDaily: Record<string, number> = {};
        for (const cell of json.heatmap || []) {
          if (cell.count > 0) serverDaily[cell.date] = cell.count;
        }
        const daily = mergeDaily(serverDaily, localAct.daily || {});
        const heatmap = buildLocalHeatmap(daily, 98);

        let totalAttempts = 0;
        let totalCorrect = 0;
        let questionsTouched = 0;
        for (const e of exams) {
          totalAttempts += e.attempts;
          totalCorrect += e.correct;
          questionsTouched += e.questionsWithData;
        }

        let activeDays = 0;
        let peakDay: Overview['peakDay'] = null;
        for (const cell of heatmap) {
          if (cell.count > 0) activeDays += 1;
          if (!peakDay || cell.count > peakDay.count) peakDay = { date: cell.date, count: cell.count };
        }
        if (peakDay && peakDay.count === 0) peakDay = null;

        setData({
          totalAttempts,
          totalCorrect,
          totalWrong: Math.max(0, totalAttempts - totalCorrect),
          examCount: json.examCount || exams.length,
          questionsTouched,
          activeDays,
          peakDay,
          exams,
          heatmap,
        });
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

  const display = data || {
    totalAttempts: 0,
    totalCorrect: 0,
    totalWrong: 0,
    examCount: 0,
    questionsTouched: 0,
    activeDays: 0,
    peakDay: null as Overview['peakDay'],
    exams: [] as ExamBar[],
    heatmap: emptyHeatmap(),
  };

  const maxAttempts = useMemo(
    () => Math.max(1, ...display.exams.map((e) => e.attempts), 0),
    [display.exams]
  );
  const maxHeat = useMemo(
    () => Math.max(1, ...display.heatmap.map((d) => d.count), 0),
    [display.heatmap]
  );

  const weeks = useMemo(() => {
    const cols: Array<Array<{ date: string; count: number }>> = [];
    for (let i = 0; i < display.heatmap.length; i += 7) {
      cols.push(display.heatmap.slice(i, i + 7));
    }
    return cols;
  }, [display.heatmap]);

  const last14 = useMemo(() => display.heatmap.slice(-14), [display.heatmap]);
  const max14 = useMemo(() => Math.max(1, ...last14.map((d) => d.count), 0), [last14]);

  const accuracy =
    display.totalAttempts > 0
      ? Math.round((display.totalCorrect / display.totalAttempts) * 100)
      : null;

  const kpi = [
    { label: 'Kreuzungen', value: display.totalAttempts, className: 'text-[#002F5D]' },
    {
      label: 'Richtig',
      value: accuracy !== null ? `${accuracy}%` : '—',
      className: 'text-emerald-700',
    },
    { label: 'Falsch', value: display.totalWrong, className: 'text-red-600' },
    { label: 'Klausuren', value: display.examCount, className: 'text-[#002F5D]' },
    { label: 'Fragen mit Daten', value: display.questionsTouched, className: 'text-[#002F5D]' },
    { label: 'Aktive Tage', value: display.activeDays, className: 'text-[#002F5D]' },
  ];

  const barRows =
    display.exams.length > 0
      ? display.exams
      : [
          {
            examId: 'placeholder-a',
            title: 'Klausur A',
            attempts: 0,
            correct: 0,
            questionsWithData: 0,
          },
          {
            examId: 'placeholder-b',
            title: 'Klausur B',
            attempts: 0,
            correct: 0,
            questionsWithData: 0,
          },
        ];

  return (
    <section id="stats" className="scroll-mt-20 border-b border-[#e2e8f0] bg-white py-10 md:py-14">
      <div className="container mx-auto px-6">
        <div className="mx-auto mb-6 max-w-5xl">
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 md:text-2xl">
            Aktivität beim Kreuzen
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Kreuzungen, Trefferquote, Tagesbalken und Heatmap
          </p>
        </div>

        {error && (
          <p className="mx-auto mb-4 max-w-5xl rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        )}

        <div className="mx-auto mb-6 grid max-w-5xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {kpi.map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-3 py-3 md:px-4"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500 sm:text-xs">
                {item.label}
              </p>
              <StatValue loading={loading} className={item.className}>
                {item.value}
              </StatValue>
            </div>
          ))}
        </div>

        {/* 14-day activity bars */}
        <div className="mx-auto mb-6 max-w-5xl rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5 md:p-6">
          <p className="mb-1 text-sm font-medium text-zinc-800">Aktivität letzte 14 Tage</p>
          <p className="mb-4 text-xs text-zinc-500">Kreuzungen pro Tag</p>
          <div className="flex h-36 items-end gap-1.5 sm:gap-2">
            {last14.map((day) => {
              const h =
                loading || day.count <= 0 ? 4 : Math.max(8, Math.round((day.count / max14) * 100));
              return (
                <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] tabular-nums text-zinc-500">
                    {loading ? '·' : day.count > 0 ? day.count : ''}
                  </span>
                  <div
                    title={`${day.date}: ${day.count}`}
                    className={cn(
                      'w-full max-w-[28px] rounded-t-md transition-all duration-500',
                      loading ? 'animate-pulse bg-zinc-200' : 'bg-[#002F5D]',
                      day.count === 0 && !loading && 'bg-zinc-200'
                    )}
                    style={{ height: `${h}%` }}
                  />
                  <span className="truncate text-[10px] text-zinc-400">{weekdayLabel(day.date)}</span>
                </div>
              );
            })}
          </div>
          {!loading && last14.every((d) => d.count === 0) && (
            <p className="mt-3 text-center text-xs text-zinc-500">
              Noch keine Aktivität —{' '}
              <Link href="/altfragen" className="font-medium text-[#002F5D] underline">
                eine Frage kreuzen
              </Link>
              , dann erscheinen die Balken.
            </p>
          )}
        </div>

        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5 md:p-6">
            <p className="mb-3 text-sm font-medium text-zinc-800">Versuche je Klausur</p>
            <ul className="space-y-3">
              {barRows.map((exam) => {
                const isPlaceholder = exam.examId.startsWith('placeholder');
                const pct =
                  loading || isPlaceholder || display.totalAttempts === 0
                    ? 0
                    : Math.round((exam.attempts / maxAttempts) * 100);
                const right =
                  exam.attempts > 0 ? Math.round((exam.correct / exam.attempts) * 100) : 0;
                return (
                  <li key={exam.examId}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                      {isPlaceholder || loading ? (
                        <span className="h-3 w-32 animate-pulse rounded bg-zinc-200/90" />
                      ) : (
                        <Link
                          href={`/altfragen/${exam.examId}`}
                          className="truncate font-medium text-zinc-800 hover:text-[#002F5D]"
                        >
                          {shortTitle(exam.title)}
                        </Link>
                      )}
                      <span className="shrink-0 tabular-nums text-zinc-500">
                        {loading ? (
                          <span className="inline-block h-3 w-14 animate-pulse rounded bg-zinc-200/90" />
                        ) : isPlaceholder ? (
                          '0×'
                        ) : (
                          `${exam.attempts}× · ${right}%`
                        )}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-md bg-zinc-200/80">
                      <div
                        className="h-full rounded-md bg-[#002F5D] transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
            {display.peakDay && !loading && (
              <p className="mt-4 text-xs text-zinc-500">
                Stärkster Tag: {display.peakDay.date} · {display.peakDay.count}×
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-5 md:p-6">
            <p className="mb-1 text-sm font-medium text-zinc-800">Heatmap (14 Wochen)</p>
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
                          loading ? 'animate-pulse bg-zinc-200/80' : heatClass(day.count, maxHeat)
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
      </div>
    </section>
  );
}
