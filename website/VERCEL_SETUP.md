# Vercel Setup - WICHTIG für 404 Fix

## Das Problem
404-Fehler auf Vercel bedeutet, dass die Root Directory nicht richtig gesetzt ist.

## Lösung - Schritt für Schritt

### 1. In Vercel Dashboard:
1. Gehe zu deinem Projekt: https://vercel.com/dashboard
2. Klicke auf **Settings** (oben rechts)
3. Scrolle zu **General** → **Root Directory**
4. **WICHTIG**: Setze es auf: `website`
5. Klicke **Save**

### 2. Build Settings prüfen:
- **Framework Preset**: Next.js (sollte automatisch erkannt werden)
- **Build Command**: `npm run build` (automatisch)
- **Output Directory**: `.next` (automatisch)
- **Install Command**: `npm install` (automatisch)

### 3. Neu deployen:
1. Gehe zu **Deployments** Tab
2. Klicke auf die drei Punkte beim letzten Deployment
3. Wähle **Redeploy**
4. Warte auf den Build

### 4. Falls es immer noch nicht funktioniert:

**Option A: Projekt löschen und neu importieren**
1. Lösche das Projekt in Vercel
2. Klicke **Add New Project**
3. Wähle dein Repository
4. **SOFORT** bei der Konfiguration:
   - **Root Directory**: `website` (WICHTIG!)
   - Lass alles andere automatisch
5. Deploy

**Option B: Manuell in Vercel CLI**
```bash
cd website
vercel --prod
```

## Verifikation
Nach dem Deployment sollte:
- ✅ https://adalbertanki.vercel.app/ die Homepage zeigen
- ✅ Keine 404-Fehler
- ✅ Bilder laden (adalbert.png)
- ✅ Alle Links funktionieren

## Häufige Fehler
- ❌ Root Directory nicht gesetzt → 404
- ❌ Root Directory auf `.` statt `website` → 404
- ❌ Build Command falsch → Build-Fehler
