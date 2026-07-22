import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  hasAccessCookie,
  isAccessControlEnabled,
  verifyAccessCode,
} from '@/lib/altfragenAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const required = isAccessControlEnabled();
  return NextResponse.json({
    success: true,
    required,
    unlocked: !required || hasAccessCookie(request),
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!isAccessControlEnabled()) {
      return NextResponse.json({ success: true, required: false, unlocked: true });
    }
    const body = (await request.json()) as { code?: string };
    if (!verifyAccessCode(body.code)) {
      return NextResponse.json({ error: 'Falscher Zugangscode' }, { status: 401 });
    }
    const res = NextResponse.json({ success: true, unlocked: true });
    res.cookies.set(ACCESS_COOKIE, body.code || '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 120,
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ACCESS_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return res;
}
