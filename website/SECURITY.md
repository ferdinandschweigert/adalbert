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

4. **Exam bank in repo**
   - Published question content lives in `website/data/altfragen-bank.json`; access code only protects the live site, not a public Git clone

## Recommendations

### Fachschaft sharing (supported path)
- Set `ALTFRAGEN_ACCESS_CODE` and a strong `ALTFRAGEN_ADMIN_PASSWORD` on Vercel before sharing the link
- Share URL + code in private channels (Fachschaft), not on public indexed pages
- Keep Anki as a local companion; do not promise hosted AnkiConnect

### Local development
- Copy `website/.env.example` → `.env.local` and replace placeholder passwords
- AnkiConnect only on localhost remains the intended security boundary for Anki
