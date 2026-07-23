import { NextRequest, NextResponse } from 'next/server';

/**
 * Edge middleware: protect the entire site with SITE_ACCESS_CODE / ALTFRAGEN_ACCESS_CODE.
 * Allow: unlock API, access page, static assets.
 */

const ACCESS_COOKIE = 'adalbert_site_access';
const LEGACY_ACCESS_COOKIE = 'adalbert_altfragen_access';
const ACCESS_SESSION_PAYLOAD = 'adalbert-site-access-v1';

function getAccessCode(): string | null {
  const code =
    process.env.SITE_ACCESS_CODE?.trim() || process.env.ALTFRAGEN_ACCESS_CODE?.trim();
  return code || null;
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function readCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

async function hasValidAccess(request: NextRequest, expectedCode: string): Promise<boolean> {
  const cookieHeader = request.headers.get('cookie') || '';
  const value =
    readCookie(cookieHeader, ACCESS_COOKIE) || readCookie(cookieHeader, LEGACY_ACCESS_COOKIE);
  if (!value) return false;

  const expectedToken = await hmacSha256Hex(expectedCode, ACCESS_SESSION_PAYLOAD);
  if (timingSafeEqualHex(value, expectedToken)) return true;
  // Legacy raw-code cookie
  return timingSafeEqualHex(value, expectedCode);
}

function isPublicPath(pathname: string): boolean {
  if (pathname === '/access') return true;
  if (pathname === '/api/altfragen/access' || pathname === '/api/access') return true;
  if (pathname.startsWith('/_next/')) return true;
  if (pathname === '/favicon.ico' || pathname === '/favicon.png') return true;
  if (pathname === '/icon.png' || pathname === '/apple-icon.png') return true;
  if (/\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|woff2?)$/i.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const expectedCode = getAccessCode();

  if (!expectedCode || isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (await hasValidAccess(request, expectedCode)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Zugangscode erforderlich', codeRequired: true },
      { status: 401 }
    );
  }

  const url = request.nextUrl.clone();
  url.pathname = '/access';
  url.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all paths except Next internals we already allow in isPublicPath.
     * Still run middleware so env-based open mode works consistently.
     */
    '/((?!_next/static|_next/image).*)',
  ],
};
