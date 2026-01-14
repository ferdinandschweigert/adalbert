# Vercel 404 Fix

## Problem
Getting 404 NOT_FOUND error on Vercel deployment.

## Solution

### 1. Check Root Directory in Vercel Dashboard
- Go to your project settings in Vercel
- Navigate to **Settings** → **General**
- Under **Root Directory**, make sure it's set to: `website`
- If it's not set, click "Edit" and set it to `website`
- Save and redeploy

### 2. Verify Build Settings
In Vercel project settings:
- **Framework Preset**: Next.js
- **Build Command**: `npm run build` (auto-detected)
- **Output Directory**: `.next` (auto-detected)
- **Install Command**: `npm install --ignore-scripts`

### 3. Redeploy
After changing the root directory:
1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Click **Redeploy**

### 4. Alternative: Delete and Re-import
If the issue persists:
1. Delete the project in Vercel
2. Re-import it
3. **IMPORTANT**: When importing, set **Root Directory** to `website` immediately
4. Deploy

## Common Issues

### Issue: Root Directory not set
**Symptom**: 404 on all routes
**Fix**: Set Root Directory to `website` in Vercel settings

### Issue: Build fails
**Symptom**: Build error about better-sqlite3
**Fix**: Root Directory must be `website` so it only uses website/package.json

### Issue: Assets not loading
**Symptom**: Images/icons not showing
**Fix**: Make sure public folder is in website/public (it is)

## Verification
After deployment, check:
- ✅ Homepage loads: `https://your-project.vercel.app`
- ✅ No 404 errors
- ✅ Images load correctly
- ✅ API routes return proper errors (expected, since AnkiConnect is localhost-only)
