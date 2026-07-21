import { NextResponse } from 'next/server';
import { listPublishedExams } from '@/lib/altfragenServerStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const exams = await listPublishedExams();
    return NextResponse.json({ success: true, exams });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
