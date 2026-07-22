# Security Considerations

## Current Security Status

### Good Practices
- API keys are server-side only (not exposed to client)
- `.env` files are in `.gitignore`
- Admin password only via `ALTFRAGEN_ADMIN_PASSWORD` (no hardcoded default)
- Admin session uses an HMAC token (cookie / `sessionStorage`), not the raw password
- Altfragen exam + per-exam stats APIs respect `ALTFRAGEN_ACCESS_CODE` when set
- Altfragen + admin pages use `noindex`

### Remaining Issues

1. **AnkiConnect is localhost-only**
   - Hosted `/anki` correctly disables enrichment; MCP/Anki routes assume local Anki Desktop

2. **No rate limiting**
   - Login, access-code, and stats POST can still be abused under load — add limits for hard production

3. **Verbose errors**
   - Some API routes still return raw exception messages

4. **Public repo**
   - Exam bank is in the public GitHub repo; access code only protects the live site

## Recommendations

### Fachschaft sharing
- Set `ALTFRAGEN_ACCESS_CODE` + strong `ALTFRAGEN_ADMIN_PASSWORD` on Vercel
- Share live URL + code privately; Anki stays local-only

### Local development
- Copy `website/.env.example` → `.env.local` and replace placeholder passwords
- AnkiConnect only on localhost remains the intended security boundary for Anki
