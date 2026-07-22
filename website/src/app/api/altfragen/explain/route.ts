import { NextRequest, NextResponse } from 'next/server';
import type { ParsedQuestion } from '@/lib/altfragenTypes';
import { buildRealOptionRationales, needsRealExplanations } from '@/lib/altfragenRationales';
import { accessUnauthorizedIfNeeded } from '@/lib/altfragenAccess';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const denied = accessUnauthorizedIfNeeded(request);
    if (denied) return denied;

    const body = (await request.json()) as { question?: ParsedQuestion };
    const question = body.question;
    if (!question?.options?.length || !question.question) {
      return NextResponse.json({ error: 'question fehlt' }, { status: 400 });
    }

    // If already has good rationales, just fix links
    if (!needsRealExplanations(question) && question.optionRationales?.length) {
      const fixed = await buildRealOptionRationales(
        { ...question, optionRationales: undefined },
        { preferLlm: false }
      );
      // Prefer existing non-placeholder text with fixed links from rebuild
      const merged = question.optionRationales.map((r, i) => ({
        ...r,
        links: fixed[i]?.links || r.links,
      }));
      return NextResponse.json({ success: true, optionRationales: merged, source: 'cached' });
    }

    const optionRationales = await buildRealOptionRationales(question, { preferLlm: true });
    return NextResponse.json({
      success: true,
      optionRationales,
      source: 'generated',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
