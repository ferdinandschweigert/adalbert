# Vercel Root Directory - WICHTIG!

## Das Problem
Vercel findet Next.js nicht, weil die Root Directory nicht auf `website` gesetzt ist.

## Lösung: Im Vercel Dashboard setzen

Die Root Directory **MUSS** im Vercel Dashboard gesetzt werden, nicht in `vercel.json`.

### Schritt-für-Schritt:

1. **Gehe zu**: https://vercel.com/dashboard
2. **Klicke auf dein Projekt**: `adalbertanki`
3. **Klicke auf**: **Settings** (oben rechts)
4. **Im linken Menü**: Klicke auf **General**
5. **Scrolle nach unten** zu: **Root Directory**
6. **Klicke auf**: **Edit** oder das Eingabefeld
7. **Setze es auf**: `website` (ohne Slash!)
8. **Klicke**: **Save**

### Alternative: Beim Projekt-Import

Falls du das Projekt neu importierst:

1. **Lösche das Projekt** in Vercel (Settings → General → Delete)
2. **Add New Project**
3. **Wähle Repository**: `ferdinandschweigert/adalbert`
4. **BEVOR du auf Deploy klickst:**
   - Scrolle zu **Configure Project**
   - Finde **Root Directory**
   - Setze auf: `website`
5. **Dann**: Deploy

## Verifikation

Nach dem Setzen der Root Directory sollte der Build:
- ✅ Next.js finden
- ✅ Erfolgreich bauen
- ✅ Die Website deployen

## Falls du es immer noch nicht findest

Die Root Directory Einstellung kann an verschiedenen Stellen sein:

- **Settings → General → Root Directory**
- **Settings → Build & Development Settings → Root Directory**
- Beim Projekt-Import unter **Configure Project**

Falls du es wirklich nicht findest, lösche das Projekt und importiere es neu - dort ist es definitiv sichtbar!
