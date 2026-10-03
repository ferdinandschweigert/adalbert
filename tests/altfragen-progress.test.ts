import assert from 'node:assert/strict';
import { mergeExamProgress } from '../website/src/lib/altfragenProgressMerge.ts';

const local = {
  examId: 'exam', currentIndex: 2,
  selections: { 0: '10', 1: '01' }, checked: [0],
  checkedAt: { 0: '2026-10-02T10:00:00Z' },
};
const oldBackup = {
  examId: 'exam', currentIndex: 0,
  selections: { 0: '01', 1: '10', 2: '01' }, checked: [0, 1, 2],
  checkedAt: { 0: '2026-10-01T10:00:00Z' },
};
const merged = mergeExamProgress(local, oldBackup);
assert.equal(merged.currentIndex, 2);
assert.equal(merged.selections[0], '10', 'older answer may not overwrite');
assert.equal(merged.selections[1], '01', 'local draft stays intact');
assert.deepEqual(merged.checked, [0, 2], 'old backup cannot mark local draft checked');
assert.equal(merged.selections[2], '01', 'missing answer is added');

const newerAnswer = mergeExamProgress(local, {
  ...oldBackup,
  selections: { 0: '01' },
  checkedAt: { 0: '2026-10-03T10:00:00Z' },
});
assert.equal(newerAnswer.selections[0], '01', 'truly newer dated answer is accepted');

console.log('altfragen-progress tests: ok');
