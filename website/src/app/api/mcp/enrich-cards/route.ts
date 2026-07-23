import { NextRequest, NextResponse } from 'next/server';
import { enrichCards } from '@/lib/enrich';
import { accessUnauthorizedIfNeeded } from '@/lib/siteAccess';

/** Enrichment only — cards come from the browser (local AnkiConnect). No server→Anki. */
export const maxDuration = 300;

const BATCH_SIZE = 5;

function sanitizeForPrompt(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(request: NextRequest) {
  const denied = accessUnauthorizedIfNeeded(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const fallbackProviders = Array.isArray(body.fallbackProviders)
      ? body.fallbackProviders
      : typeof body.fallbackProviders === 'string'
        ? body.fallbackProviders
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : undefined;
    const requestDelayMs = Number.isFinite(Number(body.requestDelayMs))
      ? Number(body.requestDelayMs)
      : undefined;

    const rawCards = Array.isArray(body.cards) ? body.cards : null;
    if (!rawCards || rawCards.length === 0) {
      return NextResponse.json(
        {
          error:
            'cards[] erforderlich. Die Website liest Karten lokal über AnkiConnect und sendet nur den Batch an diesen Endpoint.',
        },
        { status: 400 }
      );
    }

    if (rawCards.length > BATCH_SIZE) {
      return NextResponse.json(
        { error: `Maximal ${BATCH_SIZE} Karten pro Batch` },
        { status: 400 }
      );
    }

    const batch = rawCards
      .map((c: { front?: string; back?: string; options?: string[]; answers?: string }) => {
        const front = sanitizeForPrompt(String(c.front || ''));
        const back = String(c.back || c.answers || '');
        const options = Array.isArray(c.options)
          ? c.options.map((o) => sanitizeForPrompt(String(o))).filter(Boolean)
          : [];
        return { front, back, options, answers: back };
      })
      .filter((c: { front: string }) => c.front);

    if (batch.length === 0) {
      return NextResponse.json({
        success: true,
        enriched: [],
        message: 'Keine Karten mit gültigem Front-Feld in diesem Batch.',
      });
    }

    const llmOverrides = {
      provider: body.provider,
      model: body.model,
      // Never accept client API keys on the hosted path — use server env only.
      fallbackProviders,
      requestDelayMs,
    };

    const enriched = await enrichCards(batch, llmOverrides);

    return NextResponse.json({
      success: true,
      enriched,
      count: enriched.length,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
