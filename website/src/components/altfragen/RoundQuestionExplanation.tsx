'use client';

import { useEffect, useRef, useState } from 'react';
import { BookOpen, ChevronDown, Loader2 } from 'lucide-react';
import type { ExplanationMeta, OptionRationale, ParsedQuestion } from '@/lib/altfragenTypes';
import { displayText } from '@/lib/altfragenText';

type Explanation = {
  explanation: string | null;
  optionRationales: OptionRationale[];
  topicLabel: string | null;
  topicUrl: string | null;
  explanationMeta: ExplanationMeta | null;
};

// Contains public question explanations only, never answers, notes or progress.
const cache = new Map<string, Explanation>();

export function RoundQuestionExplanation({ examId, examVersion, question, selection, openOption }: {
  examId: string;
  examVersion: string;
  question: ParsedQuestion;
  selection: string;
  openOption?: { optionIndex: number; sequence: number };
}) {
  const cacheKey = `${examId}:${examVersion}:${question.number}`;
  const [explanation, setExplanation] = useState<Explanation | null>(() => cache.get(cacheKey) || null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const optionDetails = useRef<Record<number, HTMLDetailsElement | null>>({});

  useEffect(() => {
    if (cache.has(cacheKey)) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/altfragen/exams/${encodeURIComponent(examId)}/questions/${question.number}/explanation`, {
          credentials: 'same-origin', signal: controller.signal,
        });
        if (!response.ok) throw new Error('Die Erklärung konnte nicht geladen werden.');
        const body = await response.json() as Explanation;
        if (controller.signal.aborted) return;
        const result: Explanation = {
          explanation: body.explanation || null,
          optionRationales: body.optionRationales || [],
          topicLabel: body.topicLabel || null,
          topicUrl: body.topicUrl || null,
          explanationMeta: body.explanationMeta || null,
        };
        cache.set(cacheKey, result);
        setExplanation(result);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : String(cause));
      }
    }
    void load();
    return () => controller.abort();
  }, [cacheKey, examId, question.number, retry]);

  useEffect(() => {
    if (!openOption) return;
    const detail = optionDetails.current[openOption.optionIndex];
    if (!detail) return;
    detail.open = true;
    detail.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [explanation, openOption]);

  const hasKey = Boolean(question.correctAnswers?.includes('1'));
  const source = explanation?.explanationMeta?.source === 'llm' || explanation?.explanationMeta?.source === 'cursor'
    ? 'KI-generierte Erläuterung – bitte kritisch prüfen.'
    : question.answerSource === 'kreuzversion'
      ? 'Fachliche Einschätzung aus der Kreuzversion; keine offizielle IMPP-Lösung.'
      : question.answerSource === 'protocol'
        ? 'Lösung aus dem Gedächtnisprotokoll.'
        : question.answerSource === 'ai' ? 'KI-generierte Lösung – bitte kritisch prüfen.' : '';

  return <section className="space-y-4 rounded-xl border border-sky-200 bg-sky-50/50 p-4 sm:p-5" aria-label="Erklärung und Lösungsweg">
    <div>
      <h3 className="text-base font-semibold text-sky-950">Erklärung und Lösungsweg</h3>
      {source && <p className="mt-1 text-xs leading-relaxed text-zinc-500">{source}</p>}
    </div>
    {!explanation && !error && <p role="status" className="flex items-center gap-2 text-sm text-zinc-600"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Erklärung wird geladen …</p>}
    {error && <div role="alert" className="space-y-2 text-sm text-red-800">
      <p>{error}</p>
      <button type="button" className="rounded-md border border-red-300 bg-white px-3 py-2 font-medium" onClick={() => { setError(''); setRetry((value) => value + 1); }}>Erneut laden</button>
    </div>}
    {explanation && <>
      {explanation.explanation && <div className="space-y-2">
        <h4 className="text-sm font-semibold text-zinc-900">Vom Fall zur Lösung</h4>
        <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-800">{displayText(explanation.explanation)}</p>
      </div>}
      {explanation.optionRationales.some((item) => item.text) && <div className="space-y-2">
        <h4 className="text-sm font-semibold text-zinc-900">Antworten im Vergleich</h4>
        {question.options.map((option, index) => {
          const rationale = explanation.optionRationales.find((item) => item.index === index);
          if (!rationale?.text) return null;
          const correct = hasKey && question.correctAnswers?.[index] === '1';
          const selected = selection[index] === '1';
          const wrongSelection = hasKey && selected && !correct;
          return <details key={index} id={`round-option-explanation-${index}`} ref={(node) => { optionDetails.current[index] = node; }} open={correct || selected} className={`group rounded-lg border bg-white ${correct ? 'border-emerald-300' : wrongSelection ? 'border-red-300' : 'border-slate-200'}`}>
            <summary className="flex cursor-pointer list-none items-start gap-2 px-3 py-3 text-sm font-medium text-zinc-800 [&::-webkit-details-marker]:hidden">
              <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 transition group-open:rotate-180" aria-hidden />
              <span className="min-w-0"><span>{String.fromCharCode(65 + index)}. {displayText(option)}</span>
                <span className={`mt-1 block text-xs ${correct ? 'text-emerald-700' : wrongSelection ? 'text-red-700' : 'text-zinc-500'}`}>
                  {correct ? selected ? 'Richtig · deine Auswahl' : 'Richtige Antwort' : wrongSelection ? 'Deine Auswahl – warum sie nicht passt' : hasKey ? 'Warum diese Alternative nicht passt' : 'Hinweise zu dieser Option'}
                </span>
              </span>
            </summary>
            <div className="space-y-3 px-3 pb-3 pl-9">
              <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">{displayText(rationale.text)}</p>
              {!!rationale.links?.length && <div className="flex flex-wrap gap-x-4 gap-y-2">{rationale.links.filter((link) => /^https?:\/\//i.test(link.url)).map((link) => <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-800 underline underline-offset-2">{displayText(link.label)}</a>)}</div>}
            </div>
          </details>;
        })}
      </div>}
      {!explanation.explanation && !explanation.optionRationales.some((item) => item.text) && <p className="text-sm text-zinc-600">Für diese Frage ist noch keine Erklärung hinterlegt.</p>}
      {explanation.topicLabel && explanation.topicUrl && /^https?:\/\//i.test(explanation.topicUrl) && <a href={explanation.topicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-900"><BookOpen className="h-4 w-4 shrink-0" aria-hidden />Thema vertiefen: {displayText(explanation.topicLabel)}</a>}
    </>}
  </section>;
}
