import type { QuestionStat } from '@/lib/altfragenTypes';

const ACTIVITY_KEY = 'adalbert-kreuzen-activity-v1';
const EXAM_STATS_PREFIX = 'adalbert-altfragen-stats-v2-';

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
    const raw = localStorage.getItem(ACTIVITY_KEY);
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

function writeLocalActivity(store: LocalActivityStore): void {
  if (!canUseStorage()) return;
  localStorage.setItem(ACTIVITY_KEY, JSON.stringify(store));
}

/** Call after each answered/checked question. */
export function recordLocalKreuzung(input: {
  examId: string;
  correct: boolean;
}): void {
  const store = readLocalActivity();
  const day = todayKey();
  store.daily[day] = (store.daily[day] || 0) + 1;
  if (!store.examCorrect) store.examCorrect = {};
  if (input.correct) {
    store.examCorrect[input.examId] = (store.examCorrect[input.examId] || 0) + 1;
  }
  writeLocalActivity(store);
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
      const raw = localStorage.getItem(EXAM_STATS_PREFIX + examId);
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
