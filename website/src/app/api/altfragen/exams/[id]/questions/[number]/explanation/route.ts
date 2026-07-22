import { NextRequest, NextResponse } from 'next/server';
import { getExamById } from '@/lib/altfragenServerStore';
import { isAdminRequest } from '@/lib/altfragenAuth';
import { hasAccessCookie, isAccessControlEnabled } from '@/lib/altfragenAccess';
import { ambossSearchUrl } from '@/lib/altfragenRationales';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Lazy-load Amboss-style explanations for a single question after the user checks an answer.
 * Keeps the main exam payload lean.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string; number: string }> }
) {
  try {
    const admin = isAdminRequest(request);
    if (!admin && isAccessControlEnabled() && !hasAccessCookie(request)) {
      return NextResponse.json(
        { error: 'Zugangscode erforderlich', codeRequired: true },
        { status: 401 }
      );
    }

    const { id, number: numberRaw } = await context.params;
    const questionNumber = Number(numberRaw);
    if (!Number.isFinite(questionNumber)) {
      return NextResponse.json({ error: 'Ungültige Fragennummer' }, { status: 400 });
    }

    const exam = await getExamById(id, { publishedOnly: !admin });
    if (!exam) {
      return NextResponse.json({ error: 'Klausur nicht gefunden' }, { status: 404 });
    }

    const question = exam.questions.find((q) => q.number === questionNumber);
    if (!question) {
      return NextResponse.json({ error: 'Frage nicht gefunden' }, { status: 404 });
    }

    const topicLabel = question.topicLabel;
    const topicUrl = topicLabel ? ambossSearchUrl(topicLabel) : undefined;

    return NextResponse.json(
      {
        success: true,
        questionNumber,
        explanation: question.explanation || null,
        optionRationales: question.optionRationales || [],
        topicLabel: topicLabel || null,
        topicUrl: topicUrl || null,
        explanationMeta: question.explanationMeta || null,
      },
      {
        headers: {
          'Cache-Control': 'private, max-age=120',
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
