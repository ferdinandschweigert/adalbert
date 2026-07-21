import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  getAdminPasswordHint,
  verifyAdminPassword,
} from '@/lib/altfragenAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { password?: string };
    if (!verifyAdminPassword(body.password)) {
      return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 });
    }

    const res = NextResponse.json({
      success: true,
      hint: getAdminPasswordHint(),
    });
    res.cookies.set(ADMIN_COOKIE, body.password || '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 14,
    });
    return res;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
