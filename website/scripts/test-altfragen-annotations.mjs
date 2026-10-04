import assert from 'node:assert/strict';
import { addHighlight, removeHighlight, updateInlineNote, mergeInlineNotes } from '../src/lib/altfragenAnnotations.ts';
import { emptyAnnotation, readAnnotations, saveAnnotation } from '../src/lib/altfragenReview.ts';
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

const source = 'Übelkeit und Größe &gt; 10 mm';
const decoded = displayTextWithOffsets(source);
const start = decoded.text.indexOf('Größe');
const rawRange = { start: decoded.sourceOffsets[start], end: decoded.sourceOffsets[decoded.text.length] };
assert.deepEqual(displayHighlightRanges(decoded, [rawRange]), [{ start, end: decoded.text.length }], 'direct selection and inline notes retain raw offsets across corrected characters');
console.log('Direkte Markierungen, Anmerkungen, Speicherung und ergänzende Backup-Zusammenführung geprüft.');
