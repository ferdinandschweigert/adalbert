import type { OptionRationale, ParsedQuestion } from '@/lib/altfragenTypes';

function letter(i: number): string {
  return String.fromCharCode(65 + i);
}

/** Build Amboss search URL from free text. */
export function ambossSearchUrl(query: string): string {
  const q = query.replace(/\s+/g, ' ').trim().slice(0, 120);
  return `https://www.amboss.com/de/search?q=${encodeURIComponent(q)}`;
}

export function wikipediaSearchUrl(query: string): string {
  const q = query.replace(/\s+/g, ' ').trim().slice(0, 120);
  return `https://de.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`;
}

/**
 * Extract a short search phrase from question stem (strip IDs / fluff).
 */
export function searchPhraseFromQuestion(question: string): string {
  return question
    .replace(/^\[T\d+_\d+\]\s*/, '')
    .replace(/\b(am ehesten|welche[sr]?|folgend[een]+|nicht)\b/gi, ' ')
    .replace(/[^\wäöüÄÖÜß\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 10)
    .join(' ');
}

/**
 * Ensure every option has an Amboss-style why / why-not rationale + links.
 * Uses existing rationales when present; fills gaps from the answer key.
 */
export function ensureOptionRationales(q: ParsedQuestion): OptionRationale[] {
  const bits = (q.correctAnswers || '').padEnd(q.options.length, '0');
  const existing = new Map((q.optionRationales || []).map((r) => [r.index, r]));
  const topic = searchPhraseFromQuestion(q.question);
  const correctLetters = bits
    .split('')
    .map((b, i) => (b === '1' ? letter(i) : null))
    .filter(Boolean)
    .join(', ');

  return q.options.map((opt, index) => {
    const prev = existing.get(index);
    if (prev?.text) return prev;
    const correct = bits[index] === '1';
    const optTopic = `${opt} ${topic}`.trim().slice(0, 100);
    const text = correct
      ? `Richtig: ${opt} entspricht der markierten Lösung im Gedächtnisprotokoll` +
        (correctLetters ? ` (${correctLetters}).` : '.') +
        ` Kurz erklärt: Diese Option passt am ehesten zum klinischen Kontext der Frage.`
      : `Falsch: ${opt} ist nicht die markierte Lösung` +
        (correctLetters ? ` (richtig: ${correctLetters}).` : '.') +
        ` Typische Fehlerquelle — mit der richtigen Option vergleichen und den Leitbefund der Frage im Blick behalten.`;

    return {
      index,
      correct,
      text,
      links: [
        { label: 'Amboss suchen', url: ambossSearchUrl(optTopic) },
        { label: 'Wikipedia', url: wikipediaSearchUrl(opt) },
      ],
    };
  });
}

/** Attach rationales to all questions of an exam (mutates copy). */
export function withEnsuredRationales(questions: ParsedQuestion[]): ParsedQuestion[] {
  return questions.map((q) => ({
    ...q,
    optionRationales: ensureOptionRationales(q),
  }));
}
