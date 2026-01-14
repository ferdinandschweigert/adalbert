import { NextResponse } from 'next/server';
import { join } from 'path';
import { pathToFileURL } from 'url';

// Direct import approach - call the handler function directly
async function listDecks(): Promise<string[]> {
  try {
    // Import the compiled MCP server module
    // From website directory, go up one level to root, then to dist
    const mcpPath = join(process.cwd(), '../dist/tools/listDecks.js');
    const fileUrl = pathToFileURL(mcpPath).href;
    const { handleListDecks } = await import(fileUrl);
    const result = await handleListDecks();
    return result.decks;
  } catch (error) {
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
