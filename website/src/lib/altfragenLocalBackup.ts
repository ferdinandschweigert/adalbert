import type { ExamProgress, QuestionStat } from '@/lib/altfragenTypes';
import {
  ACTIVITY_KEY,
  EXAM_STATS_PREFIX,
  KNOWN_EXAM_ALIASES,
  PROGRESS_PREFIX,
  mergeQuestionStatsMaps,
  migrateLegacyExamKeys,
} from '@/lib/altfragenLocalMigrate';
import { mergeDaily, readLocalActivity, type LocalActivityStore } from '@/lib/altfragenLocalActivity';
import { getProgress, saveProgress } from '@/lib/altfragenStore';
import { mergeExamProgress } from '@/lib/altfragenProgressMerge';
import { readAnnotations, readReview, readReviewSettings, saveReview, saveReviewSettings, ANNOTATION_KEY, type QuestionAnnotation, type ReviewSettings, type ReviewStore } from '@/lib/altfragenReview';

export const BACKUP_VERSION = 2 as const;

export type KreuzDataBackup = {
  version: 1 | typeof BACKUP_VERSION;
  exportedAt: string;
  activity: LocalActivityStore;
  progress: Record<string, ExamProgress>;
  examStats: Record<string, Record<string, QuestionStat>>;
  annotations?: Record<string, QuestionAnnotation>;
  review?: ReviewStore;
  reviewSettings?: ReviewSettings;
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
    annotations: readAnnotations(),
    review: readReview(),
    reviewSettings: readReviewSettings() || undefined,
  };
}

export function importKreuzData(backup: KreuzDataBackup): {
  restoredExams: number;
  restoredStats: number;
} {
  if (!canUseStorage()) return { restoredExams: 0, restoredStats: 0 };
  if (!backup || (backup.version !== 1 && backup.version !== BACKUP_VERSION)) {
    throw new Error('Ungültiges Backup-Format');
  }

  let restoredExams = 0;
  let restoredStats = 0;

  migrateLegacyExamKeys(Object.keys(backup.progress || {}));

  if (backup.activity) {
    const existing = readLocalActivity();
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify({
      daily: mergeDaily(existing.daily, backup.activity.daily || {}),
      examCorrect: mergeDaily(existing.examCorrect || {}, backup.activity.examCorrect || {}),
    }));
  }

  for (const [examId, progress] of Object.entries(backup.progress || {})) {
    if (!progress) continue;
    const canonical = Object.entries(KNOWN_EXAM_ALIASES).find(([, aliases]) => aliases.includes(examId))?.[0] || examId;
    saveProgress(mergeExamProgress(getProgress(canonical), { ...progress, examId: canonical }));
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

  if (backup.annotations) {
    const existing = readAnnotations();
    const merged = { ...backup.annotations, ...existing };
    for (const [key, imported] of Object.entries(backup.annotations)) {
      const local = existing[key];
      if (!local) continue;
      merged[key] = {
        ...imported, ...local,
        note: local.note || imported.note || '',
        starred: Boolean(local.starred || imported.starred),
        uncertain: Boolean(local.uncertain || imported.uncertain),
        crossedOut: [...new Set([...(local.crossedOut || []), ...(imported.crossedOut || [])])],
        highlights: [...(local.highlights || []), ...(imported.highlights || [])]
          .filter((range, i, all) => all.findIndex((other) => other.start === range.start && other.end === range.end) === i),
      };
    }
    localStorage.setItem(ANNOTATION_KEY, JSON.stringify(merged));
  }
  if (backup.review) {
    const local = readReview();
    const attempts = [...local.attempts];
    const keys = new Set(attempts.map((a) => JSON.stringify(a)));
    for (const attempt of backup.review.attempts || []) {
      const key = JSON.stringify(attempt);
      if (!keys.has(key)) { attempts.push(attempt); keys.add(key); }
    }
    const sessions = [...local.sessions];
    const sessionIds = new Set(sessions.map((s) => s.id));
    for (const session of backup.review.sessions || []) {
      if (!sessionIds.has(session.id)) { sessions.push(session); sessionIds.add(session.id); }
    }
    saveReview({ attempts, sessions });
  }
  if (backup.reviewSettings && !readReviewSettings()) saveReviewSettings(backup.reviewSettings);

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
