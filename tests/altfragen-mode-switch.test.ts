import assert from 'node:assert/strict';
import {
  switchPracticeMode,
  uncheckedAnswerCount,
} from '../website/src/lib/altfragenModeSwitch.ts';
import type { ExamProgress } from '../website/src/lib/altfragenTypes.ts';

const previousCheck = '2026-10-02T10:00:00Z';
const now = '2026-10-03T15:00:00Z';
const original: ExamProgress = {
  examId: 'sample',
  currentIndex: 1,
  selections: { 0: '10', 1: '011', 2: '000', 3: '01' },
  checked: [0],
  checkedAt: { 0: previousCheck },
  practiceMode: 'learn',
  startedAt: '2026-10-02T09:00:00Z',
  completedAt: '2026-10-02T11:00:00Z',
};

const exam = switchPracticeMode(original, 'exam', 4, now);
assert.equal(exam.practiceMode, 'exam');
assert.equal(exam.completedAt, undefined);
assert.deepEqual(exam.checked, [0], 'previously checked answers survive exam mode');
assert.deepEqual(exam.checkedAt, { 0: previousCheck });
assert.deepEqual(exam.selections, original.selections);
assert.equal(uncheckedAnswerCount(exam, 4), 2);

const learn = switchPracticeMode(exam, 'learn', 4, now);
assert.deepEqual(learn.checked, [0, 1, 3], 'all selected answers become visible in one step');
assert.deepEqual(learn.checkedAt, { 0: previousCheck, 1: now, 3: now });
assert.deepEqual(learn.selections, original.selections);
assert.equal(learn.currentIndex, original.currentIndex);
assert.equal(learn.startedAt, original.startedAt);
assert.equal(uncheckedAnswerCount(learn, 4), 0);

const oldBrokenState: ExamProgress = {
  ...original,
  checked: [],
  checkedAt: {},
  completedAt: undefined,
};
const restored = switchPracticeMode(oldBrokenState, 'learn', 4, now);
assert.deepEqual(restored.checked, [0, 1, 3], 'older switches can be repaired in bulk');
assert.deepEqual(oldBrokenState.checked, [], 'existing stored state is not mutated');

const clearedDuringExam = switchPracticeMode({
  ...exam,
  selections: { 0: '000', 1: '011', 3: '01' },
}, 'learn', 4, now);
assert.deepEqual(clearedDuringExam.checked, [1, 3], 'cleared answers stay open');

const repeated = switchPracticeMode(learn, 'learn', 4, '2026-10-04T10:00:00Z');
assert.deepEqual(repeated.checked, learn.checked);
assert.deepEqual(repeated.checkedAt, learn.checkedAt, 'repeated toggles keep original check times');

console.log('altfragen-mode-switch tests: ok');
