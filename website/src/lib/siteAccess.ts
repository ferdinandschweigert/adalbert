import { createHmac, timingSafeEqual } from 'crypto';

/** Site-wide Fachschaft access cookie (httpOnly). */
export const ACCESS_COOKIE = 'adalbert_site_access';

/** Legacy cookie name from Altfragen-only gate — still accepted. */
export const LEGACY_ACCESS_COOKIE = 'adalbert_altfragen_access';

const ACCESS_SESSION_PAYLOAD = 'adalbert-site-access-v1';

/**
 * Shared Fachschaft access code.
 * Prefer SITE_ACCESS_CODE; ALTFRAGEN_ACCESS_CODE kept for backward compatibility.
 */
export function getAccessCode(): string | null {
  const code =
    process.env.SITE_ACCESS_CODE?.trim() || process.env.ALTFRAGEN_ACCESS_CODE?.trim();
  return code || null;
}

export function isAccessControlEnabled(): boolean {
  return Boolean(getAccessCode());
}

export function verifyAccessCode(code: string | null | undefined): boolean {
  const expected = getAccessCode();
  if (!expected) return true;
  const got = code || '';
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Opaque session token derived from the access code (not the raw code). */
export function createAccessSessionToken(code?: string | null): string | null {
  const secret = (code ?? getAccessCode())?.trim();
  if (!secret) return null;
  return createHmac('sha256', secret).update(ACCESS_SESSION_PAYLOAD).digest('hex');
}

export function verifyAccessSessionToken(token: string | null | undefined): boolean {
  const expectedToken = createAccessSessionToken();
  if (!expectedToken) return true;
  const got = token || '';
  const a = Buffer.from(got);
  const b = Buffer.from(expectedToken);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
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

/**
 * Valid if access control is off, or cookie holds a valid session token
 * (or legacy raw access code for existing browsers).
 */
export function hasAccessCookie(request: Request): boolean {
  if (!isAccessControlEnabled()) return true;
  const cookie = request.headers.get('cookie') || '';
  const primary = readCookie(cookie, ACCESS_COOKIE);
  const legacy = readCookie(cookie, LEGACY_ACCESS_COOKIE);
  const value = primary || legacy;
  if (!value) return false;
  if (verifyAccessSessionToken(value)) return true;
  // Legacy: raw code was stored in the cookie
  return verifyAccessCode(value);
}

/** 401 when site access is enabled and the request has no valid access cookie. */
export function accessUnauthorizedIfNeeded(request: Request): Response | null {
  if (!isAccessControlEnabled() || hasAccessCookie(request)) return null;
  return Response.json(
    { error: 'Zugangscode erforderlich', codeRequired: true },
    { status: 401 }
  );
}

export { ACCESS_SESSION_PAYLOAD };
