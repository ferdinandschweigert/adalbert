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
- `ALTFRAGEN_ACCESS_CODE`
- `ALTFRAGEN_ADMIN_PASSWORD` (Pflicht, kein Default)

Anki auf dem Live-Host ist nur Info/Companion — Anreicherung läuft **lokal** (`npm run dev` + AnkiConnect).

Siehe Repo-Root: [SETUP.md](../SETUP.md) (Checkliste Teilen), [README.md](../README.md).
