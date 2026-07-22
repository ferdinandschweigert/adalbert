import { NextRequest, NextResponse } from 'next/server';
import { listPublishedExams } from '@/lib/altfragenServerStore';
import { accessUnauthorizedIfNeeded } from '@/lib/altfragenAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const denied = accessUnauthorizedIfNeeded(request);
    if (denied) return denied;
    const exams = await listPublishedExams();
    return NextResponse.json(
      { success: true, exams },
      { headers: { 'Cache-Control': 'private, max-age=30' } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
