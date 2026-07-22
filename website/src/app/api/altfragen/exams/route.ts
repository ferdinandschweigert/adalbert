import { NextRequest, NextResponse } from 'next/server';
import { listPublishedExams } from '@/lib/altfragenServerStore';
import { hasAccessCookie, isAccessControlEnabled } from '@/lib/altfragenAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (isAccessControlEnabled() && !hasAccessCookie(request)) {
      return NextResponse.json(
        { error: 'Zugangscode erforderlich', codeRequired: true },
        { status: 401 }
      );
    }
    const exams = await listPublishedExams();
    return NextResponse.json({ success: true, exams });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
