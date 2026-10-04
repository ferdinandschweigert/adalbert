'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AltfragenShell } from './AltfragenShell';
import { getProgress } from '@/lib/altfragenStore';
import { readReview } from '@/lib/altfragenReview';
import { buildKreuzInsights, type InsightRow, type InsightStatus } from '@/lib/altfragenInsights';
import type { ExamSummary, StoredExam } from '@/lib/altfragenTypes';

type Insights = ReturnType<typeof buildKreuzInsights>;
type StatusFilter = 'alle' | InsightStatus;

const STATUS_LABEL: Record<InsightStatus, string> = {
  richtig: 'Richtig',
  falsch: 'Falsch',
  'ohne-schluessel': 'Ohne Lösungsschlüssel',
  ausstehend: 'Noch nicht geprüft',
  offen: 'Offen',
};

function analysisText(rows: InsightRow[]): string {
  return rows.map((row) => [
    `${row.examTitle} · Frage ${row.questionNumber} · ${STATUS_LABEL[row.status]}${row.topic ? ` · ${row.topic}` : ''}`,
    row.question,
    `Meine Antwort: ${row.selected}`,
    `Lösung: ${row.solution}`,
    row.repeats ? `Wiederholungen: ${row.repeats}; zuletzt ${row.lastRepeat}` : '',
  ].filter(Boolean).join('\n')).join('\n\n');
}

