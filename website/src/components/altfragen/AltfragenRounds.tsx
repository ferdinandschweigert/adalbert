'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, ChevronDown, XCircle } from 'lucide-react';
import { AltfragenShell } from '@/components/altfragen/AltfragenShell';
import { RoundQuestionExplanation } from '@/components/altfragen/RoundQuestionExplanation';
import { useRoundQuestionExplanation } from '@/components/altfragen/useRoundQuestionExplanation';
import { CrossOutButton, CrossedOption, QuestionAnnotations, QuestionThoughts } from '@/components/altfragen/QuestionAnnotations';
import { Button } from '@/components/ui/button';
import type { ExamProgress, ExamSummary, StoredExam } from '@/lib/altfragenTypes';
import { getProgress } from '@/lib/altfragenStore';
import { verifiedTop100Topic } from '@/lib/altfragenTop100';
import { roundOptionStatus, roundQuestionStatus, type RoundQuestionStatus } from '@/lib/altfragenRoundFeedback';
import { displayText } from '@/lib/altfragenText';
import {
  buildCandidates, candidateGroups, DEFAULT_WEIGHTS, questionKey, readAnnotations, readReview,
  initializeRoundAnnotations, readReviewSettings, saveReview, saveReviewSettings, selectCandidates, shouldPause, yieldReasons, type ReviewGroup, type ReviewSession,
  type YieldWeights,
} from '@/lib/altfragenReview';

const GROUPS: Array<[ReviewGroup, string]> = [
  ['lastWrong', 'Zuletzt falsch'], ['everWrong', 'Jemals falsch'], ['lastRight', 'Zuletzt richtig'],
  ['unseen', 'Noch offen'], ['starred', 'Vorgemerkt'], ['uncertain', 'Unsicher'],
];
const WEIGHTS: Array<[keyof YieldWeights, string]> = [
  ['errors', 'Eigene Fehler'], ['top100', 'Top 100'], ['uncertain', 'Unsicherheit'], ['due', 'Fällige Wiederholung'],
];

function formatSeconds(ms: number): string { return `${Math.ceil(ms / 1000)} s`; }

const QUESTION_STATUS: Record<RoundQuestionStatus, { label: string; style: string }> = {
  unseen: { label: 'offen', style: 'border-slate-200 bg-white text-zinc-700' },
  selected: { label: 'ausgewählt, noch nicht geprüft', style: 'border-sky-300 bg-sky-50 text-sky-900' },
  correct: { label: 'richtig', style: 'border-emerald-400 bg-emerald-100 text-emerald-900' },
  wrong: { label: 'falsch', style: 'border-red-400 bg-red-100 text-red-900' },
  ungraded: { label: 'geprüft, ohne Lösungsschlüssel', style: 'border-amber-400 bg-amber-50 text-amber-900' },
};

const OPTION_STYLE = {
  neutral: 'border-slate-200 bg-white',
  selected: 'border-sky-800 bg-sky-50',
  correct: 'border-emerald-400 bg-emerald-50',
  wrong: 'border-red-400 bg-red-50',
};

