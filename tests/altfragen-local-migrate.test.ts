/**
 * Lightweight checks for localStorage migration / stats merge helpers.
 * Run: node --experimental-strip-types tests/altfragen-local-migrate.test.ts
 * (or via website build typecheck)
 */
import assert from 'node:assert/strict';

// Mirror of mergeQuestionStatsMaps logic for a quick sanity test without Next path aliases.
type QuestionStat = { attempts: number; correct: number; optionCounts: number[] };

function mergeQuestionStats(
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

function mergeQuestionStatsMaps(
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

function formatOptionLabel(opt: string | undefined | null): { text: string; missing: boolean } {
  const raw = (opt ?? '').trim();
  if (!raw || raw === '?' || raw === '??' || raw === '…' || raw === '...') {
    return { text: 'Nicht im Protokoll überliefert', missing: true };
  }
  return { text: raw, missing: false };
}

// Empty server must not wipe rich local cache
{
  const local = { '19': { attempts: 12, correct: 8, optionCounts: [1, 2, 9, 0, 0] } };
  const server = {};
  const merged = mergeQuestionStatsMaps(local, server);
  assert.equal(merged['19'].attempts, 12);
}

// Poorer server must not overwrite richer local
{
  const local = { '1': { attempts: 40, correct: 30, optionCounts: [10, 20, 5, 3, 2] } };
  const server = { '1': { attempts: 1, correct: 1, optionCounts: [0, 1, 0, 0, 0] } };
  const merged = mergeQuestionStatsMaps(local, server);
  assert.equal(merged['19' as string]?.attempts, undefined);
  assert.equal(merged['1'].attempts, 40);
  assert.equal(merged['1'].correct, 30);
}

// Richer server wins
{
  const local = { '2': { attempts: 2, correct: 1, optionCounts: [1, 1] } };
  const server = { '2': { attempts: 9, correct: 4, optionCounts: [2, 7] } };
  const merged = mergeQuestionStatsMaps(local, server);
  assert.equal(merged['2'].attempts, 9);
}

// Equal attempts: max correct / option counts
{
  const local = { '3': { attempts: 5, correct: 2, optionCounts: [1, 4, 0] } };
  const server = { '3': { attempts: 5, correct: 3, optionCounts: [2, 1, 2] } };
  const merged = mergeQuestionStatsMaps(local, server);
  assert.equal(merged['3'].correct, 3);
  assert.deepEqual(merged['3'].optionCounts, [2, 4, 2]);
}

assert.equal(formatOptionLabel('?').missing, true);
assert.equal(formatOptionLabel('CT Sinus').missing, false);

console.log('altfragen-local-migrate tests: ok');
