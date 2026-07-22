import type { ExamProgress, QuestionStat } from '@/lib/altfragenTypes';

/**
 * When an exam id is renamed, browser localStorage keys become orphans.
 * Keep historical aliases here so progress/stats can be recovered.
 */
export const KNOWN_EXAM_ALIASES: Record<string, string[]> = {
  'm2-ss26-f26-gedaechtnisprotokoll': ['759dd8cb-1e76-4122-b3c4-3ed95ce92d01'],
};

export const PROGRESS_PREFIX = 'adalbert-altfragen-progress-';
export const EXAM_STATS_PREFIX = 'adalbert-altfragen-stats-v2-';
export const EXAM_STATS_LEGACY_PREFIX = 'adalbert-altfragen-stats-';
export const ACTIVITY_KEY = 'adalbert-kreuzen-activity-v1';

/** Canonical live origin — Kreuzungsdaten live in this origin's localStorage. */
export const CANONICAL_HOST = 'adalbert.vercel.app';
export const CANONICAL_URL = `https://${CANONICAL_HOST}`;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function aliasesFor(examId: string): string[] {
  return KNOWN_EXAM_ALIASES[examId] || [];
}

function canonicalForAlias(aliasId: string): string | null {
  for (const [canonical, aliases] of Object.entries(KNOWN_EXAM_ALIASES)) {
    if (aliases.includes(aliasId)) return canonical;
  }
  return null;
}

export function mergeQuestionStats(
  a: QuestionStat | undefined,
  b: QuestionStat | undefined
): QuestionStat | undefined {
  if (!a) return b;
  if (!b) return a;
  if ((b.attempts || 0) > (a.attempts || 0)) return b;
  if ((a.attempts || 0) > (b.attempts || 0)) return a;
  const len = Math.max(a.optionCounts?.length || 0, b.optionCounts?.length || 0);
  const optionCounts: number[] = [];
  for (let i = 0; i < len; i++) {
    optionCounts.push(Math.max(a.optionCounts?.[i] || 0, b.optionCounts?.[i] || 0));
  }
  return {
    attempts: a.attempts,
    correct: Math.max(a.correct || 0, b.correct || 0),
    optionCounts,
  };
}

export function mergeQuestionStatsMaps(
  local: Record<string, QuestionStat>,
  server: Record<string, QuestionStat>
): Record<string, QuestionStat> {
  const out: Record<string, QuestionStat> = { ...local };
  for (const [qKey, statB] of Object.entries(server || {})) {
    const merged = mergeQuestionStats(out[qKey], statB);
    if (merged) out[qKey] = merged;
  }
  return out;
}

function readJson<T>(key: string): T | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function preferRicherProgress(a: ExamProgress | null, b: ExamProgress | null): ExamProgress | null {
  if (!a) return b;
  if (!b) return a;
  const score = (p: ExamProgress) =>
    (p.checked?.length || 0) * 1000 + Object.keys(p.selections || {}).length;
  return score(b) > score(a) ? b : a;
}

/**
 * Move progress + community-stat caches from legacy exam IDs / key prefixes
 * onto the current canonical exam id. Safe to call on every page load.
 */
export function migrateExamLocalData(examId: string): void {
  if (!canUseStorage()) return;

  // 1) Progress: aliases → canonical
  let best = readJson<ExamProgress>(PROGRESS_PREFIX + examId);
  for (const alias of aliasesFor(examId)) {
    const fromAlias = readJson<ExamProgress>(PROGRESS_PREFIX + alias);
    best = preferRicherProgress(best, fromAlias);
    if (fromAlias) {
      localStorage.removeItem(PROGRESS_PREFIX + alias);
    }
  }
  if (best) {
    const next = { ...best, examId };
    localStorage.setItem(PROGRESS_PREFIX + examId, JSON.stringify(next));
  }

  // 2) Stats v2: aliases → canonical (prefer richer attempts)
  let stats = readJson<Record<string, QuestionStat>>(EXAM_STATS_PREFIX + examId) || {};
  for (const alias of aliasesFor(examId)) {
    const aliasStats = readJson<Record<string, QuestionStat>>(EXAM_STATS_PREFIX + alias);
    if (aliasStats) {
      stats = mergeQuestionStatsMaps(stats, aliasStats);
      localStorage.removeItem(EXAM_STATS_PREFIX + alias);
    }
    // Legacy v1 prefix under alias
    const legacyAlias = readJson<Record<string, QuestionStat>>(EXAM_STATS_LEGACY_PREFIX + alias);
    if (legacyAlias) {
      stats = mergeQuestionStatsMaps(stats, legacyAlias);
      localStorage.removeItem(EXAM_STATS_LEGACY_PREFIX + alias);
    }
  }
  // Legacy v1 under canonical id
  const legacy = readJson<Record<string, QuestionStat>>(EXAM_STATS_LEGACY_PREFIX + examId);
  if (legacy) {
    stats = mergeQuestionStatsMaps(stats, legacy);
    localStorage.removeItem(EXAM_STATS_LEGACY_PREFIX + examId);
  }
  if (Object.keys(stats).length > 0) {
    localStorage.setItem(EXAM_STATS_PREFIX + examId, JSON.stringify(stats));
  }
}

/** Migrate all known published exams + any orphan alias keys found in storage. */
export function migrateLegacyExamKeys(publishedExamIds: string[] = []): void {
  if (!canUseStorage()) return;
  const ids = new Set<string>([...publishedExamIds, ...Object.keys(KNOWN_EXAM_ALIASES)]);

  // Also fold any leftover alias-only progress into its canonical id
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(PROGRESS_PREFIX)) continue;
    const id = key.slice(PROGRESS_PREFIX.length);
    const canonical = canonicalForAlias(id);
    if (canonical) ids.add(canonical);
  }

  for (const examId of ids) {
    migrateExamLocalData(examId);
  }
}

export function isNonCanonicalHost(hostname: string): boolean {
  if (!hostname || hostname === 'localhost' || hostname === '127.0.0.1') return false;
  if (hostname === CANONICAL_HOST) return false;
  // Preview deployments and the duplicate Vercel project split localStorage.
  return hostname.endsWith('.vercel.app') || hostname.includes('adalbertanki');
}

/** Human-readable label for incomplete Gedächtnisprotokoll options. */
export function formatOptionLabel(opt: string | undefined | null): {
  text: string;
  missing: boolean;
} {
  const raw = (opt ?? '').trim();
  if (!raw || raw === '?' || raw === '??' || raw === '…' || raw === '...') {
    return { text: 'Nicht im Protokoll überliefert', missing: true };
  }
  return { text: raw, missing: false };
}
