import { NextRequest, NextResponse } from 'next/server';
import { getExamById } from '@/lib/altfragenServerStore';
import { isAdminRequest } from '@/lib/altfragenAuth';
import { hasAccessCookie, isAccessControlEnabled } from '@/lib/altfragenAccess';
import type { StoredExam } from '@/lib/altfragenTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Practice payload keeps Amboss explanations so they render after answering. */
function toPracticeExam(exam: StoredExam): StoredExam {
  return exam;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = isAdminRequest(request);
    if (!admin && isAccessControlEnabled() && !hasAccessCookie(request)) {
      return NextResponse.json(
        { error: 'Zugangscode erforderlich', codeRequired: true },
        { status: 401 }
      );
    }

    const { id } = await context.params;
    const exam = await getExamById(id, { publishedOnly: !admin });
    if (!exam) {
      return NextResponse.json({ error: 'Klausur nicht gefunden' }, { status: 404 });
    }

    const lean = admin && request.nextUrl.searchParams.get('full') === '1' ? exam : toPracticeExam(exam);

    return NextResponse.json(
      { success: true, exam: lean },
      {
        headers: {
          'Cache-Control': 'private, max-age=60',
        },
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
