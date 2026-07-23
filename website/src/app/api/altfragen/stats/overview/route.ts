import { NextRequest, NextResponse } from 'next/server';
import { listPublishedExams } from '@/lib/altfragenServerStore';
import { getHomepageStatsOverview } from '@/lib/altfragenStatsStore';
import { accessUnauthorizedIfNeeded } from '@/lib/siteAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const denied = accessUnauthorizedIfNeeded(request);
  if (denied) return denied;

  try {
    const published = await listPublishedExams();
    const overview = await getHomepageStatsOverview(
      published.map((e) => ({ id: e.id, title: e.title }))
    );
    return NextResponse.json(
      { success: true, ...overview },
      { headers: { 'Cache-Control': 'private, max-age=30' } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
