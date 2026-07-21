import { timingSafeEqual } from 'crypto';

const ADMIN_COOKIE = 'adalbert_altfragen_admin';

function expectedPassword(): string {
  return process.env.ALTFRAGEN_ADMIN_PASSWORD || 'adalbert-admin';
}

export function getAdminPasswordHint(): string {
  if (process.env.ALTFRAGEN_ADMIN_PASSWORD) return 'ALTFRAGEN_ADMIN_PASSWORD (gesetzt)';
  return 'Standard-Passwort (bitte in Produktion ALTFRAGEN_ADMIN_PASSWORD setzen)';
}

export function verifyAdminPassword(password: string | null | undefined): boolean {
  const expected = expectedPassword();
  const got = password || '';
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/** Accept Authorization: Bearer <password> or x-altfragen-admin header. */
export function isAdminRequest(request: Request): boolean {
  const header = request.headers.get('x-altfragen-admin');
  if (verifyAdminPassword(header)) return true;
  const auth = request.headers.get('authorization');
  if (auth?.toLowerCase().startsWith('bearer ')) {
    return verifyAdminPassword(auth.slice(7).trim());
  }
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  if (match) {
    try {
      return verifyAdminPassword(decodeURIComponent(match[1]));
    } catch {
      return false;
    }
  }
  return false;
}

export function adminUnauthorized() {
  return Response.json({ error: 'Nicht autorisiert' }, { status: 401 });
}

export { ADMIN_COOKIE };
