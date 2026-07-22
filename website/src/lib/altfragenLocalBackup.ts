import type { ExamProgress, QuestionStat } from '@/lib/altfragenTypes';
import {
  ACTIVITY_KEY,
  EXAM_STATS_PREFIX,
  KNOWN_EXAM_ALIASES,
  PROGRESS_PREFIX,
  mergeQuestionStatsMaps,
  migrateLegacyExamKeys,
} from '@/lib/altfragenLocalMigrate';
import { readLocalActivity, type LocalActivityStore } from '@/lib/altfragenLocalActivity';
import { getProgress, saveProgress } from '@/lib/altfragenStore';

export const BACKUP_VERSION = 1 as const;

export type KreuzDataBackup = {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  activity: LocalActivityStore;
  progress: Record<string, ExamProgress>;
  examStats: Record<string, Record<string, QuestionStat>>;
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

/** Collect all known exam IDs (canonical + aliases) that may have local data. */
function candidateExamIds(publishedIds: string[]): string[] {
  const set = new Set<string>(publishedIds);
  for (const [canonical, aliases] of Object.entries(KNOWN_EXAM_ALIASES)) {
    set.add(canonical);
    for (const a of aliases) set.add(a);
  }
  if (!canUseStorage()) return [...set];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(PROGRESS_PREFIX)) set.add(key.slice(PROGRESS_PREFIX.length));
    if (key.startsWith(EXAM_STATS_PREFIX)) set.add(key.slice(EXAM_STATS_PREFIX.length));
    if (key.startsWith('adalbert-altfragen-stats-') && !key.startsWith(EXAM_STATS_PREFIX)) {
      set.add(key.slice('adalbert-altfragen-stats-'.length));
    }
  }
  return [...set];
}

export function exportKreuzData(publishedExamIds: string[] = []): KreuzDataBackup {
  migrateLegacyExamKeys(publishedExamIds);

  const progress: Record<string, ExamProgress> = {};
  const examStats: Record<string, Record<string, QuestionStat>> = {};

  for (const examId of candidateExamIds(publishedExamIds)) {
    const p = getProgress(examId);
    if (p && (p.checked?.length || Object.keys(p.selections || {}).length)) {
      progress[examId] = p;
    }
    if (!canUseStorage()) continue;
    try {
      const raw = localStorage.getItem(EXAM_STATS_PREFIX + examId);
      if (raw) {
        examStats[examId] = JSON.parse(raw) as Record<string, QuestionStat>;
      }
    } catch {
      // ignore
    }
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    activity: readLocalActivity(),
    progress,
    examStats,
  };
}

export function importKreuzData(backup: KreuzDataBackup): {
  restoredExams: number;
  restoredStats: number;
} {
  if (!canUseStorage()) return { restoredExams: 0, restoredStats: 0 };
  if (!backup || backup.version !== BACKUP_VERSION) {
    throw new Error('Ungültiges Backup-Format');
  }

  let restoredExams = 0;
  let restoredStats = 0;

  if (backup.activity) {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(backup.activity));
  }

  for (const [examId, progress] of Object.entries(backup.progress || {})) {
    if (!progress) continue;
    saveProgress({ ...progress, examId });
    restoredExams += 1;
  }

  for (const [examId, stats] of Object.entries(backup.examStats || {})) {
    if (!stats) continue;
    const key = EXAM_STATS_PREFIX + examId;
    try {
      const existingRaw = localStorage.getItem(key);
      const existing = existingRaw
        ? (JSON.parse(existingRaw) as Record<string, QuestionStat>)
        : {};
      const merged = mergeQuestionStatsMaps(existing, stats);
      localStorage.setItem(key, JSON.stringify(merged));
      restoredStats += 1;
    } catch {
      localStorage.setItem(key, JSON.stringify(stats));
      restoredStats += 1;
    }
  }

  migrateLegacyExamKeys([
    ...Object.keys(backup.progress || {}),
    ...Object.keys(backup.examStats || {}),
  ]);

  return { restoredExams, restoredStats };
}

export function downloadKreuzBackup(publishedExamIds: string[] = []): void {
  const backup = exportKreuzData(publishedExamIds);
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `adalbert-kreuz-backup-${backup.exportedAt.slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export { mergeQuestionStatsMaps };
