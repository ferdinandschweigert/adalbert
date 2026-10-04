'use client';

import { useEffect, useState } from 'react';
import type { ExplanationMeta, OptionRationale } from '@/lib/altfragenTypes';

export type RoundExplanation = {
  explanation: string | null;
  optionRationales: OptionRationale[];
  topicLabel: string | null;
  topicUrl: string | null;
  explanationMeta: ExplanationMeta | null;
};

// Public explanations only; personal answers and annotations never enter this cache.
const cache = new Map<string, RoundExplanation>();

export function useRoundQuestionExplanation(examId: string | undefined, examVersion: string, questionNumber: number | undefined, enabled: boolean) {
  const cacheKey = `${examId}:${examVersion}:${questionNumber}`;
  const [state, setState] = useState<{ key: string; explanation?: RoundExplanation; error?: string }>({ key: '' });
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!enabled || !examId || questionNumber === undefined || cache.has(cacheKey)) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/altfragen/exams/${encodeURIComponent(examId!)}/questions/${questionNumber}/explanation`, { credentials: 'same-origin', signal: controller.signal });
        if (!response.ok) throw new Error('Die Erklärung konnte nicht geladen werden.');
        const body = await response.json() as RoundExplanation;
        if (controller.signal.aborted) return;
        const explanation: RoundExplanation = {
          explanation: body.explanation || null,
          optionRationales: body.optionRationales || [],
          topicLabel: body.topicLabel || null,
          topicUrl: body.topicUrl || null,
          explanationMeta: body.explanationMeta || null,
        };
        cache.set(cacheKey, explanation);
        setState({ key: cacheKey, explanation });
      } catch (cause) {
        if (!controller.signal.aborted) setState({ key: cacheKey, error: cause instanceof Error ? cause.message : String(cause) });
      }
    }
    void load();
    return () => controller.abort();
  }, [enabled, examId, questionNumber, cacheKey, retry]);

  return {
    explanation: enabled ? cache.get(cacheKey) || (state.key === cacheKey ? state.explanation : undefined) : undefined,
    error: enabled && state.key === cacheKey ? state.error : undefined,
    retry: () => { setState({ key: cacheKey }); setRetry((value) => value + 1); },
  };
}
