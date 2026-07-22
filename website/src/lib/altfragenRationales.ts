import type { OptionRationale, ParsedQuestion } from '@/lib/altfragenTypes';
import { buildLlmConfig, generateTextWithFallback } from '@/lib/llmClient';

function letter(i: number): string {
  return String.fromCharCode(65 + i);
}

export function ambossSearchUrl(query: string): string {
  const q = query.replace(/\s+/g, ' ').trim().slice(0, 100);
  // next.amboss.com is the real library search (www.amboss.com/de/search is 404)
  return `https://next.amboss.com/de/search?q=${encodeURIComponent(q)}`;
}

export function flexikonSearchUrl(query: string): string {
  const q = query.replace(/\s+/g, ' ').trim().slice(0, 80);
  return `https://flexikon.doccheck.com/de/Spezial:Suche?search=${encodeURIComponent(q)}`;
}

export function wikipediaSearchUrl(query: string): string {
  const q = query.replace(/\s+/g, ' ').trim().slice(0, 100);
  return `https://de.wikipedia.org/w/index.php?search=${encodeURIComponent(q)}`;
}

function cleanTerm(raw: string): string {
  return raw
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[?!.]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function isPlaceholderRationale(text: string | undefined): boolean {
  if (!text) return true;
  return (
    text.includes('markierten Lösung im Gedächtnisprotokoll') ||
    text.includes('Keine grüne Markierung') ||
    text.includes('Typische Fehlerquelle — mit der richtigen Option')
  );
}

interface WikiHit {
  title: string;
  url: string;
  extract: string;
}

async function wikipediaSummary(term: string): Promise<WikiHit | null> {
  const q = cleanTerm(term);
  if (q.length < 3) return null;
  const headers = {
    'User-Agent': 'AdalbertAltfragen/1.0 (educational; contact: github.com/ferdinandschweigert/adalbert)',
    Accept: 'application/json',
  };
  try {
    // Resolve title (follows redirects)
    const searchRes = await fetch(
      `https://de.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=5&format=json&origin=*`,
      { headers, signal: AbortSignal.timeout(10000) }
    );
    if (!searchRes.ok) return null;
    const search = (await searchRes.json()) as [string, string[], string[], string[]];
    const titles = search[1] || [];
    let title = '';
    for (const t of titles) {
      const low = t.toLowerCase();
      if (
        low.includes('postleitzahl') ||
        low.includes('prostitution') ||
        low.includes('film') ||
        low.includes('band ') ||
        low.includes('posen')
      ) {
        continue;
      }
      title = t;
      break;
    }
    if (!title && titles[0]) title = titles[0];
    if (!title) return null;

    const queryUrl =
      `https://de.wikipedia.org/w/api.php?action=query&redirects=1&titles=${encodeURIComponent(title)}` +
      `&prop=extracts&exintro=1&explaintext=1&format=json&origin=*`;
    const sumRes = await fetch(queryUrl, { headers, signal: AbortSignal.timeout(10000) });
    if (!sumRes.ok) return null;
    const sum = (await sumRes.json()) as {
      query?: { pages?: Record<string, { title?: string; extract?: string; missing?: string }> };
    };
    const page = Object.values(sum.query?.pages || {})[0];
    if (!page || page.missing != null) return null;
    const extract = (page.extract || '').replace(/\s+/g, ' ').trim().slice(0, 420);
    if (!extract || extract.length < 40) return null;
    const pageTitle = page.title || title;
    return {
      title: pageTitle,
      url: `https://de.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`,
      extract,
    };
  } catch {
    return null;
  }
}

function defaultLinks(opt: string, topic: string): OptionRationale['links'] {
  const q = `${cleanTerm(opt)} ${topic}`.trim();
  return [
    { label: 'Amboss (Login)', url: ambossSearchUrl(q || opt) },
    { label: 'DocCheck Flexikon', url: flexikonSearchUrl(opt) },
    { label: 'Wikipedia', url: wikipediaSearchUrl(opt) },
  ];
}

/**
 * Build real-ish rationales: Wikipedia extracts + stem context.
 * Optionally upgrades via LLM when API keys exist.
 */
export async function buildRealOptionRationales(
  q: ParsedQuestion,
  opts?: { preferLlm?: boolean }
): Promise<OptionRationale[]> {
  const bits = (q.correctAnswers || '').padEnd(q.options.length, '0');
  const correctLetters = bits
    .split('')
    .map((b, i) => (b === '1' ? letter(i) : null))
    .filter(Boolean)
    .join(', ');
  const stem = q.question.replace(/^\[T\d+_\d+\]\s*/, '').trim();
  const topic = stem.split(/\s+/).slice(0, 8).join(' ');

  // Try LLM first when requested / available
  if (opts?.preferLlm !== false) {
    try {
      const llm = await buildLlmRationales(q);
      if (llm?.length) return llm;
    } catch {
      // fall through to Wikipedia
    }
  }

  const wikiHits = await Promise.all(q.options.map((opt) => wikipediaSummary(opt)));

  return q.options.map((opt, index) => {
    const correct = bits[index] === '1';
    const wiki = wikiHits[index];
    const links = defaultLinks(opt, topic) || [];
    if (wiki) {
      links[2] = { label: `Wikipedia: ${wiki.title}`, url: wiki.url };
    }

    let text: string;
    if (correct) {
      text = wiki
        ? `Richtig (${letter(index)}). ${wiki.extract} — Das passt zum Fall: „${stem.slice(0, 160)}${stem.length > 160 ? '…' : ''}“.`
        : `Richtig (${letter(index)}): ${opt} ist die markierte Lösung. Fallbezug: „${stem.slice(0, 180)}${stem.length > 180 ? '…' : ''}“.`;
    } else {
      text = wiki
        ? `Falsch (${letter(index)}). ${wiki.extract} — Im vorliegenden Fall ist das nicht die beste Antwort; markiert ist ${correctLetters || 'eine andere Option'}.`
        : `Falsch (${letter(index)}): ${opt} ist nicht die markierte Lösung (richtig: ${correctLetters || 's. Schlüssel'}). Fall: „${stem.slice(0, 140)}${stem.length > 140 ? '…' : ''}“.`;
    }

    return { index, correct, text: text.slice(0, 700), links };
  });
}

async function buildLlmRationales(q: ParsedQuestion): Promise<OptionRationale[] | null> {
  let llmConfig;
  try {
    llmConfig = buildLlmConfig({});
  } catch {
    return null;
  }
  if (!llmConfig.providers.length) return null;

  const bits = (q.correctAnswers || '').padEnd(q.options.length, '0');
  const optionsText = q.options
    .map((opt, i) => `${letter(i)}) ${opt} [${bits[i] === '1' ? 'RICHTIG' : 'falsch'}]`)
    .join('\n');

  const prompt = `Du bist ein erfahrener Prüfer und Tutor für das deutsche 2. Staatsexamen (M2), Amboss-Stil.
Ziel: fachlich KORREKTE Erklärungen. Länge darf variieren — lieber etwas ausführlicher und klar als knapp und unklar. Keine erfundenen Fakten, Dosierungen oder Leitlinienjahre.

Harte Regeln:
- Der Lösungsschlüssel unten ist verbindlich und darf NICHT umgedeutet werden.
- Jede Option erklären (warum richtig/falsch), konkret zum Fall.
- Distraktoren: Denkfehler/Abgrenzung (meist 2–4 Sätze).
- explanation: ausführlichere Lösungs-Erklärung (ca. 4–8 Sätze): Warum richtig, relevante Definition/Klinik/Abgrenzung, nur belastbare Merksätze.
- Bei Unsicherheit: kürzer und vorsichtiger formulieren, nichts spekulieren.
- Output NUR valides JSON.

Frage:
${q.question}

Optionen (Schlüssel aus Gedächtnisprotokoll, grün markiert):
${optionsText}

Antworte NUR mit JSON:
{
  "topicLabel": "Kurzer Amboss-Themenname",
  "explanation": "Ausführliche Lösungs-Erklärung auf Deutsch",
  "confidence": "high",
  "rationales": [
    {
      "index": 0,
      "correct": false,
      "text": "Erklärung warum richtig/falsch, fallbezogen",
      "searchTerms": ["Amboss-Suchbegriff"]
    }
  ]
}`;

  const raw = await generateTextWithFallback(prompt, llmConfig);
  let jsonText = raw.trim().replace(/^```(?:json)?\n?/m, '').replace(/```$/m, '');
  const match = jsonText.match(/\{[\s\S]*\}/);
  if (match) jsonText = match[0];
  const parsed = JSON.parse(jsonText) as {
    topicLabel?: string;
    explanation?: string;
    confidence?: 'high' | 'low';
    rationales?: Array<{ index?: number; correct?: boolean; text?: string; searchTerms?: string[] }>;
  };
  const list = parsed.rationales || [];
  if (!list.length) return null;

  const stem = q.question.replace(/^\[T\d+_\d+\]\s*/, '');
  return q.options.map((opt, index) => {
    const row = list.find((r) => r.index === index);
    const correct = bits[index] === '1';
    const term = row?.searchTerms?.[0] || opt;
    return {
      index,
      correct,
      text: (row?.text || `${correct ? 'Richtig' : 'Falsch'}: ${opt}`).slice(0, 2000),
      links: defaultLinks(term, stem.slice(0, 40)),
    };
  });
}

// Keep companion export used when explanation is generated alongside rationales
export type LlmExplanationBundle = {
  topicLabel?: string;
  explanation?: string;
  confidence?: 'high' | 'low';
  optionRationales: OptionRationale[];
};

export function needsRealExplanations(q: ParsedQuestion): boolean {
  if (!q.optionRationales?.length) return true;
  return q.optionRationales.some((r) => isPlaceholderRationale(r.text));
}

export function withFixedLinksOnly(q: ParsedQuestion): OptionRationale[] {
  const bits = (q.correctAnswers || '').padEnd(q.options.length, '0');
  const stem = q.question.replace(/^\[T\d+_\d+\]\s*/, '');
  const topic = stem.split(/\s+/).slice(0, 8).join(' ');
  return q.options.map((opt, index) => {
    const prev = q.optionRationales?.find((r) => r.index === index);
    return {
      index,
      correct: bits[index] === '1',
      text: prev?.text && !isPlaceholderRationale(prev.text) ? prev.text : '',
      links: defaultLinks(opt, topic),
    };
  });
}

// Keep old name used by exam route
export async function ensureOptionRationalesAsync(q: ParsedQuestion): Promise<OptionRationale[]> {
  if (!needsRealExplanations(q) && q.optionRationales?.every((r) => r.links?.length)) {
    // still fix Amboss URLs if old
    return q.optionRationales.map((r) => ({
      ...r,
      links: (r.links || []).map((l) =>
        l.url.includes('www.amboss.com/de/search')
          ? { ...l, label: l.label.includes('Amboss') ? 'Amboss (Login)' : l.label, url: l.url.replace('https://www.amboss.com/de/search', 'https://next.amboss.com/de/search') }
          : l
      ),
    }));
  }
  return buildRealOptionRationales(q);
}

/** Sync fallback for bank baking / ensure without network */
export function ensureOptionRationales(q: ParsedQuestion): OptionRationale[] {
  const bits = (q.correctAnswers || '').padEnd(q.options.length, '0');
  const existing = new Map((q.optionRationales || []).map((r) => [r.index, r]));
  const stem = q.question.replace(/^\[T\d+_\d+\]\s*/, '');
  const topic = stem.split(/\s+/).slice(0, 8).join(' ');
  const correctLetters = bits
    .split('')
    .map((b, i) => (b === '1' ? letter(i) : null))
    .filter(Boolean)
    .join(', ');

  return q.options.map((opt, index) => {
    const prev = existing.get(index);
    if (prev?.text && !isPlaceholderRationale(prev.text)) {
      return {
        ...prev,
        links: defaultLinks(opt, topic),
      };
    }
    const correct = bits[index] === '1';
    return {
      index,
      correct,
      text: correct
        ? `Richtig (${letter(index)}): ${opt}. Fallbezug: „${stem.slice(0, 180)}${stem.length > 180 ? '…' : ''}“.`
        : `Falsch (${letter(index)}): ${opt} — nicht die Lösung (richtig: ${correctLetters}).`,
      links: defaultLinks(opt, topic),
    };
  });
}

export function withEnsuredRationales(questions: ParsedQuestion[]): ParsedQuestion[] {
  return questions.map((q) => ({
    ...q,
    optionRationales: ensureOptionRationales(q),
  }));
}
