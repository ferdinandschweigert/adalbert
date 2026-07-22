import { NextRequest, NextResponse } from 'next/server';
import { accessUnauthorizedIfNeeded } from '@/lib/altfragenAccess';
import { getExamStats, recordAnswer } from '@/lib/altfragenStatsStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const denied = accessUnauthorizedIfNeeded(request);
    if (denied) return denied;

    const { id } = await context.params;
    const questionStats = await getExamStats(id);
    return NextResponse.json({ success: true, examId: id, questionStats });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const denied = accessUnauthorizedIfNeeded(request);
    if (denied) return denied;

    const { id } = await context.params;
    const body = (await request.json()) as {
      questionNumber?: number;
      optionCount?: number;
      selectionBits?: string;
      correctBits?: string;
    };

    if (
      typeof body.questionNumber !== 'number' ||
      typeof body.optionCount !== 'number' ||
      typeof body.selectionBits !== 'string'
    ) {
      return NextResponse.json({ error: 'Ungültige Stats-Daten' }, { status: 400 });
    }

    const stat = await recordAnswer({
      examId: id,
      questionNumber: body.questionNumber,
      optionCount: body.optionCount,
      selectionBits: body.selectionBits,
      correctBits: body.correctBits || '',
    });

    return NextResponse.json({ success: true, stat });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
