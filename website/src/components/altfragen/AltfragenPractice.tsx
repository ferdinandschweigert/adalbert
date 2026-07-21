'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AltfragenShell } from '@/components/altfragen/AltfragenShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ExamProgress, ParsedQuestion, StoredExam } from '@/lib/altfragenTypes';
import {
  clearProgress,
  createEmptyProgress,
  getExam,
  getProgress,
  saveProgress,
} from '@/lib/altfragenStore';
import { CheckCircle, ChevronLeft, ChevronRight, RotateCcw, XCircle } from 'lucide-react';
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
  if (exclusive) {
    return arr.map((_, i) => (i === index ? '1' : '0')).join('');
  }
  arr[index] = arr[index] === '1' ? '0' : '1';
  return arr.join('');
}

function isCorrect(question: ParsedQuestion, selection: string): boolean {
  const expected = normalizeBits(question.correctAnswers, question.options.length);
  const actual = normalizeBits(selection, question.options.length);
  if (!expected || !expected.includes('1')) return false;
  return expected === actual;
}

function letter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function AltfragenPractice({ examId }: { examId: string }) {
  const router = useRouter();
  const [exam, setExam] = useState<StoredExam | null>(null);
  const [progress, setProgress] = useState<ExamProgress | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => {
    setMounted(true);
    const found = getExam(examId);
    setExam(found);
    if (!found) return;
    const existing = getProgress(examId);
    setProgress(existing ?? createEmptyProgress(examId));
  }, [examId]);

  const persist = useCallback((next: ExamProgress) => {
    setProgress(next);
    saveProgress(next);
  }, []);

  const questions = exam?.questions ?? [];
  const index = progress?.currentIndex ?? 0;
  const question = questions[index];
  const optionCount = question?.options.length ?? 0;
  const selection = normalizeBits(progress?.selections[index], optionCount);
  const isChecked = progress?.checked.includes(index) ?? false;

  const score = useMemo(() => {
    if (!exam || !progress) return { correct: 0, total: 0, wrong: [] as number[] };
    let correct = 0;
    const wrong: number[] = [];
    for (let i = 0; i < exam.questions.length; i++) {
      if (!progress.checked.includes(i)) continue;
      const sel = progress.selections[i] || '';
      if (isCorrect(exam.questions[i], sel)) correct += 1;
      else wrong.push(i);
    }
    return { correct, total: progress.checked.length, wrong };
  }, [exam, progress]);

  if (!mounted) {
    return (
      <AltfragenShell subtitle="Laden…">
        <p className="text-sm text-zinc-500">Lade Klausur…</p>
      </AltfragenShell>
    );
  }

  if (!exam || !progress) {
    return (
      <AltfragenShell subtitle="Nicht gefunden">
        <div className="mx-auto max-w-lg space-y-4 text-center">
          <p className="text-zinc-600">Diese Klausur ist in diesem Browser nicht gespeichert.</p>
          <Button asChild>
            <Link href="/altfragen">Zur Klausurbank</Link>
          </Button>
        </div>
      </AltfragenShell>
    );
  }

  if (questions.length === 0) {
    return (
      <AltfragenShell subtitle={exam.title}>
        <p className="text-zinc-600">Diese Klausur enthält keine Fragen.</p>
      </AltfragenShell>
    );
  }

  const finished = showResult || Boolean(progress.completedAt);

  const goTo = (nextIndex: number) => {
    const clamped = Math.max(0, Math.min(questions.length - 1, nextIndex));
    persist({ ...progress, currentIndex: clamped });
  };

  const handleSelect = (optIndex: number) => {
    if (isChecked) return;
    const exclusive = question.type === 'SC';
    const nextBits = toggleBit(
      selection || emptyBits(optionCount),
      optIndex,
      exclusive
    );
    persist({
      ...progress,
      selections: { ...progress.selections, [index]: nextBits },
    });
  };

  const handleCheck = () => {
    if (!selection.includes('1')) return;
    const checked = progress.checked.includes(index)
      ? progress.checked
      : [...progress.checked, index];
    const isLast = index >= questions.length - 1;
    const allDone = checked.length >= questions.length;
    persist({
      ...progress,
      checked,
      completedAt: allDone ? new Date().toISOString() : progress.completedAt,
      currentIndex: isLast ? index : index,
    });
    if (allDone) setShowResult(true);
  };

  const handleNext = () => {
    if (index < questions.length - 1) {
      goTo(index + 1);
    } else if (progress.checked.length >= questions.length) {
      setShowResult(true);
      persist({ ...progress, completedAt: progress.completedAt || new Date().toISOString() });
    }
  };

  const handleRestart = () => {
    clearProgress(examId);
    const fresh = createEmptyProgress(examId);
    persist(fresh);
    setShowResult(false);
  };

  if (finished) {
    const answeredCorrect = questions.reduce((acc, q, i) => {
      if (!progress.checked.includes(i)) return acc;
      return acc + (isCorrect(q, progress.selections[i] || '') ? 1 : 0);
    }, 0);
    const pct = questions.length
      ? Math.round((answeredCorrect / questions.length) * 100)
      : 0;

    return (
      <AltfragenShell subtitle={exam.title}>
        <div className="mx-auto max-w-xl space-y-6">
          <div className="rounded-xl border border-[#e2e8f0] bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-medium text-[#2C94CC]">Ergebnis</p>
            <p className="mt-2 text-4xl font-bold text-[#002F5D]">{pct}%</p>
            <p className="mt-2 text-zinc-600">
              {answeredCorrect} von {questions.length} richtig
            </p>
          </div>

          {score.wrong.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-zinc-900">Falsche Fragen</h3>
              <ul className="space-y-2">
                {score.wrong.map((i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="w-full rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-left text-sm hover:bg-[#eef5fb]"
                      onClick={() => {
                        setShowResult(false);
                        persist({
                          ...progress,
                          currentIndex: i,
                          completedAt: undefined,
                        });
                      }}
                    >
                      <span className="font-medium text-zinc-800">#{questions[i].number}</span>{' '}
                      <span className="text-zinc-600">
                        {questions[i].question.slice(0, 120)}
                        {questions[i].question.length > 120 ? '…' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleRestart}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Neu starten
            </Button>
            <Button type="button" variant="outline" onClick={() => router.push('/altfragen')}>
              Zur Klausurbank
            </Button>
          </div>
        </div>
      </AltfragenShell>
    );
  }

  const correctBits = normalizeBits(question.correctAnswers, optionCount);
  const hasKey = correctBits.includes('1');

  return (
    <AltfragenShell subtitle={exam.title}>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-zinc-500">
            Frage {index + 1} / {questions.length}
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{question.type}</Badge>
            <span className="text-xs text-zinc-400">
              {progress.checked.length} geprüft
            </span>
          </div>
        </div>

        <div className="h-1.5 overflow-hidden rounded-full bg-[#e2e8f0]">
          <div
            className="h-full rounded-full bg-[#002F5D] transition-all"
            style={{ width: `${((index + 1) / questions.length) * 100}%` }}
          />
        </div>

        <article className="space-y-5 rounded-xl border border-[#e2e8f0] bg-white p-5 shadow-sm md:p-6">
          <h2 className="text-base font-medium leading-relaxed text-zinc-900 md:text-lg">
            <span className="mr-2 text-[#002F5D]">#{question.number}</span>
            {question.question}
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
                    <span className="flex-1 text-zinc-800">{opt}</span>
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

          {question.type === 'KPRIM' && !isChecked && (
            <p className="text-xs text-zinc-500">
              KPRIM: Jede Aussage einzeln anhaken (richtig = ausgewählt).
            </p>
          )}
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
              <Button
                type="button"
                onClick={handleCheck}
                disabled={!selection.includes('1')}
              >
                Antwort prüfen
              </Button>
            ) : (
              <Button type="button" onClick={handleNext}>
                {index >= questions.length - 1 ? 'Ergebnis' : 'Weiter'}
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-center">
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link href="/altfragen">Klausurbank</Link>
          </Button>
        </div>
      </div>
    </AltfragenShell>
  );
}
