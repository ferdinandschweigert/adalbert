/**
 * Browser → local AnkiConnect (127.0.0.1:8765).
 * Vercel never reaches the user's Anki; only the browser on the same machine does.
 * Requires AnkiConnect webCorsOriginList to include the hosted origin.
 */

export const ANKICONNECT_URL = 'http://127.0.0.1:8765';

export class AnkiConnectError extends Error {
  constructor(
    message: string,
    public readonly kind: 'offline' | 'cors' | 'anki' | 'unknown' = 'unknown'
  ) {
    super(message);
    this.name = 'AnkiConnectError';
  }
}

export async function ankiRequest<T = unknown>(
  action: string,
  params?: Record<string, unknown>,
  version = 6
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(ANKICONNECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version, params }),
    });
  } catch {
    throw new AnkiConnectError(
      'AnkiConnect nicht erreichbar. Anki Desktop muss laufen und AnkiConnect (Add-on 2055492159) installiert sein. ' +
        'Auf der Live-Site muss die Domain in webCorsOriginList stehen (siehe Setup unten).',
      'offline'
    );
  }

  if (!response.ok) {
    throw new AnkiConnectError(`AnkiConnect HTTP ${response.status}`, 'anki');
  }

  const data = (await response.json()) as { result?: T; error?: string | null };
  if (data.error) {
    throw new AnkiConnectError(`AnkiConnect: ${data.error}`, 'anki');
  }
  return data.result as T;
}

export async function pingAnkiConnect(): Promise<number> {
  return ankiRequest<number>('version');
}

export async function listDecks(): Promise<string[]> {
  await pingAnkiConnect();
  return ankiRequest<string[]>('deckNames');
}

function sanitizeForPrompt(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface BrowserAnkiCard {
  front: string;
  back: string;
  question: string;
  options: string[];
  answers: string;
  qType: number;
  noteId?: number;
  tags?: string[];
  noteType?: string;
}

export async function getCardsFromDeck(deckName: string): Promise<{
  cards: BrowserAnkiCard[];
  count: number;
}> {
  await pingAnkiConnect();
  const noteIds = await ankiRequest<number[]>('findNotes', {
    query: `deck:"${deckName.replace(/"/g, '')}"`,
  });

  if (!noteIds?.length) {
    return { cards: [], count: 0 };
  }

  const notesInfo = await ankiRequest<
    Array<{
      noteId?: number;
      fields?: Record<string, { value?: string }>;
      tags?: string[];
      modelName?: string;
    }>
  >('notesInfo', { notes: noteIds });

  const cards: BrowserAnkiCard[] = notesInfo.map((note) => {
    const fields = note.fields || {};
    const question =
      fields['Question']?.value ||
      fields['Frage']?.value ||
      fields['Front']?.value ||
      fields['Text']?.value ||
      fields['Cloze']?.value ||
      '';
    const options: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const option = fields[`Q_${i}`]?.value || '';
      if (option && option.trim().length > 0) options.push(option.trim());
    }
    const answers =
      fields['Answers']?.value || fields['Antwort']?.value || fields['Back']?.value || '';
    const qTypeStr =
      fields['QType (0=kprim,1=mc,2=sc)']?.value || fields['QType']?.value || '0';
    const qType = parseInt(qTypeStr, 10) || 0;
    const front = question.trim() || (fields['Text']?.value || '').trim();

    return {
      front,
      back: answers.trim(),
      question: front,
      options,
      answers: answers.trim(),
      qType,
      noteId: note.noteId,
      tags: note.tags || [],
      noteType: note.modelName || 'Unknown',
    };
  });

  return { cards, count: cards.length };
}

/** Cards shaped for LLM enrich / prioritize endpoints. */
export function toEnrichPayload(cards: BrowserAnkiCard[]) {
  return cards
    .map((c) => ({
      front: sanitizeForPrompt(c.front),
      back: c.back,
      options: c.options.map(sanitizeForPrompt),
      answers: c.answers,
      id: c.noteId != null ? String(c.noteId) : undefined,
      tags: c.tags || [],
    }))
    .filter((c) => c.front);
}

export interface EnrichmentCardInput {
  front: string;
  back: string;
  options?: string[];
  originalAnswers?: string;
  lösung: string;
  erklärung: string;
  bewertungsTabelle?: Array<{ aussage: string; bewertung: string; begründung: string }>;
  zusammenfassung?: string;
  eselsbrücke: string;
  referenz: string;
  extra1?: string;
}

