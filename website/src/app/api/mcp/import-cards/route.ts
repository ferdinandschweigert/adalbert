import { NextRequest, NextResponse } from 'next/server';
import { accessUnauthorizedIfNeeded } from '@/lib/siteAccess';

const ANKICONNECT_URL = process.env.ANKICONNECT_URL || 'http://localhost:8765';

function isLocalhost(url: string): boolean {
  try {
    return new URL(url).hostname === 'localhost' || new URL(url).hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

async function ankiRequest(request: unknown): Promise<unknown> {
  if (!isLocalhost(ANKICONNECT_URL)) {
    throw new Error('AnkiConnect is only available on localhost');
  }
  const res = await fetch(ANKICONNECT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!res.ok) throw new Error(`AnkiConnect: ${res.statusText}`);
  const data = (await res.json()) as { error?: string; result?: unknown };
  if (data.error) throw new Error(`AnkiConnect: ${data.error}`);
  return data.result;
}

interface ParsedQuestion {
  number: number;
  question: string;
  options: string[];
  type: 'SC' | 'MC' | 'KPRIM';
  correctAnswers?: string;
  explanation?: string;
}

// Konvertiert Fragetyp zu QType-Nummer
function getQType(type: string): number {
  switch (type) {
    case 'KPRIM': return 0;
    case 'MC': return 1;
    case 'SC': return 2;
    default: return 2;
  }
}

export async function POST(request: NextRequest) {
  const denied = accessUnauthorizedIfNeeded(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const deckName = (body.deckName || '').trim();
    const questions: ParsedQuestion[] = body.questions || [];
    const modelName = body.modelName || 'Amboss_Fragen';

    if (!deckName) {
      return NextResponse.json({ error: 'deckName ist erforderlich' }, { status: 400 });
    }
    if (questions.length === 0) {
      return NextResponse.json({ error: 'Keine Fragen zum Importieren' }, { status: 400 });
    }

    await ankiRequest({ action: 'version', version: 6 });

    // Deck erstellen falls nicht vorhanden
    const decks = (await ankiRequest({ action: 'deckNames', version: 6 })) as string[];
    if (!decks.includes(deckName)) {
      await ankiRequest({ action: 'createDeck', version: 6, params: { deck: deckName } });
    }

    // Prüfen ob das Model existiert
    const models = (await ankiRequest({ action: 'modelNames', version: 6 })) as string[];
    if (!models.includes(modelName)) {
      return NextResponse.json({ 
        error: `Model "${modelName}" nicht gefunden. Verfügbar: ${models.slice(0, 5).join(', ')}...`,
        availableModels: models,
      }, { status: 400 });
    }

    // Karten erstellen
    const notes = questions.map((q) => {
      // Optionen auf 5 auffüllen
      const options = [...q.options];
      while (options.length < 5) options.push('');
      
      // Answers: Binärcode mit Leerzeichen (z.B. "1 0 0 1 0")
      const answers = (q.correctAnswers || '00000')
        .padEnd(5, '0')
        .split('')
        .slice(0, 5)
        .join(' ');

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

    // Batch-Import
    const batchSize = 10;
    const noteIds: number[] = [];
    const errors: string[] = [];

    for (let i = 0; i < notes.length; i += batchSize) {
      const batch = notes.slice(i, i + batchSize);
      try {
        const results = (await ankiRequest({
          action: 'addNotes',
          version: 6,
          params: { notes: batch },
        })) as (number | null)[];
        
        for (let j = 0; j < results.length; j++) {
          if (results[j]) {
            noteIds.push(results[j] as number);
          } else {
            errors.push(`Frage ${i + j + 1} konnte nicht importiert werden`);
          }
        }
      } catch (e) {
        errors.push(`Batch ${i}-${i + batch.length}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return NextResponse.json({
      success: true,
      imported: noteIds.length,
      total: questions.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${noteIds.length} von ${questions.length} Karten nach "${deckName}" importiert`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
