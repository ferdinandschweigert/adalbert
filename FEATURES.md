# Adalbert — Features & Status

Zwei Module auf einer Plattform: **Kreuzen** und **Anki**.

*Zuletzt aktualisiert: Juli 2026*

---

## Vision

1. **Kreuzen** — echte Prüfungsfragen / Gedächtnisprotokolle üben  
2. **Anki** — Decks mit KI-Erklärungen anreichern  
3. Später: mehr Simulation, Fachfilter, Community

---

## Live (Juli 2026)

### Kreuzen — Website `/altfragen`

| Feature | Status | Notiz |
|---------|--------|--------|
| Klausur-Liste (freigegeben) | ✅ | |
| Amboss-Style Übung (Nav, Übersicht, Sprung) | ✅ | |
| SC: Klick = Lösung | ✅ | |
| Auswertung (richtig/falsch/Zeit) | ✅ | |
| Einzelne Frage zurücksetzen | ✅ | |
| Community-% pro Option | ✅ | echte Kreuzungen |
| Admin Upload / Publish | ✅ | |
| Optionaler Zugangscode | ✅ | **gesamte Site** (Middleware `/access`) |
| Admin ohne Default-Passwort | ✅ | `ALTFRAGEN_ADMIN_PASSWORD` Pflicht |
| Stats hinter Zugangscode | ✅ | inkl. Homepage-Overview |
| M2 SS26 Gedächtnisprotokoll | ✅ | ~319 |
| M2 2025-A Staatsexamen | ✅ | 320 |

### Anki — MCP + Website `/anki`

| Feature | Status | Notiz |
|---------|--------|--------|
| MCP-Server in Cursor | ✅ | |
| AnkiConnect lesen/schreiben | ✅ | Browser → `127.0.0.1` (auch auf Vercel) |
| Multi-LLM (Gemini/Together/OpenAI) | ✅ | serverseitig hinter Zugangscode |
| Website-Dashboard Anreicherung | ✅ | Live-Host + lokal |
| Batch-Anreicherung | ✅ | |
| Resume bei Abbruch | ✅ | |
| PDF → Karten (Website) | ✅ | + `.apkg`-Export |
| Lösung / Erklärung / Eselsbrücke / Referenz | ✅ | |
| SC / MC / KPRIM | ✅ | |

---

## Geplant (Auswahl)

| Thema | Status | Notiz |
|-------|--------|--------|
| Fach-/Jahr-Filter für Klausuren | 🔲 | |
| Prüfungssimulation mit Zeitlimit | 🔲 | Auswertung schon da |
| Fachspezifische Prompt-Templates | 🔲 | |
| Spaced Repetition im Kreuzen | 🔲 | |
| Echte medizinische Option-Erklärungen | 🔲 | Fake-Texte entfernt |
| Amboss deep-links / Account | 🔲 | Such-Links vorhanden |

Detaillierte ältere Roadmap-Ideen bleiben in der Git-History; dieser Stand spiegelt den **aktuellen Produktfokus**.

---

## Modul-Abgrenzung

```
Adalbert
├── Site-Zugang (/access + Middleware)
├── Kreuzen (/altfragen)
│   ├── Übungs-UI
│   ├── Auswertung & Stats
│   └── Admin-Freigabe
└── Anki (/anki + MCP)
    ├── Dashboard (Browser → AnkiConnect)
    └── Cursor-Tools → Anki Desktop
```
