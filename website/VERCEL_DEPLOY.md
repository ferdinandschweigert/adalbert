# Vercel Deployment Guide

## Quick Deploy

1. **Push your code to GitHub** (already done)

2. **Go to [Vercel](https://vercel.com)** and sign in with GitHub

3. **Import Project**:
   - Click "Add New..." → "Project"
   - Select your repository: `ferdinandschweigert/adalbert`
   - Vercel will auto-detect Next.js

4. **Configure Project**:
   - **Root Directory**: Set to `website` (IMPORTANT!)
   - **Framework Preset**: Next.js (auto-detected)
   - **Build Command**: `NEXT_TELEMETRY_DISABLED=1 npm run build` (from `website/vercel.json`)
   - **Output Directory**: `.next` (auto-detected)
   - **Install Command**: `npm ci --no-audit --no-fund` (from `website/vercel.json`)

**Important**: Make sure "Root Directory" is set to `website` so Vercel only uses `website/package.json` and doesn't try to install `better-sqlite3` from the root (native compile makes Hobby deploys much slower).

**Deploy speed**: `website/.vercelignore` skips offline `scripts/` dumps and docs; `ignoreCommand` skips rebuilds when only those change; `next.config.ts` pins Turbopack to `website/` so the monorepo lockfile is not treated as the app root.

5. **Environment Variables** (if needed):
   - Add `LLM_PROVIDER` and a provider-specific key (`GEMINI_API_KEY`, `TOGETHER_API_KEY`, or `OPENAI_API_KEY`)
   - Optional: `LLM_MODEL`, `LLM_FALLBACK_PROVIDERS`, `LLM_REQUEST_DELAY_MS`
   - Note: The website API routes connect to AnkiConnect on localhost, so they won't work on Vercel unless you set up a proxy

6. **Deploy**: Click "Deploy"

## Important Notes

⚠️ **AnkiConnect Limitation**: 
The website's API routes (`/api/mcp/*`) connect to AnkiConnect at `localhost:8765`. This will **NOT work on Vercel** because:
- AnkiConnect runs locally on your machine
- Vercel servers can't access your localhost

**Solutions**:
1. **Use the website locally** - Run `npm run dev` in the website directory
2. **Deploy for documentation only** - The website will work, but the interactive features need local Anki Desktop
3. **Set up a proxy** - Use a service like ngrok or Cloudflare Tunnel to expose your local AnkiConnect

## Local Development

```bash
cd website
npm install
npm run dev
```

Visit http://localhost:3000

## Build for Production

```bash
cd website
npm run build
npm start
```
