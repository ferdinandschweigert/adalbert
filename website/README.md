# Adalbert Website

Next.js-App für **Adalbert** mit zwei Modulen:

| Route | Modul |
|-------|--------|
| `/` | Start — Überblick Kreuzen + Anki |
| `/altfragen` | Kreuzen — Klausur-Liste |
| `/altfragen/[examId]` | Kreuzen — Übung |
| `/altfragen/admin` | Admin — Upload & Freigabe |
| `/anki` | Anki — Dashboard |

## Lokal starten

```bash
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

Siehe Repo-Root: [SETUP.md](../SETUP.md), [README.md](../README.md).

## Deploy

Vercel **Root Directory** = `website`.

Vor Fachschafts-Teilen auf Vercel setzen:
- `SITE_ACCESS_CODE` (oder `ALTFRAGEN_ACCESS_CODE`) — gesamte Site
- `ALTFRAGEN_ADMIN_PASSWORD` (Pflicht, kein Default)
- LLM-Keys für Anki-Anreicherung / PDF

Anki auf dem Live-Host: Browser → AnkiConnect (`127.0.0.1`); Domain in `webCorsOriginList`.

Siehe Repo-Root: [SETUP.md](../SETUP.md) (Checkliste Teilen), [README.md](../README.md).
