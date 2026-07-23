/**
 * Storage probe + local exam-stat increment (no DOM).
 * Run: node --experimental-strip-types tests/altfragen-storage.test.ts
 */
import assert from 'node:assert/strict';

type QuestionStat = { attempts: number; correct: number; optionCounts: number[] };

/** Mirrors recordLocalExamStat math without localStorage. */
function bumpExamStat(
  prev: QuestionStat | undefined,
  input: { optionCount: number; selectionBits: string; correct: boolean }
): QuestionStat {
  const base = prev || {
    attempts: 0,
    correct: 0,
    optionCounts: Array(input.optionCount).fill(0),
  };
  const optionCounts = [...(base.optionCounts || [])];
  while (optionCounts.length < input.optionCount) optionCounts.push(0);
  const bits = (input.selectionBits || '').padEnd(input.optionCount, '0');
  for (let i = 0; i < input.optionCount; i++) {
    if (bits[i] === '1') optionCounts[i] += 1;
  }
  return {
    attempts: (base.attempts || 0) + 1,
    correct: (base.correct || 0) + (input.correct ? 1 : 0),
    optionCounts,
  };
}

{
  const next = bumpExamStat(undefined, {
    optionCount: 5,
    selectionBits: '01000',
    correct: false,
  });
  assert.equal(next.attempts, 1);
  assert.equal(next.correct, 0);
  assert.deepEqual(next.optionCounts, [0, 1, 0, 0, 0]);
}

{
  const prev = { attempts: 3, correct: 2, optionCounts: [1, 1, 1, 0, 0] };
  const next = bumpExamStat(prev, {
    optionCount: 5,
    selectionBits: '10000',
    correct: true,
  });
  assert.equal(next.attempts, 4);
  assert.equal(next.correct, 3);
  assert.deepEqual(next.optionCounts, [2, 1, 1, 0, 0]);
}

/** Round-trip store simulation */
function simulateSafeSetGet() {
  const store = new Map<string, string>();
  const set = (k: string, v: string) => {
    store.set(k, v);
    return store.get(k) === v;
  };
  assert.equal(set('a', '1'), true);
  store.clear(); // ephemeral profile wipe
  assert.equal(store.get('a'), undefined);
}

simulateSafeSetGet();

console.log('altfragen-storage tests: ok');
