'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AltfragenShell } from '@/components/altfragen/AltfragenShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type {
  ExamProgress,
  ParsedQuestion,
  QuestionStat,
  StoredExam,
} from '@/lib/altfragenTypes';
import {
  clearProgress,
  createEmptyProgress,
  getProgress,
  saveProgress,
} from '@/lib/altfragenStore';
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Loader2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function emptyBits(optionCount: number): string {
  return '0'.repeat(optionCount);
}

function normalizeBits(bits: string | undefined, optionCount: number): string {
  const cleaned = (bits || '').replace(/[^01]/g, '');
  return cleaned.padEnd(optionCount, '0').slice(0, optionCount);
}

function toggleBit(bits: string, index: number, exclusive: boolean): string {
  const arr = bits.split('');
  if (exclusive) return arr.map((_, i) => (i === index ? '1' : '0')).join('');
  arr[index] = arr[index] === '1' ? '0' : '1';
  return arr.join('');
}

function hasAnswerKey(question: ParsedQuestion): boolean {
  return Boolean(question.correctAnswers && question.correctAnswers.includes('1'));
}

function isCorrect(question: ParsedQuestion, selection: string): boolean {
  if (!hasAnswerKey(question)) return false;
  return (
    normalizeBits(question.correctAnswers, question.options.length) ===
    normalizeBits(selection, question.options.length)
  );
}

function letter(index: number): string {
  return String.fromCharCode(65 + index);
}

type NavStatus = 'current' | 'unseen' | 'correct' | 'wrong' | 'done';

