import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_COOKIE,
  createAdminSessionToken,
  isAdminConfigured,
  verifyAdminPassword,
} from '@/lib/altfragenAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    if (!isAdminConfigured()) {
      return NextResponse.json(
        {
          error:
            'Admin nicht konfiguriert. Setze ALTFRAGEN_ADMIN_PASSWORD in der Server-Umgebung.',
          notConfigured: true,
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as { password?: string };
    if (!verifyAdminPassword(body.password)) {
      return NextResponse.json({ error: 'Falsches Passwort' }, { status: 401 });
    }

    const token = createAdminSessionToken();
    if (!token) {
      return NextResponse.json({ error: 'Session konnte nicht erzeugt werden' }, { status: 500 });
    }

    const res = NextResponse.json({ success: true, token });
    res.cookies.set(ADMIN_COOKIE, token, {
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
