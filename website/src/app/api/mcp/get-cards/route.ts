import { NextRequest, NextResponse } from 'next/server';

// Only allow AnkiConnect on localhost for security
const ANKICONNECT_URL = process.env.ANKICONNECT_URL || 'http://localhost:8765';

// Security: Only allow localhost connections
function isLocalhost(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

// Security: Sanitize deck name to prevent injection
function sanitizeDeckName(deckName: string): string {
  // Remove potentially dangerous characters
  return deckName.replace(/[<>"']/g, '').trim();
}

async function ankiRequest(request: any): Promise<any> {
  // Security: Block non-localhost connections
  if (!isLocalhost(ANKICONNECT_URL)) {
    throw new Error('AnkiConnect is only available on localhost for security reasons');
  }
  
  const response = await fetch(ANKICONNECT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`AnkiConnect error: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (data.error) {
    throw new Error(`AnkiConnect error: ${data.error}`);
  }
  
  return data.result;
}

async function getCardsFromDeck(deckName: string): Promise<any> {
  try {
    // Check if AnkiConnect is available
    try {
      await ankiRequest({ action: 'version', version: 6 });
    } catch {
      throw new Error(
        'AnkiConnect is not available. Make sure:\n' +
        '1. Anki Desktop is running\n' +
        '2. AnkiConnect add-on is installed (code: 2055492159)'
      );
    }
    
    // Get note IDs from the deck (deckName is already sanitized)
    const noteIds = await ankiRequest({
      action: 'findNotes',
      version: 6,
      params: { query: `deck:"${deckName}"` },
    });
    
    if (noteIds.length === 0) {
      return { cards: [], count: 0 };
    }
    
    // Get notes info
    const notesInfo = await ankiRequest({
      action: 'notesInfo',
      version: 6,
      params: { notes: noteIds },
    });
    
    // Transform to card format
    const cards = notesInfo.map((note: any) => {
      const fields = note.fields || {};
      const question = fields['Question']?.value || fields['Frage']?.value || fields['Front']?.value || '';
      const options: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const option = fields[`Q_${i}`]?.value || '';
        if (option && option.trim().length > 0) options.push(option.trim());
      }
      const answers = fields['Answers']?.value || fields['Antwort']?.value || fields['Back']?.value || '';
      const qTypeStr = fields['QType (0=kprim,1=mc,2=sc)']?.value || fields['QType']?.value || '0';
      const qType = parseInt(qTypeStr) || 0;
      
      return {
        front: question.trim(),
        back: answers.trim(),
        question: question.trim(),
        options,
        answers: answers.trim(),
        qType,
        noteId: note.noteId,
        tags: note.tags || [],
        noteType: note.modelName || 'Unknown',
      };
    });
    
    return { cards, count: cards.length };
  } catch (error: any) {
    console.error('Error getting cards:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deckName } = body;

    if (!deckName) {
      return NextResponse.json(
        { error: 'Deck name is required' },
        { status: 400 }
      );
    }

    // Security: Sanitize input
    const sanitizedDeckName = sanitizeDeckName(deckName);
    if (!sanitizedDeckName) {
      return NextResponse.json(
        { error: 'Invalid deck name' },
        { status: 400 }
      );
    }

    const result = await getCardsFromDeck(sanitizedDeckName);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Get cards error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get cards' },
      { status: 500 }
    );
  }
}
