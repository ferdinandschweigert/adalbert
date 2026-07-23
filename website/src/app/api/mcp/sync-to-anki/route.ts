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

interface BewertungsEintrag {
  aussage: string;
  bewertung: string;
  begründung: string;
}

interface EnrichedCard {
  front: string;
  back: string;
  options?: string[];
  originalAnswers?: string;
  lösung: string;
  erklärung: string;
  bewertungsTabelle?: BewertungsEintrag[];
  zusammenfassung?: string;
  eselsbrücke: string;
  referenz: string;
  extra1?: string;
}

// Formatiert die Anreicherung als HTML für das Sources-Feld
function formatEnrichmentHtml(card: EnrichedCard): string {
  const parts: string[] = [];
  
  // Lösung
  if (card.lösung) {
    parts.push(`<div style="background:#e3f2fd;padding:10px;margin:5px 0;border-left:3px solid #2196F3"><b>Lösung:</b> ${card.lösung}</div>`);
  }
  
  // Bewertungstabelle
  if (card.bewertungsTabelle && card.bewertungsTabelle.length > 0) {
    let table = '<table style="width:100%;border-collapse:collapse;font-size:14px;margin:10px 0">';
    table += '<tr style="background:#f5f5f5"><th style="text-align:left;padding:6px;border:1px solid #ddd">Aussage</th><th style="width:30px;padding:6px;border:1px solid #ddd"></th><th style="text-align:left;padding:6px;border:1px solid #ddd">Begründung</th></tr>';
    for (const row of card.bewertungsTabelle) {
      const isCorrect = row.bewertung === 'Richtig' || row.bewertung === 'Yes';
      const symbol = isCorrect ? '<span style="color:green">✓</span>' : '<span style="color:red">✗</span>';
      table += `<tr><td style="padding:6px;border:1px solid #ddd">${row.aussage}</td><td style="text-align:center;padding:6px;border:1px solid #ddd">${symbol}</td><td style="padding:6px;border:1px solid #ddd">${row.begründung}</td></tr>`;
    }
    table += '</table>';
    parts.push(table);
  }
  
  // Zusammenfassung
  if (card.zusammenfassung) {
    parts.push(`<div style="background:#e8f5e9;padding:10px;margin:5px 0;border-left:3px solid #4CAF50"><b>Zusammenfassung:</b> ${card.zusammenfassung}</div>`);
  }
  
  // Erklärung (nur wenn keine Tabelle)
  if (card.erklärung && (!card.bewertungsTabelle || card.bewertungsTabelle.length === 0)) {
    parts.push(`<div style="background:#f5f5f5;padding:10px;margin:5px 0"><b>Erklärung:</b> ${card.erklärung}</div>`);
  }
  
  // Eselsbrücke
  if (card.eselsbrücke) {
    parts.push(`<div style="background:#fff3cd;padding:10px;margin:5px 0;border-left:3px solid #ffc107"><b>Eselsbrücke:</b> ${card.eselsbrücke}</div>`);
  }
  
  // Referenz
  if (card.referenz) {
    parts.push(`<div style="color:#666;font-size:12px;margin:5px 0"><b>Referenz:</b> ${card.referenz}</div>`);
  }
  
  // Extra
  if (card.extra1) {
    parts.push(`<div style="background:#f3e5f5;padding:10px;margin:5px 0;border-left:3px solid #9c27b0"><b>Hinweis:</b> ${card.extra1}</div>`);
  }
  
  return parts.join('');
}

