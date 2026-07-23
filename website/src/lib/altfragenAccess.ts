/**
 * Backward-compatible re-exports — site-wide access lives in siteAccess.ts.
 */
export {
  ACCESS_COOKIE,
  LEGACY_ACCESS_COOKIE,
  ACCESS_SESSION_PAYLOAD,
  getAccessCode,
  isAccessControlEnabled,
  verifyAccessCode,
  createAccessSessionToken,
  verifyAccessSessionToken,
  hasAccessCookie,
  accessUnauthorizedIfNeeded,
} from './siteAccess';
