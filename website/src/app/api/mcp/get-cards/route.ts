import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { pathToFileURL } from 'url';

async function getCardsFromDeck(deckName: string): Promise<any> {
  try {
    // From website directory, go up one level to root, then to dist
    const mcpPath = join(process.cwd(), '../dist/tools/getCardsFromDeck.js');
    const fileUrl = pathToFileURL(mcpPath).href;
    const { handleGetCardsFromDeck } = await import(fileUrl);
    const result = await handleGetCardsFromDeck({ deckName });
    return result;
  } catch (error) {
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

    const result = await getCardsFromDeck(deckName);
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Get cards error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get cards' },
      { status: 500 }
    );
  }
}