export function AltfragenRounds() {
  const [exams, setExams] = useState<StoredExam[]>([]);
  const [progress, setProgress] = useState<Record<string, ExamProgress | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExams, setSelectedExams] = useState<string[] | null>(null);
  const [groups, setGroups] = useState<ReviewGroup[]>([]);
  const [count, setCount] = useState(30);
  const [order, setOrder] = useState<'original' | 'random' | 'priority'>('original');
  const [weights, setWeights] = useState<YieldWeights>(DEFAULT_WEIGHTS);
  const [pauseSeconds, setPauseSeconds] = useState<0 | 30 | 60 | 90 | 120>(60);
  const [highYield, setHighYield] = useState(false);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [answerView, setAnswerView] = useState(false);
  const [expandedRationales, setExpandedRationales] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState(false);
  const [pending, setPending] = useState<{ kind: 'check' | 'go' | 'results'; target?: number } | null>(null);
  const [revision, setRevision] = useState(0);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  useEffect(() => {
    const saved = readReviewSettings();
    if (saved) {
      setSelectedExams(saved.selectedExams);
      setGroups(saved.groups);
      setCount(saved.count);
      setOrder(saved.order);
      setWeights(saved.weights);
      setPauseSeconds(saved.pauseSeconds);
      setHighYield(saved.highYield);
    }
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded || selectedExams === null) return;
    saveReviewSettings({ selectedExams, groups, count, order, weights, pauseSeconds, highYield });
  }, [settingsLoaded, selectedExams, groups, count, order, weights, pauseSeconds, highYield]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const listRes = await fetch('/api/altfragen/exams');
        if (!listRes.ok) throw new Error('Klausuren konnten nicht geladen werden');
        const data = await listRes.json() as { exams: ExamSummary[] };
        const published = (data.exams || []).filter((e) => e.published);
        const loaded = await Promise.all(published.map(async (item) => {
          const res = await fetch(`/api/altfragen/exams/${item.id}`, { cache: 'no-store' });
          if (!res.ok) throw new Error(`${item.title} konnte nicht geladen werden`);
          return (await res.json() as { exam: StoredExam }).exam;
        }));
        if (cancelled) return;
        setExams(loaded);
        setSelectedExams((previous) => previous === null ? loaded.map((e) => e.id) : previous);
        setProgress(Object.fromEntries(loaded.map((e) => [e.id, getProgress(e.id)])));
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause)); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const update = () => setRevision((n) => n + 1);
    window.addEventListener('adalbert-annotations-changed', update);
    return () => window.removeEventListener('adalbert-annotations-changed', update);
  }, []);

  const review = useMemo(() => typeof window === 'undefined' ? { attempts: [], sessions: [] } : readReview(), [revision, session?.id]);
  const topicMap = useMemo(() => Object.fromEntries(exams.flatMap((exam) => exam.questions.flatMap((question) => {
    const topic = verifiedTop100Topic(exam.id, question.number, question.topicLabel);
    return topic ? [[questionKey(exam.id, question.number), topic]] : [];
  }))), [exams]);
  const candidates = useMemo(() => buildCandidates(exams, progress, readAnnotations(), review.attempts, topicMap), [exams, progress, review.attempts, topicMap, revision]);
  const candidatesByKey = useMemo(() => new Map(candidates.map((candidate) => [questionKey(candidate.examId, candidate.question.number), candidate])), [candidates]);
  const available = useMemo(() => candidates.filter((c) => selectedExams?.includes(c.examId)), [candidates, selectedExams]);
  const selected = useMemo(() => selectCandidates(available, groups, count, order, weights), [available, groups, count, order, weights]);
  const currentRef = session?.questions[session.currentIndex];
  const current = currentRef && candidatesByKey.get(questionKey(currentRef.examId, currentRef.questionNumber));
  const key = currentRef ? questionKey(currentRef.examId, currentRef.questionNumber) : '';
  const selectedBits = session?.selections[key] || '';
  const checked = session?.checked.includes(key) || false;
  const activeMs = session?.activeMs[key] || 0;
  const requiredMs = (session?.pauseSeconds || 0) * 1000;
  const currentStatus = roundQuestionStatus(current?.question, selectedBits, checked);
  const { explanation, error: explanationError, retry: retryExplanation } = useRoundQuestionExplanation(current?.examId, exams.find((exam) => exam.id === current?.examId)?.updatedAt || '', current?.question.number, checked && answerView);
  const roundStatuses = session ? Object.fromEntries(session.questions.map((ref) => {
    const itemKey = questionKey(ref.examId, ref.questionNumber);
    return [itemKey, roundQuestionStatus(candidatesByKey.get(itemKey)?.question, session.selections[itemKey], session.checked.includes(itemKey))];
  })) : {};
  const results = Object.values(roundStatuses).reduce((total, status) => {
    total[status] += 1;
    return total;
  }, { unseen: 0, selected: 0, correct: 0, wrong: 0, ungraded: 0 });

  const persistSession = useCallback((next: ReviewSession) => {
    const store = readReview();
    saveReview({ ...store, sessions: store.sessions.map((item) => item.id === next.id ? next : item) });
    setSession(next);
  }, []);

  const sessionId = session?.id;
  useEffect(() => {
    if (!sessionId || showResults) return;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const delta = Math.min(1000, Math.max(0, now - last));
      last = now;
      if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
      setSession((previous) => {
        if (!previous) return previous;
        const currentKey = questionKey(previous.questions[previous.currentIndex].examId, previous.questions[previous.currentIndex].questionNumber);
        const next = { ...previous, activeMs: { ...previous.activeMs, [currentKey]: (previous.activeMs[currentKey] || 0) + delta } };
        const store = readReview();
        saveReview({ ...store, sessions: store.sessions.map((item) => item.id === next.id ? next : item) });
        return next;
      });
    };
    const resetClock = () => { last = performance.now(); };
    const timer = window.setInterval(tick, 500);
    document.addEventListener('visibilitychange', resetClock);
    window.addEventListener('focus', resetClock);
    window.addEventListener('blur', resetClock);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', resetClock); window.removeEventListener('focus', resetClock); window.removeEventListener('blur', resetClock); };
  }, [sessionId, showResults]);

  const execute = useCallback((action: { kind: 'check' | 'go' | 'results'; target?: number }) => {
    if (!session || !current) return;
    if (action.kind === 'check') {
      if (!selectedBits.includes('1') || checked) return;
      const status = roundQuestionStatus(current.question, selectedBits, true);
      const correct = status === 'ungraded' ? null : status === 'correct';
      const next = { ...session, checked: [...session.checked, key] };
      const store = readReview();
      saveReview({ ...store,
        attempts: [...store.attempts, { sessionId: session.id, examId: current.examId, questionNumber: current.question.number, selection: selectedBits, correct, at: new Date().toISOString() }],
        sessions: store.sessions.map((item) => item.id === session.id ? next : item),
      });
      setSession(next);
      setAnswerView(true);
      setRevision((n) => n + 1);
    } else if (action.kind === 'go' && action.target !== undefined) {
      persistSession({ ...session, currentIndex: action.target });
      const nextRef = session.questions[action.target];
      setAnswerView(session.checked.includes(questionKey(nextRef.examId, nextRef.questionNumber)));
      setShowResults(false);
    } else if (action.kind === 'results') setShowResults(true);
    setPending(null);
  }, [session, current, selectedBits, checked, key, persistSession]);

  const requestAction = useCallback((action: { kind: 'check' | 'go' | 'results'; target?: number }) => {
    if (!session) return;
    if (shouldPause(action, session.currentIndex, activeMs, session.pauseSeconds)) setPending(action);
    else execute(action);
  }, [session, activeMs, execute]);

  useEffect(() => {
    if (!session || showResults) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('input,textarea,select,[contenteditable=true]') || pending) return;
      if (event.key === 'ArrowRight' && session.currentIndex < session.questions.length - 1) {
        event.preventDefault(); requestAction({ kind: 'go', target: session.currentIndex + 1 });
      } else if (event.key === 'ArrowLeft' && session.currentIndex > 0) {
        event.preventDefault(); requestAction({ kind: 'go', target: session.currentIndex - 1 });
      } else if (event.key === 'Enter' && !target.closest('button,a') && !checked && selectedBits.includes('1')) {
        event.preventDefault(); requestAction({ kind: 'check' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [session, showResults, pending, checked, selectedBits, requestAction]);

  const startRound = () => {
    if (!selected.length) return;
    const next: ReviewSession = {
      id: crypto.randomUUID(), title: highYield ? 'High Yield' : 'Eigene Fragerunde',
      annotationScope: 'round',
      questions: selected.map((c) => ({ examId: c.examId, questionNumber: c.question.number })),
      currentIndex: 0, selections: {}, checked: [], activeMs: {}, pauseSeconds, weights,
      createdAt: new Date().toISOString(),
    };
    const store = readReview();
    saveReview({ ...store, sessions: [...store.sessions, next] });
    setSession(next);
    setShowResults(false);
    setAnswerView(false);
  };

  const resume = (saved: ReviewSession) => { persistSession(initializeRoundAnnotations(saved)); setShowResults(false); setAnswerView(saved.checked.includes(questionKey(saved.questions[saved.currentIndex].examId, saved.questions[saved.currentIndex].questionNumber))); };
  const savedSessions = review.sessions;

  return <AltfragenShell><div className="mx-auto max-w-4xl space-y-6 p-4">
    <div className="flex items-center justify-between gap-3"><div><p className="text-sm text-sky-700">Klausurvorbereitung</p><h1 className="text-2xl font-bold">{session ? session.title : 'Eigene Fragerunden'}</h1></div><Link className="text-sm text-sky-800 underline" href="/altfragen">Klausurübersicht</Link></div>
    {loading && <p>Klausuren laden…</p>}
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {!loading && !session && <>
      <section className="space-y-4 rounded-xl border bg-white p-5">
        <div className="flex flex-wrap gap-2"><Button variant={highYield ? 'outline' : 'default'} onClick={() => { setHighYield(false); setOrder('original'); }}>Eigene Runde</Button><Button variant={highYield ? 'default' : 'outline'} onClick={() => { setHighYield(true); setOrder('priority'); setGroups([]); }}>High Yield</Button></div>
        <fieldset><legend className="mb-2 font-semibold">Klausuren</legend><div className="flex flex-wrap gap-3">{exams.map((exam) => <label key={exam.id} className="text-sm"><input type="checkbox" checked={Boolean(selectedExams?.includes(exam.id))} onChange={() => setSelectedExams((ids) => (ids || []).includes(exam.id) ? (ids || []).filter((id) => id !== exam.id) : [...(ids || []), exam.id])} /> {exam.title}</label>)}</div></fieldset>
        {!highYield && <fieldset><legend className="mb-2 font-semibold">Statusgruppen (Auswahl wird vereinigt)</legend><div className="grid gap-2 sm:grid-cols-2">{GROUPS.map(([id, label]) => <label key={id} className="text-sm"><input type="checkbox" checked={groups.includes(id)} onChange={() => setGroups((old) => old.includes(id) ? old.filter((g) => g !== id) : [...old, id])} /> {label} <span className="text-zinc-500">({available.filter((c) => candidateGroups(c).includes(id)).length})</span></label>)}</div><p className="mt-2 text-xs text-zinc-500">Ohne Statusauswahl sind alle Fragen enthalten.</p></fieldset>}
        <div className="grid gap-4 sm:grid-cols-3"><label className="text-sm">Fragenzahl<input className="mt-1 w-full rounded border p-2" type="number" min={1} max={available.length} value={count} onChange={(e) => setCount(Number(e.target.value))} /></label><label className="text-sm">Reihenfolge<select className="mt-1 w-full rounded border p-2" value={order} onChange={(e) => setOrder(e.target.value as typeof order)}><option value="original">Klausurreihenfolge</option><option value="random">Zufällig</option><option value="priority">Priorität</option></select></label><label className="text-sm">Denkpause pro Frage<select className="mt-1 w-full rounded border p-2" value={pauseSeconds} onChange={(e) => setPauseSeconds(Number(e.target.value) as typeof pauseSeconds)}>{[0, 30, 60, 90, 120].map((seconds) => <option key={seconds} value={seconds}>{seconds ? `${seconds} Sekunden` : 'Aus'}</option>)}</select></label></div>
        {(highYield || order === 'priority') && <fieldset><legend className="mb-2 font-semibold">High Yield Gewichtung</legend><div className="grid gap-3 sm:grid-cols-2">{WEIGHTS.map(([id, label]) => <label key={id} className="text-sm">{label}: {weights[id]}<input className="w-full" type="range" min={0} max={3} value={weights[id]} onChange={(e) => setWeights((old) => ({ ...old, [id]: Number(e.target.value) }))} /></label>)}</div><p className="text-xs text-zinc-500">Top-100-Bonus nur bei geprüfter Zuordnung; unklare Themen bleiben ohne Bonus.</p></fieldset>}
        <p className="text-sm text-zinc-600">{selected.length} Fragen in der Runde. Eigene Runden ändern den ursprünglichen Klausurfortschritt nicht.</p>
        <Button onClick={startRound} disabled={!selected.length}>Runde starten</Button>
      </section>
      {!!savedSessions.length && <section className="space-y-2"><h2 className="font-semibold">Gespeicherte Runden</h2>{savedSessions.slice().reverse().slice(0, 8).map((saved) => <button key={saved.id} className="block w-full rounded border bg-white p-3 text-left text-sm hover:bg-zinc-50" onClick={() => resume(saved)}>{saved.title} · {saved.checked.length}/{saved.questions.length} geprüft · {new Date(saved.createdAt).toLocaleDateString('de-DE')}</button>)}</section>}
    </>}
    {session && showResults && <section className="space-y-3 rounded-xl border bg-white p-5">
      <h2 className="text-xl font-semibold">Rundenergebnis</h2>
      <p>{session.checked.length} von {session.questions.length} Fragen geprüft.</p>
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">{results.correct} richtig</span>
        <span className="rounded-lg bg-red-50 px-3 py-2 text-red-900">{results.wrong} falsch</span>
        {!!results.ungraded && <span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">{results.ungraded} ohne Schlüssel</span>}
        {!!(results.unseen + results.selected) && <span className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">{results.unseen + results.selected} noch nicht geprüft</span>}
      </div>
      <Button onClick={() => setShowResults(false)}>Zur Runde</Button><Button variant="outline" onClick={() => setSession(null)}>Neue Runde erstellen</Button>
    </section>}
    {session && current && !showResults && <>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span>Frage {session.currentIndex + 1} von {session.questions.length} · {exams.find((e) => e.id === current.examId)?.title}</span><span>Aktive Zeit: {formatSeconds(activeMs)} / {session.pauseSeconds ? `${session.pauseSeconds} s` : 'ohne Denkpause'}</span></div>
      <nav className="flex flex-wrap gap-2" aria-label="Fragennavigation">{session.questions.map((ref, i) => {
        const itemKey = questionKey(ref.examId, ref.questionNumber);
        const status = roundStatuses[itemKey];
        return <button key={`${itemKey}-${i}`} type="button" aria-label={`Frage ${i + 1}, ${QUESTION_STATUS[status].label}`} title={`Frage ${i + 1}: ${QUESTION_STATUS[status].label}`} aria-current={i === session.currentIndex ? 'step' : undefined} data-result={status} className={`min-w-9 rounded border p-2 text-sm ${QUESTION_STATUS[status].style} ${i === session.currentIndex ? 'ring-2 ring-sky-900 ring-offset-1' : ''}`} onClick={() => requestAction({ kind: 'go', target: i })}>{i + 1}</button>;
      })}</nav>
      <p className="text-xs text-zinc-500">Grün: richtig · Rot: falsch · Blau: noch nicht geprüft · Gelb: ohne Lösungsschlüssel. Der Rahmen zeigt die aktuelle Frage.</p>
      <article className="space-y-4 rounded-xl border bg-white p-5"><QuestionAnnotations examId={current.examId} number={current.question.number} roundId={session.id} text={current.question.question.replace(/^\[T\d+_\d+\]\s*/, '')} />
        <ul className="space-y-2">{current.question.options.map((option, i) => {
          const bits = selectedBits.padEnd(current.question.options.length, '0');
          const status = roundOptionStatus(current.question, bits, i, checked && answerView);
          const rationale = explanation?.optionRationales.find((item) => item.index === i);
          const rationaleKey = `${session.id}:${key}:${i}`;
          const expanded = expandedRationales[rationaleKey] ?? (status === 'correct' || bits[i] === '1');
          const feedback = checked && answerView;
          const rationaleLabel = status === 'correct' ? bits[i] === '1' ? 'Richtig · deine Auswahl' : 'Richtige Antwort' : status === 'wrong' ? 'Deine Auswahl – warum sie nicht passt' : current.question.correctAnswers?.includes('1') ? 'Warum diese Alternative nicht passt' : 'Hinweise zu dieser Option';
          return <li key={i} className="space-y-1.5">
            <div className="relative">
            <button type="button" disabled={checked && !answerView} title={feedback ? `Erklärung zu Antwort ${String.fromCharCode(65 + i)} öffnen` : undefined} aria-expanded={feedback && rationale?.text ? expanded : undefined} aria-controls={feedback && rationale?.text ? `round-option-explanation-${i}` : undefined} data-option-result={status} className={`flex min-h-14 w-full min-w-0 items-start gap-2 rounded-lg border py-3 pl-3 pr-14 text-left text-sm ${OPTION_STYLE[status]}`} onClick={() => {
              if (checked && answerView) {
                setExpandedRationales((previous) => ({ ...previous, [rationaleKey]: true }));
                return;
              }
              const nextBits = current.question.type === 'SC' ? bits.split('').map((_, n) => n === i ? '1' : '0').join('') : bits.split('').map((b, n) => n === i ? b === '1' ? '0' : '1' : b).join('');
              persistSession({ ...session, selections: { ...session.selections, [key]: nextBits } });
            }}>
              <strong className="shrink-0">{String.fromCharCode(65 + i)}.</strong>
              <span className="min-w-0 flex-1"><CrossedOption examId={current.examId} number={current.question.number} roundId={session.id} optionIndex={i}>{option || 'Nicht im Protokoll überliefert'}</CrossedOption></span>
              {status === 'correct' && <span className="shrink-0 text-emerald-600"><CheckCircle className="h-4 w-4" aria-hidden /><span className="sr-only">Richtige Antwort</span></span>}
              {status === 'wrong' && <span className="shrink-0 text-red-600"><XCircle className="h-4 w-4" aria-hidden /><span className="sr-only">Falsch gewählte Antwort</span></span>}
            </button>
            <CrossOutButton examId={current.examId} number={current.question.number} roundId={session.id} optionIndex={i} integrated />
            </div>
            {feedback && rationale?.text && <div className={`ml-3 border-l-2 ${status === 'correct' ? 'border-emerald-300' : status === 'wrong' ? 'border-red-300' : 'border-slate-200'}`}>
              <button type="button" aria-expanded={expanded} aria-controls={`round-option-explanation-${i}`} className={`flex w-full items-start gap-1.5 px-3 py-1.5 text-left text-xs font-medium ${status === 'correct' ? 'text-emerald-800' : status === 'wrong' ? 'text-red-800' : 'text-zinc-600'}`} onClick={() => setExpandedRationales((previous) => ({ ...previous, [rationaleKey]: !expanded }))}>
                <ChevronDown className={`mt-0.5 h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
                {rationaleLabel}<span className="sr-only"> – {expanded ? 'Erklärung ausblenden' : 'Erklärung öffnen'}</span>
              </button>
              <div id={`round-option-explanation-${i}`} role="region" aria-label={`Erklärung zu Antwort ${String.fromCharCode(65 + i)}`} hidden={!expanded} className="space-y-2 px-3 pb-3">
                <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">{displayText(rationale.text)}</p>
                {!!rationale.links?.length && <div className="flex flex-wrap gap-x-4 gap-y-2">{rationale.links.filter((link) => /^https?:\/\//i.test(link.url)).map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-800 underline underline-offset-2">{displayText(link.label)}</a>)}</div>}
              </div>
            </div>}
          </li>;
        })}</ul>
        {checked && answerView && <>
          <div role="status" className={`rounded-lg p-3 text-sm ${currentStatus === 'correct' ? 'bg-emerald-50 text-emerald-900' : currentStatus === 'wrong' ? 'bg-red-50 text-red-900' : 'bg-amber-50 text-amber-900'}`}>
            <strong>{currentStatus === 'correct' ? 'Richtig beantwortet' : currentStatus === 'wrong' ? 'Falsch beantwortet' : 'Keine gesicherte Lösung'}</strong>
            {current.question.correctAnswers?.includes('1') && <p className="mt-1">Lösung: {current.question.correctAnswers.split('').map((bit, i) => bit === '1' ? String.fromCharCode(65 + i) : '').filter(Boolean).join(', ')}</p>}
          </div>
          <RoundQuestionExplanation question={current.question} explanation={explanation} error={explanationError} onRetry={retryExplanation} />
        </>}
        <div className="rounded bg-amber-50 p-3 text-xs">High Yield: {yieldReasons(current, session.weights || weights).map((r) => `${r.text} (+${r.points})`).join(' · ') || 'Keine persönlichen Prioritätssignale'}</div>
        <QuestionThoughts examId={current.examId} number={current.question.number} />
      </article>
      <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={session.currentIndex === 0} onClick={() => requestAction({ kind: 'go', target: session.currentIndex - 1 })}>Zurück</Button><Button disabled={checked || !selectedBits.includes('1')} onClick={() => requestAction({ kind: 'check' })}>Prüfen</Button>{session.currentIndex < session.questions.length - 1 ? <Button variant="outline" onClick={() => requestAction({ kind: 'go', target: session.currentIndex + 1 })}>Weiter</Button> : <Button variant="outline" onClick={() => requestAction({ kind: 'results' })}>Ergebnis</Button>}</div>
      <Button variant="ghost" onClick={() => setSession(null)}>Rundenübersicht</Button>
    </>}
    {pending && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Denkpause"><div className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"><h2 className="text-xl font-semibold">Denkpause</h2><p>Bleib noch {formatSeconds(Math.max(0, requiredMs - activeMs))} bei dieser Frage. Überlege, warum die anderen Antworten weniger gut passen.</p><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setPending(null)}>Weiter nachdenken</Button><Button onClick={() => execute(pending)}>{pending.kind === 'check' ? 'Lösung trotzdem freigeben' : 'Trotzdem weitergehen'}</Button></div></div></div>}
  </div></AltfragenShell>;
}
