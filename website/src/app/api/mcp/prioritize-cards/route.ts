import { NextRequest, NextResponse } from 'next/server';
import { suggestTopPriorities } from '@/lib/priorities';
import { accessUnauthorizedIfNeeded } from '@/lib/siteAccess';

/** Prioritize cards sent from the browser — no server→AnkiConnect. */
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const denied = accessUnauthorizedIfNeeded(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const limit = Math.min(Math.max(1, parseInt(String(body.limit || 300), 10) || 300), 1000);
    const topN = Math.min(Math.max(1, parseInt(String(body.topN || 15), 10) || 15), 50);
    const fallbackProviders = Array.isArray(body.fallbackProviders)
      ? body.fallbackProviders
      : typeof body.fallbackProviders === 'string'
        ? body.fallbackProviders
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined;

    const rawCards = Array.isArray(body.cards) ? body.cards : null;
    if (!rawCards) {
      return NextResponse.json(
        {
          error:
            'cards[] erforderlich. Die Website liest Karten lokal über AnkiConnect und sendet sie an diesen Endpoint.',
        },
        { status: 400 }
      );
    }

    const allCards = rawCards
      .map(
        (
          c: { id?: string; front?: string; options?: string[]; tags?: string[] },
          index: number
        ) => {
          const front = String(c.front || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          return {
            id: String(c.id ?? index + 1),
            front,
            options: Array.isArray(c.options) ? c.options.map(String) : [],
            tags: Array.isArray(c.tags) ? c.tags.map(String) : [],
          };
        }
      )
      .filter((c: { front: string }) => c.front);

    const considered = allCards.slice(0, limit);

    if (considered.length === 0) {
      return NextResponse.json({
        success: true,
        priorities: [],
        total: allCards.length,
        considered: 0,
        method: 'fallback',
        message: 'Keine Karten mit gültigem Front-Feld.',
      });
    }

    const { priorities, method, error: llmError } = await suggestTopPriorities(considered, {
      topN,
      provider: body.provider,
      model: body.model,
      fallbackProviders,
    });

    if (llmError && priorities.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: llmError,
          priorities: [],
          total: allCards.length,
          considered: considered.length,
          method,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      priorities,
      total: allCards.length,
      considered: considered.length,
      method,
      ...(llmError ? { warning: llmError } : {}),
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