export function AltfragenInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [error, setError] = useState('');
  const [examFilter, setExamFilter] = useState('alle');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('falsch');
  const [search, setSearch] = useState('');
  const [showText, setShowText] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const listResponse = await fetch('/api/altfragen/exams', { credentials: 'same-origin' });
        if (!listResponse.ok) throw new Error('Klausuren konnten nicht geladen werden.');
        const list = await listResponse.json() as { exams: ExamSummary[] };
        const responses = await Promise.all(list.exams.map(async (summary) => {
          const response = await fetch(`/api/altfragen/exams/${encodeURIComponent(summary.id)}`, { credentials: 'same-origin' });
          if (!response.ok) throw new Error(`${summary.title} konnte nicht geladen werden.`);
          const body = await response.json() as { exam: StoredExam };
          return body.exam;
        }));
        if (cancelled) return;
        const progress = Object.fromEntries(responses.map((exam) => [exam.id, getProgress(exam.id)]));
        setData(buildKreuzInsights(responses, progress, readReview().attempts));
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    const query = search.trim().toLocaleLowerCase('de-DE');
    return data.rows.filter((row) =>
      (examFilter === 'alle' || row.examId === examFilter) &&
      (statusFilter === 'alle' || row.status === statusFilter) &&
      (!query || `${row.question} ${row.topic} ${row.selected} ${row.solution}`.toLocaleLowerCase('de-DE').includes(query))
    );
  }, [data, examFilter, statusFilter, search]);

  const totals = useMemo(() => data?.exams.reduce((acc, exam) => ({
    checked: acc.checked + exam.checked,
    right: acc.right + exam.right,
    wrong: acc.wrong + exam.wrong,
    ungraded: acc.ungraded + exam.ungraded,
  }), { checked: 0, right: 0, wrong: 0, ungraded: 0 }), [data]);

  return (
    <AltfragenShell subtitle="Meine Auswertung">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="space-y-2">
          <Link href="/altfragen" className="text-sm text-sky-700 hover:underline">← Zu den Klausuren</Link>
          <h1 className="text-2xl font-bold text-zinc-900 md:text-3xl">Meine Kreuz-Auswertung</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-zinc-600">
            Die Antworten werden nur in diesem Browser gelesen. Deine Klausurantworten, Wiederholungen und Notizen
            werden nicht an den Server gesendet. Die Lösung erscheint bei geprüften Fragen und nach Abgabe im Prüfungsmodus.
          </p>
        </header>

        {!data && !error && <p role="status" className="text-zinc-600">Klausuren und lokalen Fortschritt laden …</p>}
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}

        {data && totals && <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Kreuzergebnis">
            {[
              ['Geprüft', totals.checked], ['Richtig', totals.right],
              ['Falsch', totals.wrong], ['Ohne Schlüssel', totals.ungraded],
            ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-zinc-500">{label}</p><p className="mt-1 text-2xl font-semibold text-zinc-900">{value}</p>
            </div>)}
          </div>

          <section aria-labelledby="exams-title" className="space-y-3">
            <h2 id="exams-title" className="text-lg font-semibold text-zinc-900">Klausuren</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {data.exams.map((exam) => <div key={exam.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-zinc-900">{exam.title}</strong>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    {exam.completed ? 'Vollständig gekreuzt' : `${exam.checked}/${exam.total} geprüft`}
                  </span>
                </div>
                <p className="mt-2 text-sm text-zinc-600">{exam.right} richtig · {exam.wrong} falsch · {exam.ungraded} ohne Schlüssel{exam.pending ? ` · ${exam.pending} ausstehend` : ''}</p>
              </div>)}
            </div>
          </section>

          <section aria-labelledby="questions-title" className="space-y-4">
            <div>
              <h2 id="questions-title" className="text-lg font-semibold text-zinc-900">Fragen und Lösungen</h2>
              <p className="text-sm text-zinc-500">Ergebnisse stammen aus der ursprünglichen Klausur. Wiederholungen stehen getrennt dabei.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_2fr]">
              <label className="text-sm text-zinc-700">Klausur
                <select value={examFilter} onChange={(event) => setExamFilter(event.target.value)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2">
                  <option value="alle">Alle Klausuren</option>
                  {data.exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.title}</option>)}
                </select>
              </label>
              <label className="text-sm text-zinc-700">Status
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)} className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2">
                  <option value="alle">Alle Fragen</option>
                  {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="text-sm text-zinc-700">Suche nach Frage, Thema oder Antwort
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="z. B. Diabetes" className="mt-1 block w-full rounded-md border border-slate-300 bg-white p-2" />
              </label>
            </div>
            <p role="status" className="text-sm text-zinc-500">{filteredRows.length} Fragen in dieser Ansicht</p>
            <button type="button" onClick={() => setShowText((value) => !value)} className="rounded-md border border-sky-300 px-3 py-2 text-sm font-medium text-sky-800 hover:bg-sky-50" aria-expanded={showText}>
              {showText ? 'Textansicht schließen' : 'Textansicht für Browser-Assistenten öffnen'}
            </button>
            {showText && <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="mb-3 text-sm text-zinc-600">Die gefilterten Antworten und Lösungen stehen hier direkt als lesbarer Text. Du kannst sie auch kopieren.</p>
              <pre className="max-h-[32rem] overflow-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-800" data-testid="kreuz-analysis-text">{analysisText(filteredRows)}</pre>
            </div>}
            <div className="space-y-3">
              {filteredRows.map((row) => <article key={`${row.examId}:${row.questionNumber}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>{row.examTitle} · Frage {row.questionNumber}</span>
                  <span className={`rounded-full px-2 py-0.5 font-medium ${row.status === 'falsch' ? 'bg-red-100 text-red-800' : row.status === 'richtig' ? 'bg-green-100 text-green-800' : 'bg-slate-100 text-slate-700'}`}>{STATUS_LABEL[row.status]}</span>
                  {row.topic && <span>· {row.topic}</span>}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-900">{row.question}</p>
                {row.status !== 'offen' && <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <p className="rounded-md bg-slate-50 p-3"><strong>Meine Antwort:</strong> {row.selected}</p>
                  <p className="rounded-md bg-sky-50 p-3"><strong>Lösung:</strong> {row.solution}</p>
                </div>}
                {row.repeats > 0 && <p className="mt-2 text-xs text-zinc-500">{row.repeats} Wiederholung{row.repeats === 1 ? '' : 'en'} · zuletzt {row.lastRepeat}</p>}
              </article>)}
            </div>
          </section>
        </>}
      </div>
    </AltfragenShell>
  );
}
