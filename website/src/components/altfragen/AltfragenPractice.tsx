'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { AltfragenShell } from '@/components/altfragen/AltfragenShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type {
  ExamProgress,
  OptionRationale,
  ParsedQuestion,
  PracticeMode,
  QuestionStat,
  StoredExam,
} from '@/lib/altfragenTypes';
import {
  clearProgress,
  createEmptyProgress,
  getProgress,
  saveProgress,
} from '@/lib/altfragenStore';
import { recordLocalKreuzung } from '@/lib/altfragenLocalActivity';
import {
  formatOptionLabel,
  mergeQuestionStatsMaps,
  migrateExamLocalData,
} from '@/lib/altfragenLocalMigrate';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  LayoutGrid,
  Loader2,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type QuestionExplanation = {
  explanation: string | null;
  optionRationales: OptionRationale[];
  topicLabel: string | null;
  topicUrl: string | null;
};

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

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}min ${s}s`;
  if (m > 0) return `${m}min ${s}s`;
  return `${s}s`;
}

type NavStatus = 'current' | 'unseen' | 'correct' | 'wrong' | 'done';

export function AltfragenPractice({ examId }: { examId: string }) {
  const [exam, setExam] = useState<StoredExam | null>(null);
  const [progress, setProgress] = useState<ExamProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [showAuswertung, setShowAuswertung] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [communityStats, setCommunityStats] = useState<Record<string, QuestionStat>>({});
  const [reporting, setReporting] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [explanations, setExplanations] = useState<Record<number, QuestionExplanation>>({});
  const [explanationLoading, setExplanationLoading] = useState(false);
  const explanationFetchRef = useRef<Set<number>>(new Set());
  /** Expanded distractor rationales: `${questionNumber}:${optionIndex}` */
  const [expandedDistractors, setExpandedDistractors] = useState<Record<string, boolean>>({});

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
        const nextProgress = existing ?? createEmptyProgress(examId);
        if (!nextProgress.startedAt) {
          nextProgress.startedAt = new Date().toISOString();
          saveProgress(nextProgress);
        }
        if (!nextProgress.checkedAt) nextProgress.checkedAt = {};
        if (!nextProgress.practiceMode) nextProgress.practiceMode = 'learn';
        setProgress(nextProgress);
        if (existing?.completedAt) setShowResult(true);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          const serverStats = (statsData.questionStats || {}) as Record<string, QuestionStat>;
          // Prefer richer attempt history — never let empty/ephemeral server stats wipe local.
          const cacheKey = `adalbert-altfragen-stats-v2-${examId}`;
          try {
            migrateExamLocalData(examId);
            const raw = localStorage.getItem(cacheKey);
            const local = raw ? (JSON.parse(raw) as Record<string, QuestionStat>) : {};
            const merged = mergeQuestionStatsMaps(local, serverStats);
            localStorage.setItem(cacheKey, JSON.stringify(merged));
            setCommunityStats(merged);
          } catch {
            setCommunityStats(serverStats);
          }
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

  useEffect(() => {
    if (!progress?.startedAt || progress.completedAt) return;
    const id = window.setInterval(() => setNowTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [progress?.startedAt, progress?.completedAt]);

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
  const selection = normalizeBits(
    progress?.selections[index] ?? progress?.selections[String(index) as unknown as number],
    optionCount
  );
  const practiceMode: PracticeMode = progress?.practiceMode || 'learn';
  const isExamMode = practiceMode === 'exam';
  const examSubmitted = Boolean(progress?.completedAt);
  /** In Prüfungsmodus: Lösungen erst nach Abgabe. */
  const revealFeedback = !isExamMode || examSubmitted;
  const isChecked = progress?.checked.some((i) => Number(i) === index) ?? false;
  const isAnswered = selection.includes('1');
  /** Feedback / Sperre nur wenn Lösung sichtbar sein soll. */
  const showFeedback = revealFeedback && isChecked;
  /** Vor Abgabe im Prüfungsmodus frei änderbar; sonst nach dem Prüfen gesperrt. */
  const answersLocked = isExamMode && !examSubmitted ? false : isChecked;
  const currentStat = question ? communityStats[String(question.number)] : undefined;
  const embeddedExplanation: QuestionExplanation | undefined = question
    ? question.explanation || question.optionRationales?.length
      ? {
          explanation: question.explanation ?? null,
          optionRationales: question.optionRationales ?? [],
          topicLabel: question.topicLabel ?? null,
          topicUrl: question.topicLabel
            ? `https://next.amboss.com/de/search?q=${encodeURIComponent(question.topicLabel)}`
            : null,
        }
      : undefined
    : undefined;
  const currentExplanation =
    (question ? explanations[question.number] : undefined) ?? embeddedExplanation;

  useEffect(() => {
    if (!exam || !question || !showFeedback) return;
    // Prefer explanations already embedded in the exam payload.
    if (question.explanation || question.optionRationales?.length) return;

    const qNum = question.number;
    if (explanations[qNum] || explanationFetchRef.current.has(qNum)) return;

    const controller = new AbortController();
    explanationFetchRef.current.add(qNum);
    setExplanationLoading(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/altfragen/exams/${examId}/questions/${qNum}/explanation`,
          { cache: 'no-store', signal: controller.signal, credentials: 'same-origin' }
        );
        const data = await res.json();
        if (!res.ok) {
          explanationFetchRef.current.delete(qNum);
          return;
        }
        const payload: QuestionExplanation = {
          explanation: data.explanation ?? null,
          optionRationales: data.optionRationales ?? [],
          topicLabel: data.topicLabel ?? null,
          topicUrl: data.topicUrl ?? null,
        };
        if (!payload.explanation && !payload.optionRationales.length) {
          explanationFetchRef.current.delete(qNum);
          return;
        }
        setExplanations((prev) => ({ ...prev, [qNum]: payload }));
      } catch (err) {
        explanationFetchRef.current.delete(qNum);
        if (err instanceof DOMException && err.name === 'AbortError') return;
      } finally {
        if (!controller.signal.aborted) setExplanationLoading(false);
      }
    })();

    return () => {
      controller.abort();
      // Allow retry after unmount/remount (e.g. React Strict Mode).
      explanationFetchRef.current.delete(qNum);
    };
  }, [exam, examId, question, showFeedback, explanations]);

  const navStatus = useCallback(
    (i: number): NavStatus => {
      if (!progress || !questions[i]) return 'unseen';
      if (i === progress.currentIndex && !showOverview && !showAuswertung && !showResult) return 'current';
      const sel =
        progress.selections[i] ?? progress.selections[String(i) as unknown as number] ?? '';
      const answered = sel.includes('1');
      const locked = progress.checked.some((c) => Number(c) === i);

      // Prüfungsmodus vor Abgabe: nur beantwortet / offen — kein Richtig/Falsch
      if (isExamMode && !examSubmitted) {
        return answered ? 'done' : 'unseen';
      }

      if (!locked) return answered && isExamMode ? 'done' : 'unseen';
      const q = questions[i];
      if (!hasAnswerKey(q)) return 'done';
      return isCorrect(q, sel) ? 'correct' : 'wrong';
    },
    [progress, questions, showOverview, showAuswertung, showResult, isExamMode, examSubmitted]
  );

  const answeredCount = useMemo(() => {
    if (!exam || !progress) return 0;
    let n = 0;
    for (let i = 0; i < exam.questions.length; i++) {
      const sel =
        progress.selections[i] ?? progress.selections[String(i) as unknown as number] ?? '';
      if (sel.includes('1')) n += 1;
    }
    return n;
  }, [exam, progress]);

  const scoreSummary = useMemo(() => {
    if (!exam || !progress) {
      return {
        correct: 0,
        wrong: 0,
        graded: 0,
        checked: 0,
        open: 0,
        elapsedMs: 0,
        avgMs: 0,
      };
    }
    let correct = 0;
    let wrong = 0;
    let graded = 0;
    // In Prüfungsmodus vor Abgabe: noch nicht bewerten
    const shouldGrade = !isExamMode || examSubmitted;
    for (let i = 0; i < exam.questions.length; i++) {
      if (shouldGrade) {
        if (!progress.checked.some((c) => Number(c) === i)) continue;
        if (!hasAnswerKey(exam.questions[i])) continue;
        graded += 1;
        const sel =
          progress.selections[i] ?? progress.selections[String(i) as unknown as number] ?? '';
        if (isCorrect(exam.questions[i], sel)) correct += 1;
        else wrong += 1;
      }
    }
    const startMs = progress.startedAt ? Date.parse(progress.startedAt) : NaN;
    const endMs = progress.completedAt ? Date.parse(progress.completedAt) : nowTick;
    const elapsedMs =
      Number.isFinite(startMs) && Number.isFinite(endMs) ? Math.max(0, endMs - startMs) : 0;
    const checked = shouldGrade ? progress.checked.length : answeredCount;
    return {
      correct,
      wrong,
      graded,
      checked,
      open: exam.questions.length - checked,
      elapsedMs,
      avgMs: checked > 0 ? elapsedMs / checked : 0,
    };
  }, [exam, progress, nowTick, isExamMode, examSubmitted, answeredCount]);

  const goTo = (nextIndex: number) => {
    if (!progress) return;
    const clamped = Math.max(0, Math.min(questions.length - 1, nextIndex));
    setShowResult(false);
    setShowOverview(false);
    setShowAuswertung(false);
    persist({ ...progress, currentIndex: clamped, completedAt: progress.completedAt });
  };

  const commitAnswer = (bits: string) => {
    if (!progress || !question || !bits.includes('1')) return;
    const nowIso = new Date().toISOString();
    const checked = progress.checked.some((c) => Number(c) === index)
      ? progress.checked
      : [...progress.checked, index];
    const allDone = checked.length >= questions.length;
    const nextCheckedAt = { ...(progress.checkedAt || {}), [index]: nowIso };
    persist({
      ...progress,
      startedAt: progress.startedAt || nowIso,
      selections: { ...progress.selections, [index]: bits },
      checked,
      checkedAt: nextCheckedAt,
      completedAt: allDone ? nowIso : progress.completedAt,
    });
    void reportStats(question, bits);
    try {
      recordLocalKreuzung({
        examId,
        correct: isCorrect(question, bits),
      });
    } catch {
      // ignore storage errors
    }
    if (allDone) setShowResult(true);
  };

  const handleSelect = (optIndex: number) => {
    if (!progress || !question || answersLocked) return;
    const exclusive = question.type === 'SC';
    const nextBits = toggleBit(selection || emptyBits(optionCount), optIndex, exclusive);

    // Prüfungsmodus: nur auswählen, keine Lösung zeigen
    if (isExamMode && !examSubmitted) {
      persist({
        ...progress,
        startedAt: progress.startedAt || new Date().toISOString(),
        selections: { ...progress.selections, [index]: nextBits },
      });
      return;
    }

    // SC: Klick = Auswahl + sofort Lösung zeigen
    if (exclusive) {
      commitAnswer(nextBits);
      return;
    }
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
        setCommunityStats((prev) => {
          const next = { ...prev, [String(q.number)]: data.stat as QuestionStat };
          try {
            localStorage.setItem(`adalbert-altfragen-stats-v2-${examId}`, JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }
    } catch {
      // non-blocking
    } finally {
      setReporting(false);
    }
  };

  const handleCheck = () => {
    commitAnswer(selection);
  };

  const handleSetPracticeMode = (mode: PracticeMode) => {
    if (!progress || mode === practiceMode) return;
    if (mode === 'exam') {
      const hasRevealed = progress.checked.length > 0 && !progress.completedAt;
      if (
        hasRevealed &&
        !confirm(
          'Prüfungsmodus aktivieren?\n\nBereits gezeigte Lösungen werden ausgeblendet. Deine Antworten bleiben erhalten.'
        )
      ) {
        return;
      }
      persist({
        ...progress,
        practiceMode: 'exam',
        checked: [],
        checkedAt: {},
        completedAt: undefined,
      });
      setShowResult(false);
      setShowAuswertung(false);
      return;
    }
    // Zurück zu Lernmodus
    persist({
      ...progress,
      practiceMode: 'learn',
      completedAt: undefined,
    });
    setShowResult(false);
  };

  const handleSubmitExam = () => {
    if (!progress || !exam || examSubmitted) return;
    const open = exam.questions.length - answeredCount;
    if (answeredCount === 0) {
      alert('Bitte zuerst mindestens eine Frage beantworten.');
      return;
    }
    if (
      open > 0 &&
      !confirm(
        `${open} Frage${open === 1 ? '' : 'n'} noch offen.\n\nTrotzdem abgeben und Lösungen anzeigen?`
      )
    ) {
      return;
    }
    if (
      open === 0 &&
      !confirm('Klausur abgeben und alle Lösungen anzeigen?')
    ) {
      return;
    }

    const nowIso = new Date().toISOString();
    const checked: number[] = [];
    const checkedAt: Record<number, string> = { ...(progress.checkedAt || {}) };
    for (let i = 0; i < exam.questions.length; i++) {
      const sel =
        progress.selections[i] ?? progress.selections[String(i) as unknown as number] ?? '';
      if (!sel.includes('1')) continue;
      checked.push(i);
      if (!checkedAt[i]) checkedAt[i] = nowIso;
      const q = exam.questions[i];
      void reportStats(q, normalizeBits(sel, q.options.length));
      try {
        recordLocalKreuzung({
          examId,
          correct: isCorrect(q, sel),
        });
      } catch {
        // ignore
      }
    }
    persist({
      ...progress,
      practiceMode: 'exam',
      checked,
      checkedAt,
      completedAt: nowIso,
    });
    setShowOverview(false);
    setShowAuswertung(false);
    setShowResult(true);
  };

  const handleResetQuestion = () => {
    if (!progress) return;
    if (isExamMode && !examSubmitted) {
      if (!isAnswered) return;
      if (
        !confirm(
          `Antwort bei Frage ${index + 1} löschen?\n\nAndere Fragen bleiben unverändert.`
        )
      ) {
        return;
      }
      const nextSelections: Record<number, string> = { ...progress.selections };
      delete nextSelections[index];
      delete nextSelections[String(index) as unknown as number];
      persist({
        ...progress,
        selections: nextSelections,
      });
      return;
    }
    if (!isChecked) return;
    if (
      !confirm(
        `Nur Frage ${index + 1} zurücksetzen?\n\nAndere Fragen bleiben unverändert.`
      )
    ) {
      return;
    }
    const nextSelections: Record<number, string> = { ...progress.selections };
    delete nextSelections[index];
    delete nextSelections[String(index) as unknown as number];
    const nextCheckedAt = { ...(progress.checkedAt || {}) };
    delete nextCheckedAt[index];
    delete nextCheckedAt[String(index) as unknown as number];
    const nextChecked = progress.checked
      .map((i) => Number(i))
      .filter((i) => i !== index);
    persist({
      examId: progress.examId,
      currentIndex: progress.currentIndex,
      startedAt: progress.startedAt,
      practiceMode: progress.practiceMode,
      selections: nextSelections,
      checked: nextChecked,
      checkedAt: nextCheckedAt,
    });
  };

  const handleRestartAll = () => {
    if (
      !confirm(
        'Gesamten Fortschritt dieser Klausur zurücksetzen?\n\nAlle Antworten werden gelöscht.'
      )
    ) {
      return;
    }
    const mode = progress?.practiceMode || 'learn';
    clearProgress(examId);
    persist(createEmptyProgress(examId, mode));
    setShowResult(false);
    setShowOverview(false);
    setShowAuswertung(false);
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
    <div
      className={cn(
        'grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-5',
        compact && 'max-h-56 overflow-y-auto overflow-x-hidden pr-0.5'
      )}
    >
      {questions.map((q, i) => {
        const status = navStatus(i);
        return (
          <button
            key={q.number}
            type="button"
            onClick={() => goTo(i)}
            title={`Frage ${i + 1}`}
            className={cn(
              'flex aspect-square w-full items-center justify-center rounded-md text-xs font-semibold transition',
              status === 'current' &&
                'bg-[#002F5D] text-white outline outline-2 outline-offset-1 outline-[#2C94CC]',
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

  const ModeToggle = ({ className }: { className?: string }) => (
    <div className={cn('rounded-lg border border-[#e2e8f0] bg-[#f8fafc] p-2', className)}>
      <p className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
        Modus
      </p>
      <div className="grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => handleSetPracticeMode('learn')}
          className={cn(
            'rounded-md px-2 py-1.5 text-xs font-medium transition',
            !isExamMode
              ? 'bg-[#002F5D] text-white'
              : 'bg-white text-zinc-600 hover:bg-zinc-50'
          )}
          title="Lösung erscheint direkt nach der Antwort"
        >
          Lernen
        </button>
        <button
          type="button"
          onClick={() => handleSetPracticeMode('exam')}
          className={cn(
            'rounded-md px-2 py-1.5 text-xs font-medium transition',
            isExamMode
              ? 'bg-[#002F5D] text-white'
              : 'bg-white text-zinc-600 hover:bg-zinc-50'
          )}
          title="Lösungen erst nach Abgabe der Klausur"
        >
          Prüfung
        </button>
      </div>
      {isExamMode && !examSubmitted && (
        <p className="mt-1.5 px-0.5 text-[10px] leading-snug text-zinc-500">
          Keine Lösungen bis zur Abgabe.
        </p>
      )}
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
              {scoreSummary.correct} richtig · {scoreSummary.wrong} falsch · {scoreSummary.open} offen
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Zeit: {formatDuration(scoreSummary.elapsedMs)}
              {scoreSummary.checked > 0
                ? ` · Ø ${formatDuration(scoreSummary.avgMs)} / Frage`
                : ''}
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
                <span className="h-3 w-3 rounded bg-amber-400" /> beantwortet
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-zinc-200" /> offen
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={handleRestartAll}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Neu starten
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowResult(false);
                setShowAuswertung(true);
              }}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Auswertung
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

  if (showAuswertung) {
    if (isExamMode && !examSubmitted) {
      return (
        <AltfragenShell subtitle={exam.title}>
          <div className="mx-auto max-w-lg space-y-4 text-center">
            <p className="text-zinc-600">
              Im Prüfungsmodus erscheint die Auswertung erst nach der Abgabe.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button type="button" onClick={handleSubmitExam}>
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Klausur abgeben
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAuswertung(false)}
              >
                Zurück zur Frage
              </Button>
            </div>
          </div>
        </AltfragenShell>
      );
    }
    const pct = scoreSummary.graded
      ? Math.round((scoreSummary.correct / scoreSummary.graded) * 100)
      : 0;
    const wrongPct = scoreSummary.graded
      ? Math.round((scoreSummary.wrong / scoreSummary.graded) * 100)
      : 0;
    return (
      <AltfragenShell subtitle={exam.title}>
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-zinc-900">Auswertung</h2>
              <p className="text-sm text-zinc-500">Statistik zu Richtig / Falsch und Zeit</p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAuswertung(false);
                setShowOverview(false);
              }}
            >
              Zurück zur Frage
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">Richtig</p>
              <p className="mt-1 text-3xl font-bold text-emerald-800">{scoreSummary.correct}</p>
              <p className="text-xs text-emerald-700">{pct}% der bewerteten</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-red-700">Falsch</p>
              <p className="mt-1 text-3xl font-bold text-red-800">{scoreSummary.wrong}</p>
              <p className="text-xs text-red-700">{wrongPct}% der bewerteten</p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Offen</p>
              <p className="mt-1 text-3xl font-bold text-zinc-800">{scoreSummary.open}</p>
              <p className="text-xs text-zinc-500">
                {scoreSummary.checked}/{questions.length} geprüft
              </p>
            </div>
            <div className="rounded-xl border border-[#e2e8f0] bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Zeit</p>
              <p className="mt-1 text-2xl font-bold text-[#002F5D]">
                {formatDuration(scoreSummary.elapsedMs)}
              </p>
              <p className="text-xs text-zinc-500">
                Ø {formatDuration(scoreSummary.avgMs)} / Frage
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-zinc-800">Verteilung</p>
            <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
              <div className="flex h-full w-full">
                <div
                  className="bg-emerald-500 transition-all"
                  style={{
                    width: `${questions.length ? (scoreSummary.correct / questions.length) * 100 : 0}%`,
                  }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{
                    width: `${questions.length ? (scoreSummary.wrong / questions.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> richtig
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> falsch
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-200" /> offen
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-medium text-zinc-800">Fragen — springe zu einer</p>
            <QuestionNav />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowAuswertung(false);
                setShowOverview(true);
              }}
            >
              <LayoutGrid className="mr-2 h-4 w-4" />
              Übersicht
            </Button>
            <Button type="button" variant="ghost" onClick={handleRestartAll}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Neu starten
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
                {isExamMode && !examSubmitted
                  ? `${answeredCount} / ${questions.length} beantwortet · ${formatDuration(scoreSummary.elapsedMs)}`
                  : `${scoreSummary.checked} / ${questions.length} geprüft · ${scoreSummary.correct} richtig · ${scoreSummary.wrong} falsch · ${formatDuration(scoreSummary.elapsedMs)}`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isExamMode && !examSubmitted ? (
                <Button type="button" onClick={handleSubmitExam}>
                  <ClipboardCheck className="mr-1.5 h-4 w-4" />
                  Abgeben
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    setShowOverview(false);
                    setShowAuswertung(true);
                  }}
                >
                  <BarChart3 className="mr-1.5 h-4 w-4" />
                  Auswertung
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => setShowOverview(false)}>
                Zurück zur Frage
              </Button>
            </div>
          </div>
          <ModeToggle className="max-w-xs" />
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
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[240px_1fr]">
        {/* Amboss-style side navigator */}
        <aside className="hidden lg:block">
          <div className="sticky top-6 space-y-3 rounded-xl border border-[#e2e8f0] bg-white p-3 shadow-sm">
            <p className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Fragen
            </p>
            <QuestionNav compact />
            <p className="px-1 text-xs text-zinc-500">
              {isExamMode && !examSubmitted
                ? `${answeredCount}/${questions.length} beantwortet`
                : `${scoreSummary.checked}/${questions.length} · ${scoreSummary.correct} richtig`}
            </p>
            <ModeToggle />
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
            {isExamMode && !examSubmitted ? (
              <Button
                type="button"
                size="sm"
                className="w-full"
                onClick={handleSubmitExam}
              >
                <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                Klausur abgeben
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => setShowAuswertung(true)}
              >
                <BarChart3 className="mr-1.5 h-3.5 w-3.5" />
                Auswertung
              </Button>
            )}
          </div>
        </aside>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-500">
              Frage {index + 1} / {questions.length}
              {isExamMode && !examSubmitted ? (
                <span className="ml-2 rounded-md bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-800">
                  Prüfungsmodus
                </span>
              ) : null}
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
              style={{
                width: `${((isExamMode && !examSubmitted ? answeredCount : scoreSummary.checked) / Math.max(questions.length, 1)) * 100}%`,
              }}
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
                const optionLabel = formatOptionLabel(opt);
                let stateClass = 'border-[#e2e8f0] hover:border-[#002F5D]/40 hover:bg-[#f8fafc]';
                if (showFeedback) {
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
                const rationale = currentExplanation?.optionRationales?.find(
                  (r) => r.index === optIndex
                );
                const distractorKey =
                  question && `${question.number}:${optIndex}`;
                const distractorOpen = distractorKey
                  ? Boolean(expandedDistractors[distractorKey])
                  : false;

                return (
                  <li key={optIndex} className="space-y-1.5">
                    <button
                      type="button"
                      disabled={answersLocked}
                      onClick={() => handleSelect(optIndex)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left text-sm transition',
                        stateClass,
                        answersLocked && 'cursor-default'
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
                      <span
                        className={cn(
                          'min-w-0 flex-1',
                          optionLabel.missing
                            ? 'italic text-zinc-400'
                            : 'text-zinc-800'
                        )}
                      >
                        {optionLabel.text}
                      </span>
                      <span className="mt-0.5 flex shrink-0 items-center gap-2">
                        {showFeedback && optPct !== null && currentStat && currentStat.attempts >= 1 && (
                          <span
                            className="tabular-nums text-xs font-medium text-zinc-500"
                            title={`${optStat} von ${currentStat.attempts} Nutzern`}
                          >
                            {optPct}%
                          </span>
                        )}
                        {showFeedback && isRight && (
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        )}
                        {showFeedback && selected && !isRight && (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </span>
                    </button>
                    {showFeedback && rationale?.text && isRight && (
                      <p className="border-l-2 border-emerald-400 px-3 py-1.5 text-sm leading-relaxed text-emerald-950">
                        {rationale.text}
                      </p>
                    )}
                    {showFeedback && rationale?.text && !isRight && distractorKey && (
                      <div className="border-l-2 border-red-300">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedDistractors((prev) => ({
                              ...prev,
                              [distractorKey]: !prev[distractorKey],
                            }))
                          }
                          className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-xs font-medium text-zinc-600 transition hover:text-zinc-900"
                          aria-expanded={distractorOpen}
                        >
                          <ChevronDown
                            className={cn(
                              'h-3.5 w-3.5 shrink-0 transition-transform',
                              distractorOpen && 'rotate-180'
                            )}
                          />
                          {distractorOpen ? 'Erklärung ausblenden' : 'Warum falsch?'}
                        </button>
                        {distractorOpen && (
                          <p className="px-3 pb-1.5 text-sm leading-relaxed text-zinc-700">
                            {rationale.text}
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {isExamMode && !examSubmitted ? (
              <p className="text-xs text-zinc-500">
                {question.type === 'SC'
                  ? 'Antwort antippen — Lösung erst nach Abgabe.'
                  : 'Mehrfachauswahl möglich — Lösung erst nach Abgabe.'}
              </p>
            ) : question.type !== 'SC' && !isChecked ? (
              <p className="text-xs text-zinc-500">Mehrfachauswahl möglich — danach „Antwort prüfen“.</p>
            ) : question.type === 'SC' && !isChecked ? (
              <p className="text-xs text-zinc-500">Antwort antippen — Lösung erscheint sofort.</p>
            ) : null}

            {showFeedback && (
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
                {currentStat && currentStat.attempts >= 1 && (
                  <p className="mt-2 text-xs text-zinc-600">
                    Community-Statistik: {Math.round((currentStat.correct / currentStat.attempts) * 100)}%
                    richtig bei {currentStat.attempts} Versuchen
                    {reporting ? ' · aktualisiere…' : ''}
                  </p>
                )}
              </div>
            )}

            {showFeedback && explanationLoading && !currentExplanation && (
              <p className="flex items-center gap-2 text-xs text-zinc-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Erklärung wird geladen…
              </p>
            )}

            {showFeedback && currentExplanation?.explanation && (
              <div className="space-y-3 rounded-lg border border-[#cfe0f0] bg-[#f7fbfe] p-4">
                <h3 className="text-sm font-semibold text-[#002F5D]">Erklärung</h3>
                <p className="text-xs text-zinc-500">
                  KI-generiert — bitte kritisch prüfen.
                </p>
                <p className="text-sm leading-relaxed text-zinc-800">
                  {currentExplanation.explanation}
                </p>
                {currentExplanation.topicLabel && currentExplanation.topicUrl && (
                  <a
                    href={currentExplanation.topicUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md border border-[#cfe0f0] bg-white px-3 py-2 text-sm font-medium text-[#002F5D] transition hover:bg-[#e8f1f9]"
                  >
                    <BookOpen className="h-4 w-4" />
                    {currentExplanation.topicLabel}
                  </a>
                )}
              </div>
            )}

            {showFeedback &&
              !explanationLoading &&
              !currentExplanation?.explanation &&
              !(currentExplanation?.optionRationales?.length) && (
                <p className="text-xs text-zinc-500">
                  Für diese Frage ist noch keine Erklärung hinterlegt.
                </p>
              )}
          </article>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 px-2 text-zinc-500 hover:text-zinc-900"
                onClick={handleResetQuestion}
                disabled={isExamMode && !examSubmitted ? !isAnswered : !isChecked}
                title="Nur diese eine Frage zurücksetzen"
                aria-label="Nur diese Frage zurücksetzen"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="text-xs">Frage</span>
              </Button>
            </div>
            <div className="flex gap-2">
              {isExamMode && !examSubmitted ? (
                <>
                  {index >= questions.length - 1 ? (
                    <Button type="button" onClick={handleSubmitExam} disabled={answeredCount === 0}>
                      <ClipboardCheck className="mr-1 h-4 w-4" />
                      Abgeben
                    </Button>
                  ) : (
                    <Button type="button" onClick={() => goTo(index + 1)}>
                      Weiter
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : !isChecked && question.type !== 'SC' ? (
                <Button type="button" onClick={handleCheck} disabled={!selection.includes('1')}>
                  Antwort prüfen
                </Button>
              ) : isChecked ? (
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
              ) : null}
            </div>
          </div>

          {/* Mobile mini-nav */}
          <div className="space-y-3 rounded-xl border border-[#e2e8f0] bg-white p-3 lg:hidden">
            <ModeToggle />
            <p className="text-xs font-medium text-zinc-500">Schnellnavigation</p>
            <QuestionNav compact />
            {isExamMode && !examSubmitted && (
              <Button type="button" className="w-full" size="sm" onClick={handleSubmitExam}>
                <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                Klausur abgeben
              </Button>
            )}
          </div>
        </div>
      </div>
    </AltfragenShell>
  );
}
