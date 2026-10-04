import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { displayText, displayTextWithOffsets, displayHighlightRanges } from '../src/lib/altfragenText.ts';

assert.equal(displayText('M&uuml;digkeit, &Ouml;deme, &#228;, &#xDF;, &gt; 38,5 &deg;C'), 'Müdigkeit, Ödeme, ä, ß, > 38,5 °C');
assert.equal(displayText('Ã„rzte: erhÃ¶ht â€“ 37 Â°C'), 'Ärzte: erhöht – 37 °C');
assert.equal(displayText('a\u0308, o\u0308, u\u0308'), 'ä, ö, ü');
assert.equal(displayText('A &amp; B; &amp;ouml;'), 'A & B; ö');
assert.equal(displayText('ä ö ü Ä Ö Ü ß ≥ µ ² &unknown; &#0;'), 'ä ö ü Ä Ö Ü ß ≥ µ ² &unknown; &#0;');
assert.equal(displayText('&lt;script&gt;alert(1)&lt;/script&gt;'), '<script>alert(1)</script>');

const original = 'M&uuml;digkeit &gt; 5';
const decoded = displayTextWithOffsets(original);
assert.equal(decoded.text, 'Müdigkeit > 5');
const displayEnd = decoded.text.indexOf('keit');
assert.equal(original.slice(decoded.sourceOffsets[0], decoded.sourceOffsets[displayEnd]), 'M&uuml;dig');
const start = original.indexOf('&gt;');
const ranges = displayHighlightRanges(decoded, [{ start, end: start + 4 }]);
assert.equal(decoded.text.slice(ranges[0].start, ranges[0].end), '>');
assert.equal(decoded.sourceOffsets.at(-1), original.length);

const bank = JSON.parse(readFileSync(new URL('../data/altfragen-bank.json', import.meta.url), 'utf8'));
const pdf = JSON.parse(readFileSync(new URL('./h25-kreuzversion-solutions.json', import.meta.url), 'utf8'));
const strings = bank.exams.flatMap((exam) => exam.questions.flatMap((question) => [
  question.question, question.explanation, question.topicLabel, ...question.options,
  ...(question.optionRationales || []).map((rationale) => rationale.text),
])).concat(pdf.flatMap((question) => [question.question, question.begruendung, ...question.options.map((option) => option.text)])).filter((text) => typeof text === 'string');
for (const text of strings) {
  assert.doesNotMatch(displayText(text), /&(?:amp;)*(?:[aAoOuU]uml|szlig|gt|lt|quot|deg|nbsp|#\d+|#x[\da-fA-F]+);|Ã[¤¶¼Ÿ„–œ]|\ufffd/);
}
console.log(`Alle ${strings.length} Fragetexte, Optionen und Erläuterungen geprüft; ${strings.filter((text) => text !== displayText(text)).length} Darstellungen korrigiert.`);

console.log('Textdarstellung: Umlaute, HTML-Entities, Unicode und erhaltene Markierungspositionen geprüft.');
