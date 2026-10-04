import assert from 'node:assert/strict';
import { addHighlight, removeHighlight, updateInlineNote, mergeInlineNotes } from '../src/lib/altfragenAnnotations.ts';
import { annotationForQuestion, emptyAnnotation, initializeRoundAnnotations, readAnnotations, readReview, saveAnnotation, saveReview } from '../src/lib/altfragenReview.ts';
import { displayTextWithOffsets, displayHighlightRanges } from '../src/lib/altfragenText.ts';

const original = [{ start: 20, end: 550 }, { start: 580, end: 600 }];
assert.deepEqual(addHighlight(original, { start: 500, end: 570 }), [{ start: 20, end: 570 }, { start: 580, end: 600 }]);
assert.deepEqual(original, [{ start: 20, end: 550 }, { start: 580, end: 600 }], 'existing ranges must not be mutated');
assert.deepEqual(addHighlight(original, { start: 20, end: 550 }), original, 'selecting the same text does not create duplicate controls');
assert.deepEqual(removeHighlight(original, { start: 30, end: 40 }), [{ start: 580, end: 600 }], 'a click removes its original highlight, preserving other marks');

const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
globalThis.window = { dispatchEvent: () => true };
const oldAnnotation = { ...emptyAnnotation(), highlights: original, note: 'Bestehende Gedanken', crossedOut: [2], starred: true, uncertain: true };
saveAnnotation('exam', 1, oldAnnotation);
const note = { id: 'note-1', start: 20, end: 550, text: 'Anmerkung an der Textstelle' };
saveAnnotation('exam', 1, updateInlineNote(readAnnotations()['exam:1'], note));
const reloaded = readAnnotations()['exam:1'];
assert.equal(reloaded.note, oldAnnotation.note);
assert.deepEqual(reloaded.crossedOut, [2]);
assert.equal(reloaded.starred, true);
assert.equal(reloaded.uncertain, true);
assert.deepEqual(reloaded.inlineNotes, [note], 'anchored notes survive reload');
saveAnnotation('exam', 1, { ...reloaded, highlights: removeHighlight(reloaded.highlights, { start: 30, end: 40 }) });
assert.deepEqual(readAnnotations()['exam:1'].inlineNotes, [note], 'removing yellow highlighting must not erase the note');
const importedNote = { id: 'note-2', start: 580, end: 600, text: 'Weitere Anmerkung aus Backup' };
assert.deepEqual(mergeInlineNotes([note], [{ ...note, text: 'Alter Text' }, importedNote]).sort((a, b) => a.id.localeCompare(b.id)), [note, importedNote], 'older backup supplements notes without overwriting local text');
assert.deepEqual(updateInlineNote(reloaded, { ...note, text: '' }).inlineNotes, [], 'clearing one inline note leaves the general question note intact');
assert.equal(updateInlineNote(reloaded, { ...note, text: '' }).note, 'Bestehende Gedanken');

// New rounds start blank while notes, priorities and classic marks remain available.
const classicBefore = readAnnotations()['exam:1'];
const firstRound = { id: 'first', annotationScope: 'round', title: 'Test', questions: [{ examId: 'exam', questionNumber: 1 }], currentIndex: 0, selections: { 'exam:1': '010' }, checked: ['exam:1'], activeMs: { 'exam:1': 60000 }, pauseSeconds: 60, createdAt: '' };
saveReview({ attempts: [{ sessionId: 'first', examId: 'exam', questionNumber: 1, selection: '010', correct: false, at: '2026-10-04' }], sessions: [firstRound] });
const reviewBefore = readReview();
const fresh = annotationForQuestion(readAnnotations(), 'exam', 1, 'first');
assert.deepEqual(fresh.highlights, [], 'new rounds do not inherit classic highlights');
assert.deepEqual(fresh.crossedOut, [], 'new rounds do not inherit crossed out answers');
assert.deepEqual(fresh.inlineNotes, [note], 'personal inline notes remain available');
assert.equal(fresh.note, 'Bestehende Gedanken');
assert.equal(fresh.starred, true);
assert.equal(fresh.uncertain, true);
saveAnnotation('exam', 1, { ...fresh, highlights: [{ start: 5, end: 15 }], crossedOut: [0] }, 'first');
assert.deepEqual(annotationForQuestion(readAnnotations(), 'exam', 1, 'first').highlights, [{ start: 5, end: 15 }], 'round marks survive storage reload');
assert.deepEqual(annotationForQuestion(readAnnotations(), 'exam', 1, 'second').highlights, [], 'the next round is independent');
assert.deepEqual(annotationForQuestion(readAnnotations(), 'exam', 1, 'second').crossedOut, []);
saveAnnotation('exam', 1, { ...annotationForQuestion(readAnnotations(), 'exam', 1, 'second'), crossedOut: [1] }, 'second');
assert.deepEqual(annotationForQuestion(readAnnotations(), 'exam', 1, 'first').crossedOut, [0], 'editing a second round does not change the first');
assert.deepEqual(readAnnotations()['exam:1'], classicBefore, 'classic marks and personal notes are unchanged');
assert.deepEqual(readReview(), reviewBefore, 'annotation changes cannot change answers, attempts or active time');

const legacy = { ...firstRound, id: 'legacy', annotationScope: undefined };
const migrated = initializeRoundAnnotations(legacy);
assert.equal(migrated.annotationScope, 'round');
assert.deepEqual(annotationForQuestion(readAnnotations(), 'exam', 1, 'legacy').highlights, classicBefore.highlights, 'old saved rounds keep their existing visible marks');
saveAnnotation('exam', 1, { ...annotationForQuestion(readAnnotations(), 'exam', 1, 'legacy'), highlights: [] }, 'legacy');
initializeRoundAnnotations(legacy);
assert.deepEqual(annotationForQuestion(readAnnotations(), 'exam', 1, 'legacy').highlights, [], 'legacy migration cannot restore removed round marks');
assert.deepEqual(readAnnotations()['exam:1'], classicBefore, 'migration never deletes old data');
assert.strictEqual(initializeRoundAnnotations(firstRound), firstRound, 'new rounds never receive legacy marks');

const source = 'Übelkeit und Größe &gt; 10 mm';
const decoded = displayTextWithOffsets(source);
const start = decoded.text.indexOf('Größe');
const rawRange = { start: decoded.sourceOffsets[start], end: decoded.sourceOffsets[decoded.text.length] };
assert.deepEqual(displayHighlightRanges(decoded, [rawRange]), [{ start, end: decoded.text.length }], 'direct selection and inline notes retain raw offsets across corrected characters');
console.log('Direkte Markierungen, rundenweise Trennung, Altbestand, Anmerkungen, Speicherung und ergänzende Backup-Zusammenführung geprüft.');