export function formatEnrichmentHtml(card: EnrichmentCardInput): string {
  const parts: string[] = [];

  if (card.lösung) {
    parts.push(
      `<div style="background:#e3f2fd;padding:10px;margin:5px 0;border-left:3px solid #2196F3"><b>Lösung:</b> ${card.lösung}</div>`
    );
  }

  if (card.bewertungsTabelle && card.bewertungsTabelle.length > 0) {
    let table =
      '<table style="width:100%;border-collapse:collapse;font-size:14px;margin:10px 0">';
    table +=
      '<tr style="background:#f5f5f5"><th style="text-align:left;padding:6px;border:1px solid #ddd">Aussage</th><th style="width:30px;padding:6px;border:1px solid #ddd"></th><th style="text-align:left;padding:6px;border:1px solid #ddd">Begründung</th></tr>';
    for (const row of card.bewertungsTabelle) {
      const isCorrect = row.bewertung === 'Richtig' || row.bewertung === 'Yes';
      const symbol = isCorrect
        ? '<span style="color:green">✓</span>'
        : '<span style="color:red">✗</span>';
      table += `<tr><td style="padding:6px;border:1px solid #ddd">${row.aussage}</td><td style="text-align:center;padding:6px;border:1px solid #ddd">${symbol}</td><td style="padding:6px;border:1px solid #ddd">${row.begründung}</td></tr>`;
    }
    table += '</table>';
    parts.push(table);
  }

  if (card.zusammenfassung) {
    parts.push(
      `<div style="background:#e8f5e9;padding:10px;margin:5px 0;border-left:3px solid #4CAF50"><b>Zusammenfassung:</b> ${card.zusammenfassung}</div>`
    );
  }

  if (card.erklärung && (!card.bewertungsTabelle || card.bewertungsTabelle.length === 0)) {
    parts.push(
      `<div style="background:#f5f5f5;padding:10px;margin:5px 0"><b>Erklärung:</b> ${card.erklärung}</div>`
    );
  }

  if (card.eselsbrücke) {
    parts.push(
      `<div style="background:#fff3cd;padding:10px;margin:5px 0;border-left:3px solid #ffc107"><b>Eselsbrücke:</b> ${card.eselsbrücke}</div>`
    );
  }

  if (card.referenz) {
    parts.push(
      `<div style="color:#666;font-size:12px;margin:5px 0"><b>Referenz:</b> ${card.referenz}</div>`
    );
  }

  if (card.extra1) {
    parts.push(
      `<div style="background:#f3e5f5;padding:10px;margin:5px 0;border-left:3px solid #9c27b0"><b>Hinweis:</b> ${card.extra1}</div>`
    );
  }

  return parts.join('');
}

