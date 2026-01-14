import { NextResponse } from 'next/server';

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

async function listDecks(): Promise<string[]> {
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
    
    const decks = await ankiRequest({ action: 'deckNames', version: 6 });
    return decks;
  } catch (error: any) {
    console.error('Error listing decks:', error);
    throw error;
  }
}

export async function GET() {
  try {
    const decks = await listDecks();
    return NextResponse.json({ success: true, decks });
  } catch (error: any) {
    console.error('List decks error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list decks' },
      { status: 500 }
    );
  }
}
