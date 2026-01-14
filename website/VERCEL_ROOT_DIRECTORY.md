# Root Directory in Vercel finden - Schritt für Schritt

## Methode 1: Über Settings (Neue Vercel UI)

1. Gehe zu: https://vercel.com/dashboard
2. Klicke auf dein Projekt **adalbert**
3. Klicke oben auf den Tab **Settings**
4. Scrolle nach unten zu **Build & Development Settings**
5. Dort findest du **Root Directory**
6. Klicke auf **Edit** oder das Eingabefeld
7. Setze es auf: `website`
8. Klicke **Save**

## Methode 2: Beim Import/Neuen Deployment

1. Gehe zu: https://vercel.com/dashboard
2. Klicke **Add New...** → **Project**
3. Wähle dein Repository: `ferdinandschweigert/adalbert`
4. **BEVOR du auf Deploy klickst:**
   - Scrolle nach unten zu **Configure Project**
   - Dort findest du **Root Directory**
   - Setze es auf: `website`
5. Dann klicke **Deploy**

## Methode 3: Über Project Settings

1. Gehe zu: https://vercel.com/dashboard
2. Klicke auf dein Projekt
3. Klicke auf **Settings** (oben rechts im Projekt)
4. Im linken Menü: **General**
5. Scrolle zu **Root Directory** (kann weiter unten sein)
6. Setze auf: `website`

## Methode 4: Falls du es nicht findest - Projekt neu importieren

1. Gehe zu: https://vercel.com/dashboard
2. Klicke auf dein Projekt **adalbert**
3. Settings → **General** → ganz unten: **Delete Project**
4. Lösche das Projekt
5. Klicke **Add New Project**
6. Wähle Repository: `ferdinandschweigert/adalbert`
7. **WICHTIG**: Beim Konfigurieren findest du **Root Directory** - setze auf `website`
8. Deploy

## Alternative: Vercel CLI verwenden

Falls die Web-UI Probleme macht:

```bash
# Installiere Vercel CLI
npm i -g vercel

# Im website Ordner
cd website
vercel

# Folgende Fragen beantworten:
# - Set up and deploy? Yes
# - Which scope? Dein Account
# - Link to existing project? Yes
# - What's the name? adalbert
# - In which directory is your code located? ./
# - Want to override settings? Yes
# - Root Directory? website
```

## Screenshot-Hilfe

Die Root Directory Einstellung sieht normalerweise so aus:

```
┌─────────────────────────────────┐
│ Configure Project               │
├─────────────────────────────────┤
│ Framework Preset: [Next.js]     │
│ Root Directory:   [website   ]  │ ← HIER!
│ Build Command:    [npm run...]  │
│ Output Directory: [.next     ]  │
└─────────────────────────────────┘
```

## Wichtig

- Root Directory muss **exakt** `website` sein
- **NICHT** `.` (Punkt)
- **NICHT** `/website`
- **NICHT** `./website`
- Nur: `website`
