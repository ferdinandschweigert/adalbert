# Security Considerations

## Current Security Status

### Good Practices
- API keys are server-side only (not exposed to client; client-supplied keys rejected on enrich/PDF)
- `.env` files are in `.gitignore`
- Admin password only via `ALTFRAGEN_ADMIN_PASSWORD` (no hardcoded default)
- Admin session uses an HMAC token (cookie / `sessionStorage`), not the raw password
- **Site-wide** access via `SITE_ACCESS_CODE` / `ALTFRAGEN_ACCESS_CODE` (middleware + API checks)
- Access cookie stores an HMAC session token, not the raw shared code
- AnkiConnect stays on `127.0.0.1` — browser talks to local Anki; Vercel never reaches Anki
- Altfragen + admin + access pages use `noindex`

### Remaining Issues

1. **No rate limiting**
   - Login, access-code, and stats POST can still be abused under load — add limits for hard production

2. **Verbose errors**
   - Some API routes still return raw exception messages

3. **Public repo**
   - Exam bank is in the public GitHub repo; access code only protects the live site

## Recommendations

### Fachschaft sharing
- Set `SITE_ACCESS_CODE` (or `ALTFRAGEN_ACCESS_CODE`) + strong `ALTFRAGEN_ADMIN_PASSWORD` on Vercel
- Share live URL + code privately; never expose AnkiConnect beyond localhost

### Anki on Vercel
- Keep `webBindAddress: 127.0.0.1`
- Add only your hosted origin to `webCorsOriginList`
- Do not tunnel AnkiConnect publicly

### Local development
- Copy `website/.env.example` → `.env.local` and replace placeholder passwords
