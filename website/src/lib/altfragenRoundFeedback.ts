import type { ParsedQuestion } from './altfragenTypes';

export type RoundQuestionStatus = 'unseen' | 'selected' | 'correct' | 'wrong' | 'ungraded';
export type RoundOptionStatus = 'neutral' | 'selected' | 'correct' | 'wrong';

export function normalizeAnswerBits(bits: string | undefined, length: number): string {
  return (bits || '').replace(/[^01]/g, '').padEnd(length, '0').slice(0, length);
}

export function roundQuestionStatus(
  question: ParsedQuestion | undefined,
  selection: string | undefined,
  checked: boolean
): RoundQuestionStatus {
  if (!checked) return selection?.includes('1') ? 'selected' : 'unseen';
  if (!question?.correctAnswers?.includes('1')) return 'ungraded';
  return normalizeAnswerBits(selection, question.options.length) === normalizeAnswerBits(question.correctAnswers, question.options.length)
    ? 'correct' : 'wrong';
}

export function roundOptionStatus(
  question: ParsedQuestion,
  selection: string,
  optionIndex: number,
  showFeedback: boolean
): RoundOptionStatus {
  const selected = normalizeAnswerBits(selection, question.options.length)[optionIndex] === '1';
  if (showFeedback && question.correctAnswers?.includes('1')) {
    if (question.correctAnswers[optionIndex] === '1') return 'correct';
    if (selected) return 'wrong';
    return 'neutral';
  }
  return selected ? 'selected' : 'neutral';
}
