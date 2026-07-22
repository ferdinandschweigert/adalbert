import type { ExamProgress } from '@/lib/altfragenTypes';
import { migrateExamLocalData, PROGRESS_PREFIX } from '@/lib/altfragenLocalMigrate';

export { PROGRESS_PREFIX };

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

export function getProgress(examId: string): ExamProgress | null {
  if (!canUseStorage()) return null;
  try {
    migrateExamLocalData(examId);
    const raw = localStorage.getItem(PROGRESS_PREFIX + examId);
    if (!raw) return null;
    return JSON.parse(raw) as ExamProgress;
  } catch {
    return null;
  }
}

export function saveProgress(progress: ExamProgress): void {
  if (!canUseStorage()) return;
  localStorage.setItem(PROGRESS_PREFIX + progress.examId, JSON.stringify(progress));
}

export function clearProgress(examId: string): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(PROGRESS_PREFIX + examId);
}

export function createEmptyProgress(examId: string): ExamProgress {
  return {
    examId,
    currentIndex: 0,
    selections: {},
    checked: [],
    startedAt: new Date().toISOString(),
    checkedAt: {},
  };
}