export function AltfragenPractice({ examId }: { examId: string }) {
  const [exam, setExam] = useState<StoredExam | null>(null);
  const [progress, setProgress] = useState<ExamProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [communityStats, setCommunityStats] = useState<Record<string, QuestionStat>>({});
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [examRes, statsRes] = await Promise.all([
          fetch(`/api/altfragen/exams/${examId}`, { cache: 'no-store' }),
          fetch(`/api/altfragen/exams/${examId}/stats`, { cache: 'no-store' }),
        ]);
        const examData = await examRes.json();
        if (!examRes.ok) throw new Error(examData.error || 'Klausur nicht gefunden');
        if (cancelled) return;
        setExam(examData.exam as StoredExam);
        const existing = getProgress(examId);
        setProgress(existing ?? createEmptyProgress(examId));
        if (existing?.completedAt) setShowResult(true);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setCommunityStats(statsData.questionStats || {});
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : String(e));
          setExam(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const persist = useCallback(
    (next: ExamProgress) => {
      setProgress(next);
      saveProgress(next);
    },
    []
  );

  const questions = exam?.questions ?? [];
  const index = progress?.currentIndex ?? 0;
  const question = questions[index];
  const optionCount = question?.options.length ?? 0;
  const selection = normalizeBits(progress?.selections[index], optionCount);
  const isChecked = progress?.checked.includes(index) ?? false;
  const currentStat = question ? communityStats[String(question.number)] : undefined;

  const navStatus = useCallback(
    (i: number): NavStatus => {
      if (!progress || !questions[i]) return 'unseen';
      if (i === progress.currentIndex && !showOverview && !showResult) return 'current';
      if (!progress.checked.includes(i)) return 'unseen';
      const q = questions[i];
      const sel = progress.selections[i] || '';
      if (!hasAnswerKey(q)) return 'done';
      return isCorrect(q, sel) ? 'correct' : 'wrong';
    },
    [progress, questions, showOverview, showResult]
  );

  const scoreSummary = useMemo(() => {
    if (!exam || !progress) return { correct: 0, graded: 0, checked: 0 };
    let correct = 0;
    let graded = 0;
    for (let i = 0; i < exam.questions.length; i++) {
      if (!progress.checked.includes(i)) continue;
      if (!hasAnswerKey(exam.questions[i])) continue;
      graded += 1;
      if (isCorrect(exam.questions[i], progress.selections[i] || '')) correct += 1;
    }
    return { correct, graded, checked: progress.checked.length };
  }, [exam, progress]);

  const goTo = (nextIndex: number) => {
    if (!progress) return;
    const clamped = Math.max(0, Math.min(questions.length - 1, nextIndex));
    setShowResult(false);
    setShowOverview(false);
    persist({ ...progress, currentIndex: clamped, completedAt: undefined });
  };

  const handleSelect = (optIndex: number) => {
    if (!progress || !question || isChecked) return;
    const exclusive = question.type === 'SC';
    const nextBits = toggleBit(selection || emptyBits(optionCount), optIndex, exclusive);
    persist({
      ...progress,
      selections: { ...progress.selections, [index]: nextBits },
    });
  };

  const reportStats = async (q: ParsedQuestion, bits: string) => {
    try {
      setReporting(true);
      const res = await fetch(`/api/altfragen/exams/${examId}/stats`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionNumber: q.number,
          optionCount: q.options.length,
          selectionBits: bits,
          correctBits: q.correctAnswers || '',
        }),
      });
      const data = await res.json();
      if (res.ok && data.stat) {
        setCommunityStats((prev) => ({ ...prev, [String(q.number)]: data.stat }));
      }
    } catch {
      // non-blocking
    } finally {
      setReporting(false);
    }
  };

  const handleCheck = async () => {
    if (!progress || !question || !selection.includes('1')) return;
    const checked = progress.checked.includes(index)
      ? progress.checked
      : [...progress.checked, index];
    const allDone = checked.length >= questions.length;
    persist({
      ...progress,
      checked,
      completedAt: allDone ? new Date().toISOString() : progress.completedAt,
    });
    void reportStats(question, selection);
    if (allDone) setShowResult(true);
  };

  const handleRestart = () => {
    clearProgress(examId);
    persist(createEmptyProgress(examId));
    setShowResult(false);
    setShowOverview(false);
  };

  if (loading) {
    return (
      <AltfragenShell subtitle="Laden…">
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Lade Klausur…
        </div>
      </AltfragenShell>
    );
  }

  if (loadError || !exam || !progress) {
    return (
      <AltfragenShell subtitle="Nicht gefunden">
        <div className="mx-auto max-w-lg space-y-4 text-center">
          <div className="flex items-center justify-center gap-2 text-zinc-600">
            <AlertCircle className="h-4 w-4" />
            <span>{loadError || 'Klausur nicht freigegeben.'}</span>
          </div>
          <Button asChild>
            <Link href="/altfragen">Zur Übersicht</Link>
          </Button>
        </div>
      </AltfragenShell>
    );
  }

  const QuestionNav = ({ compact }: { compact?: boolean }) => (
    <div className={cn('flex flex-wrap gap-1.5', compact && 'max-h-48 overflow-y-auto')}>
      {questions.map((q, i) => {
        const status = navStatus(i);
        return (
          <button
            key={q.number}
            type="button"
            onClick={() => goTo(i)}
            title={`Frage ${i + 1}`}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold transition',
              status === 'current' && 'bg-[#002F5D] text-white ring-2 ring-[#2C94CC]',
              status === 'unseen' && 'bg-zinc-100 text-zinc-600 hover:bg-[#eef5fb]',
              status === 'correct' && 'bg-emerald-500 text-white hover:bg-emerald-600',
              status === 'wrong' && 'bg-red-500 text-white hover:bg-red-600',
              status === 'done' && 'bg-amber-400 text-white hover:bg-amber-500'
            )}
          >
            {i + 1}
          </button>
        );
      })}
    </div>
  );

  if (showResult) {
    const pct = scoreSummary.graded
      ? Math.round((scoreSummary.correct / scoreSummary.graded) * 100)
      : 0;
    return (
      <AltfragenShell subtitle={exam.title}>
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium text-[#2C94CC]">Ergebnis</p>
            <p className="mt-2 text-4xl font-bold text-[#002F5D]">{pct}%</p>
            <p className="mt-2 text-zinc-600">
              {scoreSummary.correct} von {scoreSummary.graded} richtig · {scoreSummary.checked}{' '}
              geprüft
            </p>
          </div>
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-zinc-800">Fragenübersicht — springe zu einer Frage</p>
            <QuestionNav />
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-emerald-500" /> richtig
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-red-500" /> falsch
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-zinc-200" /> offen
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleRestart}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Neu starten
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowOverview(true)}>
              <LayoutGrid className="mr-2 h-4 w-4" />
              Übersicht
            </Button>
            <Button type="button" variant="ghost" asChild>
              <Link href="/altfragen">Alle Klausuren</Link>
            </Button>
          </div>
        </div>
      </AltfragenShell>
    );
  }

  if (showOverview) {
    return (
      <AltfragenShell subtitle={exam.title}>
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Fragenübersicht</h2>
              <p className="text-sm text-zinc-500">
                {scoreSummary.checked} / {questions.length} geprüft · {scoreSummary.correct} richtig
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => setShowOverview(false)}>
              Zurück zur Frage
            </Button>
          </div>
          <QuestionNav />
          <ul className="divide-y divide-[#e2e8f0] rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
            {questions.map((q, i) => {
              const status = navStatus(i);
              const st = communityStats[String(q.number)];
              return (
                <li key={q.number}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f8fafc]"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-semibold',
                        status === 'correct' && 'bg-emerald-500 text-white',
                        status === 'wrong' && 'bg-red-500 text-white',
                        status === 'unseen' && 'bg-zinc-100 text-zinc-600',
                        status === 'done' && 'bg-amber-400 text-white',
                        status === 'current' && 'bg-[#002F5D] text-white'
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 text-sm text-zinc-800">
                        {q.question.replace(/^\[T\d+_\d+\]\s*/, '')}
                      </span>
                      {st && st.attempts > 0 && (
                        <span className="mt-1 block text-xs text-zinc-500">
                          Community: {Math.round((st.correct / st.attempts) * 100)}% richtig (
                          {st.attempts}×)
                        </span>
                      )}
                    </span>
                    <Badge variant="secondary" className="shrink-0">
                      {q.type}
                    </Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </AltfragenShell>
    );
  }

  if (!question) {
    return (
      <AltfragenShell subtitle={exam.title}>
        <p className="text-zinc-600">Keine Fragen.</p>
      </AltfragenShell>
    );
  }

  const correctBits = normalizeBits(question.correctAnswers, optionCount);
  const hasKey = correctBits.includes('1');

  return (
    <AltfragenShell subtitle={exam.title}>
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[220px_1fr]">
        {/* Amboss-style side navigator */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-3 rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-sm">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Fragen
            </p>
            <QuestionNav compact />
            <p className="px-1 text-xs text-zinc-500">
              {scoreSummary.checked}/{questions.length} · {scoreSummary.correct} richtig
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowOverview(true)}
            >
              <LayoutGrid className="mr-1.5 h-3.5 w-3.5" />
              Übersicht
            </Button>
          </div>
        </aside>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">
              Frage {index + 1} / {questions.length}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{question.type}</Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setShowOverview(true)}
              >
                <LayoutGrid className="mr-1 h-4 w-4" />
                Übersicht
              </Button>
            </div>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
            <div
              className="h-full rounded-full bg-[#002F5D] transition-all"
              style={{ width: `${(scoreSummary.checked / Math.max(questions.length, 1)) * 100}%` }}
            />
          </div>

          <article className="space-y-5 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-base font-medium leading-relaxed text-zinc-900 md:text-lg">
              <span className="mr-2 text-[#002F5D]">#{question.number}</span>
              {question.question.replace(/^\[T\d+_\d+\]\s*/, '')}
            </h2>

            <ul className="space-y-2">
              {question.options.map((opt, optIndex) => {
                const selected = selection[optIndex] === '1';
                const isRight = correctBits[optIndex] === '1';
                let stateClass = 'border-[#e2e8f0] hover:border-[#002F5D]/40 hover:bg-[#f8fafc]';
                if (isChecked) {
                  if (isRight) stateClass = 'border-emerald-400 bg-emerald-50';
                  else if (selected && !isRight) stateClass = 'border-red-300 bg-red-50';
                  else stateClass = 'border-[#e2e8f0] opacity-70';
                } else if (selected) {
                  stateClass = 'border-[#002F5D] bg-[#eef5fb]';
                }

                const optStat = currentStat?.optionCounts?.[optIndex] || 0;
                const optPct =
                  currentStat && currentStat.attempts > 0
                    ? Math.round((optStat / currentStat.attempts) * 100)
                    : null;

                return (
                  <li key={optIndex}>
                    <button
                      type="button"
                      disabled={isChecked}
                      onClick={() => handleSelect(optIndex)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left text-sm transition',
                        stateClass,
                        isChecked && 'cursor-default'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold',
                          selected ? 'bg-[#002F5D] text-white' : 'bg-zinc-100 text-zinc-600'
                        )}
                      >
                        {letter(optIndex)}
                      </span>
                      <span className="flex-1 text-zinc-800">
                        {opt}
                        {isChecked && optPct !== null && currentStat && currentStat.attempts >= 2 && (
                          <span className="mt-1 block text-xs text-zinc-500">
                            {optPct}% der Nutzer haben das gewählt ({optStat}/{currentStat.attempts})
                          </span>
                        )}
                      </span>
                      {isChecked && isRight && (
                        <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      )}
                      {isChecked && selected && !isRight && (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>

            {question.type === 'MC' && !isChecked && (
              <p className="text-xs text-zinc-500">Mehrfachauswahl möglich.</p>
            )}

            {isChecked && (
              <div
                className={cn(
                  'rounded-lg px-3 py-3 text-sm',
                  hasKey && isCorrect(question, selection)
                    ? 'bg-emerald-50 text-emerald-900'
                    : 'bg-amber-50 text-amber-950'
                )}
              >
                {hasKey ? (
                  <p className="font-medium">
                    {isCorrect(question, selection) ? 'Richtig' : 'Nicht ganz'}
                    {!isCorrect(question, selection) && (
                      <span className="font-normal">
                        {' '}
                        — Lösung:{' '}
                        {correctBits
                          .split('')
                          .map((b, i) => (b === '1' ? letter(i) : null))
                          .filter(Boolean)
                          .join(', ')}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="font-medium">Keine gesicherte Lösung hinterlegt.</p>
                )}
                {question.explanation && (
                  <p className="mt-1.5 leading-relaxed text-zinc-700">{question.explanation}</p>
                )}
                {currentStat && currentStat.attempts >= 2 && (
                  <p className="mt-2 text-xs text-zinc-600">
                    Community-Statistik: {Math.round((currentStat.correct / currentStat.attempts) * 100)}%
                    richtig bei {currentStat.attempts} Versuchen
                    {reporting ? ' · aktualisiere…' : ''}
                  </p>
                )}
              </div>
            )}
          </article>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Zurück
            </Button>
            <div className="flex gap-2">
              {!isChecked ? (
                <Button type="button" onClick={() => void handleCheck()} disabled={!selection.includes('1')}>
                  Antwort prüfen
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    if (index >= questions.length - 1) setShowResult(true);
                    else goTo(index + 1);
                  }}
                >
                  {index >= questions.length - 1 ? 'Ergebnis' : 'Weiter'}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Mobile mini-nav */}
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-3 lg:hidden">
            <p className="mb-2 text-xs font-medium text-zinc-500">Schnellnavigation</p>
            <QuestionNav compact />
          </div>
        </div>
      </div>
    </AltfragenShell>
  );
}
