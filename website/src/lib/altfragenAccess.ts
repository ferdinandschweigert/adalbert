import { timingSafeEqual } from 'crypto';

const ACCESS_COOKIE = 'adalbert_altfragen_access';

/** If unset, Altfragen stays publicly open (kreuzen without login). */
export function getAccessCode(): string | null {
  const code = process.env.ALTFRAGEN_ACCESS_CODE?.trim();
  return code || null;
}

export function isAccessControlEnabled(): boolean {
  return Boolean(getAccessCode());
}

export function verifyAccessCode(code: string | null | undefined): boolean {
  const expected = getAccessCode();
  if (!expected) return true; // open mode
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

export function hasAccessCookie(request: Request): boolean {
  if (!isAccessControlEnabled()) return true;
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ACCESS_COOKIE}=([^;]+)`));
  if (!match) return false;
  try {
    return verifyAccessCode(decodeURIComponent(match[1]));
  } catch {
    return false;
  }
}

/** 401 when Fachschaft access is enabled and the request has no valid access cookie. */
export function accessUnauthorizedIfNeeded(request: Request): Response | null {
  if (!isAccessControlEnabled() || hasAccessCookie(request)) return null;
  return Response.json(
    { error: 'Zugangscode erforderlich', codeRequired: true },
    { status: 401 }
  );
}

export { ACCESS_COOKIE };
