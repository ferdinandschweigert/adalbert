import assert from 'node:assert/strict';
import { roundQuestionStatus, roundOptionStatus } from '../src/lib/altfragenRoundFeedback.ts';

const single = { number: 1, options: ['A', 'B', 'C'], type: 'SC', correctAnswers: '100' };
assert.equal(roundQuestionStatus(single, '010', true), 'wrong');
assert.equal(roundQuestionStatus(single, '100', true), 'correct');
assert.equal(roundQuestionStatus(single, '100', false), 'selected');
assert.equal(roundQuestionStatus(single, '', false), 'unseen');
assert.equal(roundOptionStatus(single, '010', 1, true), 'wrong');
assert.equal(roundOptionStatus(single, '010', 0, true), 'correct');
assert.equal(roundOptionStatus(single, '010', 1, false), 'selected');

const multiple = { ...single, type: 'MC', correctAnswers: '101' };
assert.equal(roundQuestionStatus(multiple, '100', true), 'wrong');
assert.equal(roundOptionStatus(multiple, '100', 2, true), 'correct');
assert.equal(roundQuestionStatus(multiple, '101', true), 'correct');
assert.equal(roundQuestionStatus({ ...single, correctAnswers: '10000' }, '1', true), 'correct');

const unknown = { ...single, correctAnswers: '000' };
assert.equal(roundQuestionStatus(unknown, '010', true), 'ungraded');
assert.equal(roundOptionStatus(unknown, '010', 1, true), 'selected');
assert.equal(roundOptionStatus(unknown, '010', 0, true), 'neutral');
console.log('Rundenfeedback: falsche, richtige, unvollständige Mehrfachantworten und fehlende Schlüssel geprüft.');
