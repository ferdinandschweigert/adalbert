# Adalbert Website

Next.js-App für **Adalbert** mit zwei Modulen:

| Route | Modul |
|-------|--------|
| `/` | Start — Überblick Kreuzen + Anki |
| `/altfragen` | Kreuzen — Klausur-Liste |
| `/altfragen/[examId]` | Kreuzen — Übung |
| `/altfragen/admin` | Admin — Upload & Freigabe |
| `/#anki` | Anki — Dashboard |

## Lokal starten

```bash
npm install
npm run dev
```

Öffne [http://localhost:3000](http://localhost:3000).

Siehe Repo-Root: [SETUP.md](../SETUP.md), [README.md](../README.md).

## Deploy

Vercel **Root Directory** = `website` (siehe `VERCEL_*.md` / Root `VERCEL_ROOT_DIRECTORY_FIX.md`).
