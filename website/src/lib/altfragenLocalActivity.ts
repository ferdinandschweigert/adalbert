import type { QuestionStat } from '@/lib/altfragenTypes';
import { ACTIVITY_KEY, EXAM_STATS_PREFIX } from '@/lib/altfragenLocalMigrate';
import { safeGetItem, safeSetItem, type StorageWriteResult } from '@/lib/altfragenStorage';

export { ACTIVITY_KEY, EXAM_STATS_PREFIX };

export type LocalDailyActivity = Record<string, number>;

export type LocalExamAggregate = {
  examId: string;
  attempts: number;
  correct: number;
  questionsWithData: number;
};

export type LocalActivityStore = {
  daily: LocalDailyActivity;
  /** Incremental corrects we counted locally (best-effort). */
  examCorrect?: Record<string, number>;
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function readLocalActivity(): LocalActivityStore {
  if (!canUseStorage()) return { daily: {}, examCorrect: {} };
  try {
    const raw = safeGetItem(ACTIVITY_KEY);
    if (!raw) return { daily: {}, examCorrect: {} };
    const parsed = JSON.parse(raw) as LocalActivityStore;
    return {
      daily: parsed.daily || {},
      examCorrect: parsed.examCorrect || {},
    };
  } catch {
    return { daily: {}, examCorrect: {} };
  }
}

function writeLocalActivity(store: LocalActivityStore): StorageWriteResult {
  return safeSetItem(ACTIVITY_KEY, JSON.stringify(store));
}

/** Call after each answered/checked question. */
export function recordLocalKreuzung(input: {
  examId: string;
  correct: boolean;
}): StorageWriteResult {
  const store = readLocalActivity();
  const day = todayKey();
  store.daily[day] = (store.daily[day] || 0) + 1;
  if (!store.examCorrect) store.examCorrect = {};
  if (input.correct) {
    store.examCorrect[input.examId] = (store.examCorrect[input.examId] || 0) + 1;
  }
  return writeLocalActivity(store);
}

/**
 * Bump the local per-exam community-stat cache for one answered question.
 * Does not wait for the server — so homepage KPI/bars still update if POST fails.
 */
export function recordLocalExamStat(input: {
  examId: string;
  questionNumber: number;
  optionCount: number;
  selectionBits: string;
  correct: boolean;
}): StorageWriteResult {
  if (!canUseStorage()) {
    return { ok: false, error: 'localStorage ist nicht verfügbar' };
  }
  const key = EXAM_STATS_PREFIX + input.examId;
  let map: Record<string, QuestionStat> = {};
  try {
    const raw = safeGetItem(key);
    if (raw) map = JSON.parse(raw) as Record<string, QuestionStat>;
  } catch {
    map = {};
  }

  const qKey = String(input.questionNumber);
  const prev = map[qKey] || {
    attempts: 0,
    correct: 0,
    optionCounts: Array(input.optionCount).fill(0),
  };
  const optionCounts = [...(prev.optionCounts || [])];
  while (optionCounts.length < input.optionCount) optionCounts.push(0);
  const bits = (input.selectionBits || '').padEnd(input.optionCount, '0');
  for (let i = 0; i < input.optionCount; i++) {
    if (bits[i] === '1') optionCounts[i] += 1;
  }
  map[qKey] = {
    attempts: (prev.attempts || 0) + 1,
    correct: (prev.correct || 0) + (input.correct ? 1 : 0),
    optionCounts,
  };

  return safeSetItem(key, JSON.stringify(map));
}

/**
 * If we have local exam attempt caches but no daily buckets yet,
 * attribute the known attempts to today once so the heatmap isn't empty.
 */
export function ensureLocalActivityFromExamCaches(examIds: string[]): LocalActivityStore {
  const store = readLocalActivity();
  const hasDaily = Object.values(store.daily).some((n) => n > 0);
  if (hasDaily) return store;

  const aggs = readLocalExamAggregates(examIds);
  const total = aggs.reduce((s, a) => s + a.attempts, 0);
  if (total <= 0) return store;

  store.daily[todayKey()] = total;
  writeLocalActivity(store);
  return store;
}

/** Aggregate per-exam attempts from the practice localStorage caches. */
export function readLocalExamAggregates(examIds: string[]): LocalExamAggregate[] {
  if (!canUseStorage()) return [];
  const out: LocalExamAggregate[] = [];
  for (const examId of examIds) {
    try {
      const raw = safeGetItem(EXAM_STATS_PREFIX + examId);
      if (!raw) {
        out.push({ examId, attempts: 0, correct: 0, questionsWithData: 0 });
        continue;
      }
      const qs = JSON.parse(raw) as Record<string, QuestionStat>;
      let attempts = 0;
      let correct = 0;
      let questionsWithData = 0;
      for (const st of Object.values(qs || {})) {
        if (!st?.attempts) continue;
        questionsWithData += 1;
        attempts += st.attempts;
        correct += st.correct || 0;
      }
      out.push({ examId, attempts, correct, questionsWithData });
    } catch {
      out.push({ examId, attempts: 0, correct: 0, questionsWithData: 0 });
    }
  }
  return out;
}

export function buildLocalHeatmap(
  daily: LocalDailyActivity,
  days = 98
): Array<{ date: string; count: number }> {
  const heatmap: Array<{ date: string; count: number }> = [];
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    heatmap.push({ date: key, count: daily[key] || 0 });
  }
  return heatmap;
}

export function mergeDaily(
  a: LocalDailyActivity,
  b: LocalDailyActivity
): LocalDailyActivity {
  const out: LocalDailyActivity = { ...a };
  for (const [k, v] of Object.entries(b)) {
    out[k] = Math.max(out[k] || 0, v);
  }
  return out;
}
