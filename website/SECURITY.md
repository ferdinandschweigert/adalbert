# Security Considerations

## Current Security Status

### ✅ Good Practices
- API keys are server-side only (not exposed to client)
- `.env` files are in `.gitignore`
- No sensitive data in client-side code

### ⚠️ Security Issues to Address

1. **Hardcoded localhost URL**
   - API routes connect to `localhost:8765` which won't work on Vercel
   - Should use environment variable

2. **No input validation**
   - `deckName` parameter not sanitized
   - Could allow injection attacks

3. **No rate limiting**
   - API routes can be abused
   - Should add rate limiting for production

4. **Error messages expose details**
   - Error messages might reveal internal structure
   - Should sanitize error responses

5. **No CORS protection**
   - Should configure CORS for production deployment

## Recommendations

### For Local Development
- Current setup is acceptable for local use
- AnkiConnect only accessible on localhost (secure)

### For Vercel Deployment
- Disable API routes or add proper authentication
- Use environment variables for configuration
- Add rate limiting
- Sanitize all inputs
- Configure CORS properly
