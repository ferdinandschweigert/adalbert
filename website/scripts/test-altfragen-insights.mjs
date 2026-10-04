import assert from 'node:assert/strict';
import { buildKreuzInsights } from '../src/lib/altfragenInsights.ts';

const exam = {
  id: 'demo', title: 'Demo', questions: [
    { number: 1, question: 'Frage eins?', options: ['A', 'B'], correctAnswers: '10' },
    { number: 2, question: 'Frage zwei?', options: ['C', 'D'], correctAnswers: '' },
  ],
};
const progress = {
  examId: 'demo', currentIndex: 1, selections: { 0: '01', 1: '10' },
  checked: [0, 1], practiceMode: 'learn', completedAt: '2026-10-02T00:00:00.000Z',
};
const attempts = [{ examId: 'demo', questionNumber: 1, selection: '10', correct: true, at: '2026-10-03T00:00:00.000Z' }];

const result = buildKreuzInsights([exam], { demo: progress }, attempts);
assert.equal(result.exams[0].completed, true);
assert.deepEqual([result.exams[0].wrong, result.exams[0].ungraded, result.exams[0].right], [1, 1, 0]);
assert.equal(result.rows[0].status, 'falsch');
assert.equal(result.rows[0].selected, 'B: B');
assert.equal(result.rows[0].solution, 'A: A');
assert.equal(result.rows[0].repeats, 1);
assert.equal(result.rows[0].lastRepeat, 'richtig');
assert.equal(result.rows[1].status, 'ohne-schluessel');

const pending = buildKreuzInsights([exam], { demo: { ...progress, practiceMode: 'exam', completedAt: undefined } });
assert.equal(pending.exams[0].completed, false);
assert.equal(pending.exams[0].checked, 0);
assert.equal(pending.rows[0].status, 'ausstehend');
assert.match(pending.rows[0].solution, /Erst nach/);

const empty = buildKreuzInsights([exam], { demo: null });
assert.equal(empty.rows[0].status, 'offen');
assert.equal(empty.rows[0].selected, 'Keine Antwort');
assert.equal(empty.rows[0].solution.includes('A: A'), false);

console.log('Kreuz-Auswertung: Prüfungsmodus, Lösungsschutz und getrennte Wiederholungen geprüft.');