// Normalisiert Text für Vergleiche
function normalizeForSearch(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')  // HTML entfernen
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export async function POST(request: NextRequest) {
  const denied = accessUnauthorizedIfNeeded(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const sourceDeck = (body.deckName || '').replace(/[<>"']/g, '').trim();
    const cards = Array.isArray(body.cards) ? body.cards as EnrichedCard[] : [];
    const dryRun = Boolean(body.dryRun);

    if (!sourceDeck) {
      return NextResponse.json({ error: 'deckName is required' }, { status: 400 });
    }
    if (cards.length === 0) {
      return NextResponse.json({ error: 'cards array is required and must not be empty' }, { status: 400 });
    }

    await ankiRequest({ action: 'version', version: 6 });

    // Alle Notes im Deck finden
    const noteIds = (await ankiRequest({
      action: 'findNotes',
      version: 6,
      params: { query: `deck:"${sourceDeck.replace(' (angereichert)', '')}"` },
    })) as number[];

    if (!noteIds || noteIds.length === 0) {
      return NextResponse.json({ 
        error: `Keine Karten im Deck "${sourceDeck}" gefunden` 
      }, { status: 400 });
    }

    // Note-Infos holen
    const notesInfo = (await ankiRequest({
      action: 'notesInfo',
      version: 6,
      params: { notes: noteIds },
    })) as Array<{ 
      noteId: number; 
      fields: Record<string, { value: string }>;
      modelName: string;
    }>;

    // Map von normalisierter Frage zu noteId
    const questionToNote = new Map<string, { noteId: number; modelName: string; fields: Record<string, { value: string }> }>();
    for (const note of notesInfo) {
      const question = note.fields['Question']?.value || 
                       note.fields['Frage']?.value || 
                       note.fields['Front']?.value || 
                       note.fields['Text']?.value || '';
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

    // Karten matchen und updaten
    for (const card of cards) {
      const normalizedFront = normalizeForSearch(card.front);
      const matchingNote = questionToNote.get(normalizedFront);
      
      if (!matchingNote) {
        notFound++;
        continue;
      }

      // Prüfen welches Feld für die Anreicherung verwendet werden kann
      const fields = matchingNote.fields;
      let targetField = '';
      
      // Priorität: Extra 1 > Sources > Extra > Hinweis > Zusatz
      if ('Extra 1' in fields) targetField = 'Extra 1';
      else if ('Sources' in fields) targetField = 'Sources';
      else if ('Extra' in fields) targetField = 'Extra';
      else if ('Hinweis' in fields) targetField = 'Hinweis';
      else if ('Zusatz' in fields) targetField = 'Zusatz';
      else {
        // Fallback: Suche nach jedem Feld, das "Extra" oder "Sources" im Namen hat
        for (const fieldName of Object.keys(fields)) {
          const lower = fieldName.toLowerCase();
          if (lower.includes('extra') || lower.includes('source') || lower.includes('hinweis') || lower.includes('zusatz')) {
            targetField = fieldName;
            break;
          }
        }
      }
      
      if (!targetField) {
        // Kein passendes Feld gefunden - überspringen
        missingTargetField += 1;
        errors.push(`Kein Extra 1/Sources Feld für: ${card.front.substring(0, 50)}... (Verfügbare Felder: ${Object.keys(fields).join(', ')})`);
        continue;
      }
      
      // Prüfen ob bereits Anreicherung vorhanden ist
      const existingContent = fields[targetField]?.value || '';
      const hasEnrichment = existingContent.includes('Lösung:') || 
                           existingContent.includes('Erklärung:') || 
                           existingContent.includes('Bewertungstabelle') ||
                           existingContent.includes('Zusammenfassung:');
      
      if (hasEnrichment) {
        // Bereits angereichert - überspringen
        alreadyEnriched += 1;
        continue;
      }

      const enrichmentHtml = formatEnrichmentHtml(card);

      if (dryRun) {
        wouldUpdate += 1;
        continue;
      }

      try {
        await ankiRequest({
          action: 'updateNoteFields',
          version: 6,
          params: {
            note: {
              id: matchingNote.noteId,
              fields: {
                [targetField]: enrichmentHtml,
              },
            },
          },
        });
        updated++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`Update fehlgeschlagen: ${msg}`);
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      wouldUpdate,
      alreadyEnriched,
      missingTargetField,
      notFound,
      total: cards.length,
      dryRun,
      message: `${dryRun ? wouldUpdate : updated} Karten ${dryRun ? 'würden aktualisiert' : 'aktualisiert'}` + 
        (notFound > 0 ? `, ${notFound} nicht gefunden` : '') +
        (alreadyEnriched > 0 ? `, ${alreadyEnriched} bereits angereichert` : '') +
        (missingTargetField > 0 ? `, ${missingTargetField} ohne Ziel-Feld` : '') +
        (errors.length > 0 ? `. Fehler: ${errors.slice(0, 3).join('; ')}` : ''),
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
