import type { ExamProgress, PracticeMode } from './altfragenTypes';

/** Answers selected in exam mode (or left unchecked by an older mode switch). */
export function uncheckedAnswerCount(progress: ExamProgress, questionCount: number): number {
  const checked = new Set(progress.checked.map(Number));
  let count = 0;
  for (let index = 0; index < questionCount; index++) {
    if (progress.selections[index]?.includes('1') && !checked.has(index)) count++;
  }
  return count;
}

/** Switching modes must never discard answers or previously checked timestamps. */
export function switchPracticeMode(
  progress: ExamProgress,
  mode: PracticeMode,
  questionCount: number,
  checkedAt: string
): ExamProgress {
  if (mode === 'exam') {
    return { ...progress, practiceMode: 'exam', completedAt: undefined };
  }

  const checked: number[] = [];
  const timestamps = { ...(progress.checkedAt || {}) };
  for (let index = 0; index < questionCount; index++) {
    if (!progress.selections[index]?.includes('1')) continue;
    checked.push(index);
    if (!timestamps[index]) timestamps[index] = checkedAt;
  }
  return {
    ...progress,
    practiceMode: 'learn',
    checked,
    checkedAt: timestamps,
    completedAt: undefined,
  };
}
