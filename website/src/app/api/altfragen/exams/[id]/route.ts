import { NextRequest, NextResponse } from 'next/server';
import { getExamById } from '@/lib/altfragenServerStore';
import { isAdminRequest } from '@/lib/altfragenAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const admin = isAdminRequest(request);
    const exam = await getExamById(id, { publishedOnly: !admin });
    if (!exam) {
      return NextResponse.json({ error: 'Klausur nicht gefunden' }, { status: 404 });
    }
    return NextResponse.json({ success: true, exam });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
