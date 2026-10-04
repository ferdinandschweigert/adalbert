'use client';

import { BookOpen, Loader2 } from 'lucide-react';
import type { ParsedQuestion } from '@/lib/altfragenTypes';
import type { RoundExplanation } from '@/components/altfragen/useRoundQuestionExplanation';
import { displayText } from '@/lib/altfragenText';

export function RoundQuestionExplanation({ question, explanation, error, onRetry }: {
  question: ParsedQuestion;
  explanation?: RoundExplanation;
  error?: string;
  onRetry: () => void;
}) {
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
      <button type="button" className="rounded-md border border-red-300 bg-white px-3 py-2 font-medium" onClick={onRetry}>Erneut laden</button>
    </div>}
    {explanation && <>
      {explanation.explanation && <div className="space-y-2">
        <h4 className="text-sm font-semibold text-zinc-900">Vom Fall zur Lösung</h4>
        <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-800">{displayText(explanation.explanation)}</p>
      </div>}
      {!explanation.explanation && <p className="text-sm text-zinc-600">Für diese Frage ist noch keine übergeordnete Erklärung hinterlegt.</p>}
      {explanation.topicLabel && explanation.topicUrl && /^https?:\/\//i.test(explanation.topicUrl) && <a href={explanation.topicUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-sky-200 bg-white px-3 py-2 text-sm font-medium text-sky-900"><BookOpen className="h-4 w-4 shrink-0" aria-hidden />Thema vertiefen: {displayText(explanation.topicLabel)}</a>}
    </>}
  </section>;
}
