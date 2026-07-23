import { NextRequest, NextResponse } from 'next/server';
import {
  ACCESS_COOKIE,
  LEGACY_ACCESS_COOKIE,
  createAccessSessionToken,
  hasAccessCookie,
  isAccessControlEnabled,
  verifyAccessCode,
} from '@/lib/siteAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Canonical site unlock endpoint (alias of /api/altfragen/access). */

function setAccessCookies(res: NextResponse, token: string, maxAge: number) {
  const opts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
  res.cookies.set(ACCESS_COOKIE, token, opts);
  res.cookies.set(LEGACY_ACCESS_COOKIE, '', { ...opts, maxAge: 0 });
}

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
    const token = createAccessSessionToken(body.code);
    if (!token) {
      return NextResponse.json({ error: 'Zugang nicht konfiguriert' }, { status: 500 });
    }
    const res = NextResponse.json({ success: true, unlocked: true });
    setAccessCookies(res, token, 60 * 60 * 24 * 120);
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  setAccessCookies(res, '', 0);
  return res;
}
