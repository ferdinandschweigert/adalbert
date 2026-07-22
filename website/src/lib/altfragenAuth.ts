import { createHmac, timingSafeEqual } from 'crypto';

const ADMIN_COOKIE = 'adalbert_altfragen_admin';

/** Admin password from env only — no hardcoded default. */
export function getConfiguredAdminPassword(): string | null {
  const pw = process.env.ALTFRAGEN_ADMIN_PASSWORD?.trim();
  return pw || null;
}

export function isAdminConfigured(): boolean {
  return Boolean(getConfiguredAdminPassword());
}

function safeEqualString(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  try {
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function verifyAdminPassword(password: string | null | undefined): boolean {
  const expected = getConfiguredAdminPassword();
  if (!expected) return false;
  return safeEqualString(password || '', expected);
}

/** Opaque session token derived from the admin password (not the password itself). */
export function createAdminSessionToken(): string | null {
  const expected = getConfiguredAdminPassword();
  if (!expected) return null;
  return createHmac('sha256', expected).update('adalbert-admin-session-v1').digest('hex');
}

export function verifyAdminSessionToken(token: string | null | undefined): boolean {
  const expected = createAdminSessionToken();
  if (!expected || !token) return false;
  return safeEqualString(token, expected);
}

/** Accept session token or (legacy) raw password via header / bearer / cookie. */
export function verifyAdminCredential(value: string | null | undefined): boolean {
  if (!value) return false;
  if (verifyAdminSessionToken(value)) return true;
  return verifyAdminPassword(value);
}

/** Accept Authorization: Bearer <token>, x-altfragen-admin, or admin cookie. */
export function isAdminRequest(request: Request): boolean {
  const header = request.headers.get('x-altfragen-admin');
  if (verifyAdminCredential(header)) return true;
  const auth = request.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return verifyAdminCredential(auth.slice(7).trim());
  }
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  if (match) {
    try {
      return verifyAdminCredential(decodeURIComponent(match[1]));
    } catch {
      return false;
    }
  }
  return false;
}

export function adminUnauthorized() {
  return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });
}

export function adminNotConfigured() {
  return Response.json(
    {
      error:
        'Admin nicht konfiguriert. Setze ALTFRAGEN_ADMIN_PASSWORD in der Server-Umgebung.',
      notConfigured: true,
    },
    { status: 503 }
  );
}

export { ADMIN_COOKIE };
