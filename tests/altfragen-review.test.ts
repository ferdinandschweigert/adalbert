import assert from 'node:assert/strict';
import { buildCandidates, candidateGroups, emptyAnnotation, highlightSegments, selectCandidates, shouldPause, yieldReasons } from '../website/src/lib/altfragenReview.ts';
import { mergeExamProgress } from '../website/src/lib/altfragenProgressMerge.ts';
import { TOP_100_CHAPTERS, verifiedTop100Topic } from '../website/src/lib/altfragenTop100.ts';
import type { StoredExam } from '../website/src/lib/altfragenTypes.ts';

const exam: StoredExam = {
  id: 'exam', title: 'Test', published: true, createdAt: '', updatedAt: '',
  questions: [1, 2, 3].map((number) => ({ number, question: `Frage ${number}`, options: ['A', 'B'], type: 'SC', correctAnswers: '10' })),
};
const local = { examId: 'exam', currentIndex: 2, selections: { 0: '10', 1: '01' }, checked: [0], checkedAt: { 0: '2026-10-02T10:00:00Z' } };
const old = { examId: 'exam', currentIndex: 0, selections: { 0: '01', 1: '10', 2: '01' }, checked: [0, 1, 2], checkedAt: { 0: '2026-10-01T10:00:00Z' } };
const merged = mergeExamProgress(local, old);
assert.equal(merged.currentIndex, 2);
assert.equal(merged.selections[0], '10', 'older checked answer may not overwrite');
assert.equal(merged.selections[1], '01', 'local draft may not be marked checked by import');
assert.deepEqual(merged.checked, [0, 2]);
assert.equal(merged.selections[2], '01', 'missing answer is added');

const annotations = { 'exam:2': { ...emptyAnnotation(), starred: true, uncertain: true } };
const candidates = buildCandidates([exam], { exam: local }, annotations, [
  { examId: 'exam', questionNumber: 1, selection: '01', correct: false, at: '2026-10-03T10:00:00Z' },
]);
assert.equal(candidates[0].attempts.length, 2, 'one reconstructable old attempt, one review attempt');
assert.equal(candidates[1].attempts.length, 0, 'unchecked draft is not invented as an attempt');
assert.deepEqual(candidateGroups(candidates[0]).sort(), ['everWrong', 'lastWrong']);
assert.deepEqual(candidateGroups(candidates[1]).sort(), ['starred', 'uncertain', 'unseen']);
assert.equal(selectCandidates(candidates, ['lastWrong', 'everWrong'], 3, 'original', { errors: 3, top100: 2, uncertain: 1, due: 1 }).length, 1, 'union de-duplicates');
const ranked = selectCandidates(candidates, [], 3, 'priority', { errors: 3, top100: 2, uncertain: 1, due: 1 }, Date.parse('2026-10-04T12:00:00Z'));
assert.equal(ranked[0].question.number, 1);
assert.equal(yieldReasons(ranked[0], { errors: 3, top100: 2, uncertain: 1, due: 1 }, Date.parse('2026-10-04T12:00:00Z'))[0].points, 3);
for (const action of [{ kind: 'check' as const }, { kind: 'go' as const, target: 1 }, { kind: 'go' as const, target: 2 }, { kind: 'results' as const }]) {
  assert.equal(shouldPause(action, 0, 2000, 60), true);
}
assert.equal(shouldPause({ kind: 'go', target: 0 }, 1, 0, 60), false);
assert.equal(shouldPause({ kind: 'check' }, 0, 60_000, 60), false);
assert.equal(shouldPause({ kind: 'check' }, 0, 0, 0), false);
assert.equal(TOP_100_CHAPTERS.length, 100);
assert.equal(verifiedTop100Topic('m2-2025a-staatsexamen', 1, 'Lungenembolie Diagnostik'), 'Lungenembolie');
assert.equal(verifiedTop100Topic('m2-2025a-staatsexamen', 16, 'Trigeminusneuralgie'), undefined, 'a comorbidity in the stem gives no bonus');
assert.equal(verifiedTop100Topic('m2-h25-gedaechtnisprotokoll', 221, 'Arterielle Hypertonie Therapie Diabetes'), undefined, 'ambiguous case follow-up gives no bonus');
assert.equal(verifiedTop100Topic('exam', 1, 'Pneumonie und Sepsis'), undefined, 'two chapter matches are ambiguous');
const longText = 'A'.repeat(600);
const segments = highlightSegments(longText, [{ start: 30, end: 570 }, { start: 500, end: 590 }]);
assert.equal(segments.filter((part) => part.marked).reduce((sum, part) => sum + part.end - part.start, 0), 560, 'overlapping long marks cover the selected text once');
assert.equal(highlightSegments(longText, [{ start: -1, end: 610 }]).every((part) => !part.marked), true, 'stale out-of-range marks are ignored');
console.log('altfragen-review tests: ok');