function normalizeForSearch(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export async function syncEnrichedToAnki(
  sourceDeck: string,
  cards: EnrichmentCardInput[],
  dryRun = false
): Promise<{
  updated: number;
  wouldUpdate: number;
  alreadyEnriched: number;
  missingTargetField: number;
  notFound: number;
  total: number;
  dryRun: boolean;
  message: string;
  errors: string[];
}> {
  await pingAnkiConnect();
  const deckQuery = sourceDeck.replace(' (angereichert)', '').replace(/"/g, '');
  const noteIds = await ankiRequest<number[]>('findNotes', {
    query: `deck:"${deckQuery}"`,
  });

  if (!noteIds?.length) {
    throw new AnkiConnectError(`Keine Karten im Deck "${sourceDeck}" gefunden`, 'anki');
  }

  const notesInfo = await ankiRequest<
    Array<{
      noteId: number;
      fields: Record<string, { value: string }>;
      modelName: string;
    }>
  >('notesInfo', { notes: noteIds });

  const questionToNote = new Map<
    string,
    { noteId: number; modelName: string; fields: Record<string, { value: string }> }
  >();
  for (const note of notesInfo) {
    const question =
      note.fields['Question']?.value ||
      note.fields['Frage']?.value ||
      note.fields['Front']?.value ||
      note.fields['Text']?.value ||
      '';
    if (question) {
      questionToNote.set(normalizeForSearch(question), note);
    }
  }

  let updated = 0;
  let wouldUpdate = 0;
  let alreadyEnriched = 0;
  let missingTargetField = 0;
  let notFound = 0;
  const errors: string[] = [];

  for (const card of cards) {
    const matchingNote = questionToNote.get(normalizeForSearch(card.front));
    if (!matchingNote) {
      notFound++;
      continue;
    }

    const fields = matchingNote.fields;
    let targetField = '';
    if ('Extra 1' in fields) targetField = 'Extra 1';
    else if ('Sources' in fields) targetField = 'Sources';
    else if ('Extra' in fields) targetField = 'Extra';
    else if ('Hinweis' in fields) targetField = 'Hinweis';
    else if ('Zusatz' in fields) targetField = 'Zusatz';
    else {
      for (const fieldName of Object.keys(fields)) {
        const lower = fieldName.toLowerCase();
        if (
          lower.includes('extra') ||
          lower.includes('source') ||
          lower.includes('hinweis') ||
          lower.includes('zusatz')
        ) {
          targetField = fieldName;
          break;
        }
      }
    }

    if (!targetField) {
      missingTargetField += 1;
      errors.push(
        `Kein Extra 1/Sources Feld für: ${card.front.substring(0, 50)}... (Felder: ${Object.keys(fields).join(', ')})`
      );
      continue;
    }

    const existingContent = fields[targetField]?.value || '';
    const hasEnrichment =
      existingContent.includes('Lösung:') ||
      existingContent.includes('Erklärung:') ||
      existingContent.includes('Bewertungstabelle') ||
      existingContent.includes('Zusammenfassung:');

    if (hasEnrichment) {
      alreadyEnriched += 1;
      continue;
    }

    if (dryRun) {
      wouldUpdate += 1;
      continue;
    }

    try {
      await ankiRequest('updateNoteFields', {
        note: {
          id: matchingNote.noteId,
          fields: {
            [targetField]: formatEnrichmentHtml(card),
          },
        },
      });
      updated++;
    } catch (e) {
      errors.push(`Update fehlgeschlagen: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const message =
    `${dryRun ? wouldUpdate : updated} Karten ${dryRun ? 'würden aktualisiert' : 'aktualisiert'}` +
    (notFound > 0 ? `, ${notFound} nicht gefunden` : '') +
    (alreadyEnriched > 0 ? `, ${alreadyEnriched} bereits angereichert` : '') +
    (missingTargetField > 0 ? `, ${missingTargetField} ohne Ziel-Feld` : '') +
    (errors.length > 0 ? `. Fehler: ${errors.slice(0, 3).join('; ')}` : '');

  return {
    updated,
    wouldUpdate,
    alreadyEnriched,
    missingTargetField,
    notFound,
    total: cards.length,
    dryRun,
    message,
    errors,
  };
}

export interface ParsedQuestion {
  number: number;
  question: string;
  options: string[];
  type: 'SC' | 'MC' | 'KPRIM';
  correctAnswers?: string;
  explanation?: string;
}

function getQType(type: string): number {
  switch (type) {
    case 'KPRIM':
      return 0;
    case 'MC':
      return 1;
    case 'SC':
      return 2;
    default:
      return 2;
  }
}

export async function importQuestionsToAnki(
  deckName: string,
  questions: ParsedQuestion[],
  modelName = 'Amboss_Fragen'
): Promise<{ imported: number; total: number; errors?: string[]; message: string }> {
  await pingAnkiConnect();

  const decks = await ankiRequest<string[]>('deckNames');
  if (!decks.includes(deckName)) {
    await ankiRequest('createDeck', { deck: deckName });
  }

  const models = await ankiRequest<string[]>('modelNames');
  if (!models.includes(modelName)) {
    throw new AnkiConnectError(
      `Model "${modelName}" nicht gefunden. Verfügbar: ${models.slice(0, 5).join(', ')}...`,
      'anki'
    );
  }

  const notes = questions.map((q) => {
    const options = [...q.options];
    while (options.length < 5) options.push('');
    const answers = (q.correctAnswers || '00000').padEnd(5, '0').split('').slice(0, 5).join(' ');

    return {
      deckName,
      modelName,
      fields: {
        Question: q.question,
        'QType (0=kprim,1=mc,2=sc)': String(getQType(q.type)),
        Q_1: options[0] || '',
        Q_2: options[1] || '',
        Q_3: options[2] || '',
        Q_4: options[3] || '',
        Q_5: options[4] || '',
        Answers: answers,
        Sources: q.explanation || '',
      },
      tags: ['pdf-import'],
    };
  });

  const batchSize = 10;
  const noteIds: number[] = [];
  const errors: string[] = [];

  for (let i = 0; i < notes.length; i += batchSize) {
    const batch = notes.slice(i, i + batchSize);
    try {
      const results = await ankiRequest<(number | null)[]>('addNotes', { notes: batch });
      for (let j = 0; j < results.length; j++) {
        if (results[j]) noteIds.push(results[j] as number);
        else errors.push(`Frage ${i + j + 1} konnte nicht importiert werden`);
      }
    } catch (e) {
      errors.push(`Batch ${i}-${i + batch.length}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return {
    imported: noteIds.length,
    total: questions.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `${noteIds.length} von ${questions.length} Karten nach "${deckName}" importiert`,
  };
}

export function ankiConnectSetupSnippet(origin: string): string {
  return `{
  "webBindAddress": "127.0.0.1",
  "webBindPort": 8765,
  "webCorsOriginList": [
    "http://localhost",
    "${origin}"
  ]
}`;
}
