const ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0',
  auml: 'ä', Auml: 'Ä', ouml: 'ö', Ouml: 'Ö', uuml: 'ü', Uuml: 'Ü', szlig: 'ß',
  deg: '°', micro: 'µ', times: '×', divide: '÷', plusmn: '±', le: '≤', ge: '≥',
  leq: '≤', geq: '≥', ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’',
  ldquo: '“', rdquo: '”', bdquo: '„', hellip: '…', sup2: '²', sup3: '³', euro: '€',
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', mu: 'μ', pi: 'π',
  sigma: 'σ', tau: 'τ', omega: 'ω', Delta: 'Δ', Omega: 'Ω',
};

const MOJIBAKE: Record<string, string> = {
  'Ã¤': 'ä', 'Ã¶': 'ö', 'Ã¼': 'ü', 'ÃŸ': 'ß', 'Ã„': 'Ä', 'Ã–': 'Ö', 'Ãœ': 'Ü',
  'â€ž': '„', 'â€œ': '“', 'â€\u009d': '”', 'â€™': '’', 'â€˜': '‘', 'â€“': '–', 'â€”': '—',
  'â€¦': '…', 'â‰¤': '≤', 'â‰¥': '≥', 'Â°': '°', 'Âµ': 'µ', 'Â²': '²', 'Â³': '³', 'Â\u00a0': '\u00a0',
};
const BROKEN_SEQUENCES = Object.keys(MOJIBAKE);

type TextToken = { sourceStart: number; sourceEnd: number; displayStart: number; displayEnd: number };
export type DisplayText = { text: string; sourceOffsets: number[]; tokens: TextToken[] };

function decodeEntity(name: string): string | undefined {
  if (!name.startsWith('#')) return ENTITIES[name];
  const value = name[1]?.toLowerCase() === 'x' ? parseInt(name.slice(2), 16) : Number(name.slice(1));
  if (!Number.isInteger(value) || value < 32 || value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) return undefined;
  return String.fromCodePoint(value);
}

/** Plain text only. Keep original offsets so existing highlights survive corrected display text. */
export function displayTextWithOffsets(source: string): DisplayText {
  let text = '';
  const sourceOffsets = [0];
  const tokens: TextToken[] = [];
  for (let index = 0; index < source.length;) {
    let raw = String.fromCodePoint(source.codePointAt(index)!);
    let displayed = raw;
    if (source[index] === '&') {
      const match = source.slice(index).match(/^&(?:amp;){0,3}([a-zA-Z]+|#\d+|#x[\da-fA-F]+);/);
      const decoded = match ? decodeEntity(match[1]) : undefined;
      if (match && decoded !== undefined) { raw = match[0]; displayed = decoded; }
    } else {
      const broken = /[ÃÂâ]/.test(raw) ? BROKEN_SEQUENCES.find((sequence) => source.startsWith(sequence, index)) : undefined;
      if (broken) { raw = broken; displayed = MOJIBAKE[broken]; }
      else if (/[aAoOuU]/.test(raw) && source[index + 1] === '\u0308') {
        raw = source.slice(index, index + 2); displayed = raw.normalize('NFC');
      }
    }
    const displayStart = text.length;
    text += displayed;
    tokens.push({ sourceStart: index, sourceEnd: index + raw.length, displayStart, displayEnd: text.length });
    for (let unit = 1; unit <= displayed.length; unit++) {
      sourceOffsets.push(raw === displayed ? index + unit : unit === displayed.length ? index + raw.length : index);
    }
    index += raw.length;
  }
  return { text, sourceOffsets, tokens };
}

export function displayText(source: string): string {
  if (!/[&ÃÂâ\u0308]/.test(source)) return source;
  return displayTextWithOffsets(source).text;
}

export function displayHighlightRanges(
  decoded: DisplayText,
  ranges: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> {
  return ranges.flatMap((range) => {
    if (range.start < 0 || range.end > decoded.sourceOffsets.at(-1)! || range.end <= range.start) return [];
    const touched = decoded.tokens.filter((token) => token.sourceStart < range.end && token.sourceEnd > range.start);
    if (!touched.length) return [];
    return [{ start: touched[0].displayStart, end: touched.at(-1)!.displayEnd }];
  });
}
