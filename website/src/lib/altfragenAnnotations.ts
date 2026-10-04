import type { InlineNote, QuestionAnnotation } from './altfragenReview';

type TextRange = { start: number; end: number };

export function addHighlight(ranges: TextRange[], selected: TextRange): TextRange[] {
  const sorted = [...ranges, selected]
    .filter((range) => Number.isInteger(range.start) && Number.isInteger(range.end) && range.start >= 0 && range.end > range.start)
    .sort((a, b) => a.start - b.start);
  const merged: TextRange[] = [];
  for (const range of sorted) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

export function removeHighlight(ranges: TextRange[], clicked: TextRange): TextRange[] {
  return ranges.filter((range) => range.end <= clicked.start || range.start >= clicked.end);
}

export function updateInlineNote(annotation: QuestionAnnotation, note: InlineNote): QuestionAnnotation {
  const otherNotes = (annotation.inlineNotes || []).filter((item) => item.id !== note.id);
  return { ...annotation, inlineNotes: note.text.trim() ? [...otherNotes, note] : otherNotes };
}

/** Current local notes win when an older backup contains the same note. */
export function mergeInlineNotes(local: InlineNote[] = [], imported: InlineNote[] = []): InlineNote[] {
  return [...new Map([...imported, ...local].map((note) => [note.id, note])).values()];
}
