/**
 * AnkiConnect API wrapper
 * AnkiConnect is an add-on that provides a REST API for Anki Desktop
 */

import { AnkiConnectRequest, AnkiConnectResponse, AnkiCardFromDeck } from '../types/index.js';

const ANKICONNECT_URL = 'http://localhost:8765';

export async function ankiRequest(request: AnkiConnectRequest): Promise<any> {
  try {
    const response = await fetch(ANKICONNECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`AnkiConnect error: ${response.statusText}`);
    }
    
    const data = (await response.json()) as AnkiConnectResponse;
    
    if (data.error) {
      throw new Error(`AnkiConnect error: ${data.error}`);
    }
    
    return data.result;
  } catch (error: any) {
    if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
      throw new Error(
        'Cannot connect to Anki Desktop. Make sure:\n' +
        '1. Anki Desktop is running\n' +
        '2. AnkiConnect add-on is installed (code: 2055492159)\n' +
        '3. AnkiConnect is enabled'
      );
    }
    throw error;
  }
}

/**
 * Check if AnkiConnect is available
 */
export async function checkAnkiConnect(): Promise<boolean> {
  try {
    await ankiRequest({ action: 'version', version: 6 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get list of all decks
 */
export async function listDecks(): Promise<string[]> {
  return await ankiRequest({ action: 'deckNames', version: 6 });
}

/**
 * Create a new deck
 */
export async function createDeck(deckName: string): Promise<number> {
  return await ankiRequest({
    action: 'createDeck',
    version: 6,
    params: { deck: deckName },
  });
}

/**
 * Get note types (models)
 */
export async function getNoteTypes(): Promise<string[]> {
  return await ankiRequest({ action: 'modelNames', version: 6 });
}

/**
 * Create a custom note type for enriched cards
 */
export async function createEnrichedNoteType(): Promise<string> {
  const modelName = 'Enriched Card';
  
  // Check if it already exists
  const models = await getNoteTypes();
  if (models.includes(modelName)) {
    return modelName;
  }
  
  // Create the model
  await ankiRequest({
    action: 'createModel',
    version: 6,
    params: {
      modelName,
      inOrderFields: ['Front', 'Back', 'Original-Antwort', 'Lösung', 'Erklärung', 'Eselsbrücke', 'Referenz'],
      css: `
        .card {
          font-family: Arial, sans-serif;
          font-size: 20px;
          text-align: center;
          color: black;
          background-color: white;
        }
        .front {
          font-weight: bold;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .back {
          margin-bottom: 20px;
        }
        .original-antwort {
          background-color: #f5f5f5;
          padding: 10px;
          margin: 10px 0;
          border-left: 3px solid #9e9e9e;
          text-align: left;
          font-size: 16px;
          color: #666;
        }
        .lösung {
          background-color: #e3f2fd;
          padding: 15px;
          margin: 20px 0;
          border-left: 4px solid #2196F3;
          text-align: left;
          font-weight: bold;
          font-size: 22px;
        }
        .erklärung {
          background-color: #f0f0f0;
          padding: 15px;
          margin-top: 20px;
          border-left: 4px solid #4CAF50;
          text-align: left;
        }
        .eselsbrücke {
          background-color: #fff3cd;
          padding: 15px;
          margin-top: 10px;
          border-left: 4px solid #ffc107;
          text-align: left;
          font-style: italic;
        }
        .referenz {
          background-color: #e8f5e9;
          padding: 10px;
          margin-top: 15px;
          border-left: 4px solid #66bb6a;
          text-align: left;
          font-size: 14px;
          color: #555;
        }
      `,
      cardTemplates: [
        {
          Name: 'Card 1',
          Front: `
            <div class="front">{{Front}}</div>
          `,
          Back: `
            <div class="front">{{Front}}</div>
            <hr>
            {{#Lösung}}
            <div class="lösung">
              ✅ <strong>LÖSUNG:</strong><br>
              {{Lösung}}
            </div>
            {{/Lösung}}
            {{#Original-Antwort}}
            <div class="original-antwort">
              <strong>Original-Antwort:</strong><br>
              {{Original-Antwort}}
            </div>
            {{/Original-Antwort}}
            {{#Erklärung}}
            <div class="erklärung">
              <strong>📚 ERKLÄRUNG:</strong><br>
              {{Erklärung}}
            </div>
            {{/Erklärung}}
            {{#Eselsbrücke}}
            <div class="eselsbrücke">
              <strong>💡 ESELSBRÜCKE:</strong><br>
              {{Eselsbrücke}}
            </div>
            {{/Eselsbrücke}}
            {{#Referenz}}
            <div class="referenz">
              <strong>📖 REFERENZ:</strong> {{Referenz}}
            </div>
            {{/Referenz}}
          `,
        },
      ],
    },
  });
  
  return modelName;
}

/**
 * Add a note to a deck
 */
export async function addNote(
  deckName: string,
  front: string,
  back: string,
  originalAntwort: string,
  lösung?: string,
  erklärung?: string,
  eselsbrücke?: string,
  tagsOrReferenz?: string[] | string,
  referenz?: string
): Promise<number> {
  // Ensure enriched note type exists
  const modelName = await createEnrichedNoteType();
  
  // Ensure deck exists
  const decks = await listDecks();
  if (!decks.includes(deckName)) {
    await createDeck(deckName);
  }

  const tags = Array.isArray(tagsOrReferenz) ? tagsOrReferenz : [];
  const referenzValue = Array.isArray(tagsOrReferenz) ? referenz || '' : tagsOrReferenz || '';
  
  return await ankiRequest({
    action: 'addNote',
    version: 6,
    params: {
      note: {
        deckName,
        modelName,
        fields: {
          Front: front,
          Back: back,
          'Original-Antwort': originalAntwort || '',
          Lösung: lösung || '',
          Erklärung: erklärung || '',
          Eselsbrücke: eselsbrücke || '',
          Referenz: referenzValue,
        },
        tags,
      },
    },
  });
}

/**
 * Add multiple notes to a deck
 */
export async function addNotes(
  deckName: string,
  notes: Array<{
    front: string;
    back: string;
    originalAntwort?: string;
    lösung?: string;
    erklärung?: string;
    eselsbrücke?: string;
    referenz?: string;
    tags?: string[];
  }>
): Promise<number[]> {
  // Ensure enriched note type exists
  const modelName = await createEnrichedNoteType();
  
  // Ensure deck exists
  const decks = await listDecks();
  if (!decks.includes(deckName)) {
    await createDeck(deckName);
  }
  
  const noteIds: number[] = [];
  
  // Add notes in batches to avoid overwhelming AnkiConnect
  const batchSize = 10;
  for (let i = 0; i < notes.length; i += batchSize) {
    const batch = notes.slice(i, i + batchSize);
    
    const results = await ankiRequest({
      action: 'addNotes',
      version: 6,
      params: {
        notes: batch.map(note => ({
          deckName,
          modelName,
          fields: {
            Front: note.front,
            Back: note.back,
            'Original-Antwort': note.originalAntwort || '',
            Lösung: note.lösung || '',
            Erklärung: note.erklärung || '',
            Eselsbrücke: note.eselsbrücke || '',
            Referenz: note.referenz || '',
          },
          tags: note.tags || [],
        })),
      },
    });
    
    noteIds.push(...results);
  }
  
  return noteIds;
}

// AnkiCardFromDeck is now imported from types/index.ts

/**
 * Get all cards from a deck
 */
export async function getCardsFromDeck(deckName: string): Promise<AnkiCardFromDeck[]> {
  // Find all notes in the deck
  const noteIds = await ankiRequest({
    action: 'findNotes',
    version: 6,
    params: {
      query: `deck:"${deckName}"`,
    },
  });
  
  if (noteIds.length === 0) {
    return [];
  }
  
  // Get note information
  const notesInfo = await ankiRequest({
    action: 'notesInfo',
    version: 6,
    params: {
      notes: noteIds,
    },
  });
  
  const cards: AnkiCardFromDeck[] = [];
  
  for (const note of notesInfo) {
    // Extract fields - AnkiConnect returns fields as an object
    const fields = note.fields || {};
    
    // Extract Question field
    const question = fields['Question']?.value || fields['Frage']?.value || fields['Front']?.value || '';
    
    // Extract Options (Q_1 to Q_5)
    const options: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const option = fields[`Q_${i}`]?.value || '';
      if (option && option.trim().length > 0) {
        options.push(option.trim());
      }
    }
    
    // Extract Answers (binary code)
    const answers = fields['Answers']?.value || fields['Antwort']?.value || fields['Back']?.value || '';
    
    // Extract QType
    const qTypeStr = fields['QType (0=kprim,1=mc,2=sc)']?.value || fields['QType']?.value || '0';
    const qType = parseInt(qTypeStr) || 0;
    
    // For backward compatibility, use Question as front and Answers as back
    const front = question.trim();
    const back = answers.trim();
    
    cards.push({
      front,
      back,
      question: front,
      options,
      answers: back,
      qType,
      noteId: note.noteId,
      tags: note.tags || [],
      noteType: note.modelName || 'Unknown',
    });
  }
  
  return cards;
}
