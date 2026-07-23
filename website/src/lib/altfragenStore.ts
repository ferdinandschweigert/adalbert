import type { ExamProgress } from '@/lib/altfragenTypes';
import { migrateExamLocalData, PROGRESS_PREFIX } from '@/lib/altfragenLocalMigrate';
import {
  safeGetItem,
  safeRemoveItem,
  safeSetItem,
  type StorageWriteResult,
} from '@/lib/altfragenStorage';

export { PROGRESS_PREFIX };

export function getProgress(examId: string): ExamProgress | null {
  try {
    migrateExamLocalData(examId);
    const raw = safeGetItem(PROGRESS_PREFIX + examId);
    if (!raw) return null;
    return JSON.parse(raw) as ExamProgress;
  } catch {
    return null;
  }
}

export function saveProgress(progress: ExamProgress): StorageWriteResult {
  return safeSetItem(PROGRESS_PREFIX + progress.examId, JSON.stringify(progress));
}

export function clearProgress(examId: string): void {
  safeRemoveItem(PROGRESS_PREFIX + examId);
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
