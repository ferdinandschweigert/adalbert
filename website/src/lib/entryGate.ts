export const ENTRY_COOKIE = 'adalbert_entry_gate';
export const ENTRY_COOKIE_VALUE = '1';
export const ENTRY_BYPASS_QUERY = 'gate';
/** Soft session length — enough for study sessions across a week. */
export const ENTRY_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/** Must match ADMIN_COOKIE in altfragenAuth (kept local so Edge middleware avoids Node crypto). */
const ADMIN_COOKIE = 'adalbert_altfragen_admin';
const ADMIN_SESSION_MESSAGE = 'adalbert-admin-session-v1';

function safeEqualString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Comma-separated allowed entry origins. Gate is off when unset/empty. */
export function getAllowedEntryOrigins(): string[] {
  const raw = process.env.ENTRY_GATE_ORIGINS?.trim();
  if (!raw) return [];
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((origin) => {
      try {
        return new URL(origin).origin;
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

export function isEntryGateEnabled(): boolean {
  return getAllowedEntryOrigins().length > 0;
}

export function getBypassSecret(): string | null {
  const secret = process.env.ENTRY_GATE_BYPASS_SECRET?.trim();
  return secret || null;
}

export function verifyBypassSecret(value: string | null | undefined): boolean {
  const expected = getBypassSecret();
  if (!expected || !value) return false;
  return safeEqualString(value, expected);
}

export function refererMatchesAllowedOrigin(referer: string | null): boolean {
  if (!referer) return false;
  let refererOrigin: string;
  try {
    refererOrigin = new URL(referer).origin;
  } catch {
    return false;
  }
  return getAllowedEntryOrigins().some((origin) => origin === refererOrigin);
}

export function hasEntryCookie(request: Request): boolean {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ENTRY_COOKIE}=([^;]+)`));
  if (!match) return false;
  try {
    return decodeURIComponent(match[1]) === ENTRY_COOKIE_VALUE;
  } catch {
    return false;
  }
}

/** Edge-safe HMAC matching Node createHmac in altfragenAuth.createAdminSessionToken. */
async function createAdminSessionTokenEdge(): Promise<string | null> {
  const password = process.env.ALTFRAGEN_ADMIN_PASSWORD?.trim();
  if (!password) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(ADMIN_SESSION_MESSAGE)
  );
  return bytesToHex(signature);
}

async function verifyAdminCredentialEdge(value: string | null | undefined): Promise<boolean> {
  if (!value) return false;
  const session = await createAdminSessionTokenEdge();
  if (session && safeEqualString(value, session)) return true;
  const password = process.env.ALTFRAGEN_ADMIN_PASSWORD?.trim();
  if (password && safeEqualString(value, password)) return true;
  return false;
}

/** Valid Altfragen admin session/password cookie also passes the soft entry gate. */
export async function hasAdminGatePass(request: Request): Promise<boolean> {
  const cookie = request.headers.get('cookie') || '';
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ADMIN_COOKIE}=([^;]+)`));
  if (!match) return false;
  try {
    return verifyAdminCredentialEdge(decodeURIComponent(match[1]));
  } catch {
    return false;
  }
}

/** Admin UI + admin APIs stay reachable without a referer (chicken-and-egg login). */
export function isAdminPathAlwaysAllowed(pathname: string): boolean {
  return (
    pathname === '/altfragen/admin' ||
    pathname.startsWith('/altfragen/admin/') ||
    pathname === '/api/altfragen/admin' ||
    pathname.startsWith('/api/altfragen/admin/')
  );
}

export function buildEntryCookieHeader(secure: boolean): string {
  const parts = [
    `${ENTRY_COOKIE}=${ENTRY_COOKIE_VALUE}`,
    'Path=/',
    `Max-Age=${ENTRY_COOKIE_MAX_AGE_SECONDS}`,
    'HttpOnly',
    'SameSite=Lax',
  ];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
