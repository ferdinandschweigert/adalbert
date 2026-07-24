# Security Considerations

## Current Security Status

### Good Practices
- API keys are server-side only (not exposed to client)
- `.env` files are in `.gitignore`
- Admin password only via `ALTFRAGEN_ADMIN_PASSWORD` (no hardcoded default)
- Admin session uses an HMAC token (cookie / `sessionStorage`), not the raw password
- Altfragen exam + per-exam stats APIs respect `ALTFRAGEN_ACCESS_CODE` when set
- Altfragen + admin pages use `noindex`
- Optional soft entry gate (`ENTRY_GATE_ORIGINS`) via middleware: first visit needs Referer from AltklausurenDB (or admin bypass), then an HttpOnly entry cookie

### Soft entry gate (optional)

When `ENTRY_GATE_ORIGINS` is set on Vercel (e.g. `https://www.altklausurendb.de,https://altklausurendb.de`):

- Normal users enter via a normal link from AltklausurenDB (no `rel="noreferrer"`)
- Direct visits without the entry cookie get HTTP 403
- Admins: bookmark `/?gate=<ENTRY_GATE_BYPASS_SECRET>`, or use `/altfragen/admin` (always open); a valid admin session also unlocks the whole site

This is **soft** protection (Referer/cookie can be spoofed or shared). It is not a substitute for `ALTFRAGEN_ACCESS_CODE` / admin password.

### Remaining Issues

1. **AnkiConnect is localhost-only**
   - Hosted `/anki` correctly disables enrichment; MCP/Anki routes assume local Anki Desktop

2. **No rate limiting**
   - Login, access-code, and stats POST can still be abused under load — add limits for hard production

3. **Verbose errors**
   - Some API routes still return raw exception messages

4. **Public repo**
   - Exam bank is in the public GitHub repo; access code / soft gate only protect the live site

## Recommendations

### Fachschaft sharing
- Set `ALTFRAGEN_ACCESS_CODE` + strong `ALTFRAGEN_ADMIN_PASSWORD` on Vercel
- Optionally set `ENTRY_GATE_ORIGINS` + `ENTRY_GATE_BYPASS_SECRET` so the live site is entered via AltklausurenDB
- Share live URL + code privately; keep bypass secret private; Anki stays local-only

### Local development
- Copy `website/.env.example` → `.env.local` and replace placeholder passwords
- Leave `ENTRY_GATE_ORIGINS` unset locally so the gate stays off
- AnkiConnect only on localhost remains the intended security boundary for Anki
