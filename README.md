<p align="center">
  <img src="website/public/adalbert-mark.png" alt="Adalbert" width="96" />
</p>

# Adalbert

Lernplattform für Medizinstudierende mit **zwei klaren Modulen**:

| Modul | Was es tut | Wo |
|-------|------------|-----|
| **Kreuzen** | Freigegebene Staatsexamen-/Gedächtnisprotokoll-Fragen üben | [`/altfragen`](https://adalbert.vercel.app/altfragen) |
| **Anki** | Decks **lokal** anreichern & nach Anki Desktop synchen | lokal `/anki` + MCP in Cursor |

🌐 **Live:** [https://adalbert.vercel.app](https://adalbert.vercel.app)

> **Wichtig:** Nur diese URL nutzen. `adalbertanki.vercel.app` ist ein Duplikat — Fortschritt liegt im Browser und ist an die Domain gebunden.

> „Adalbert“ ist ein persönlicher Projektname — Open-Source-Lernhilfe ohne kommerziellen Namensanspruch.

---

## Teilen / Zugang

Das **Repo ist öffentlich** (Code + Fragenbank in Git). Der optionale Zugangscode schützt nur die **Live-Site** (`/altfragen`), nicht den GitHub-Clone.

- Üben: Live-URL (+ `ALTFRAGEN_ACCESS_CODE`, falls gesetzt)
- Admin: `ALTFRAGEN_ADMIN_PASSWORD` (Pflicht, kein Default) — siehe [SETUP.md](SETUP.md)

**Anki** auf dem Live-Host nur lokal nutzbar (AnkiConnect).

---

## Schnellüberblick

### Kreuzen (Website)
- Klausur-Liste und Amboss-Style Übungsmodus (optionaler Zugangscode)
- Lernmodus (sofort Feedback) oder Prüfungsmodus (Lösung nach Abgabe)
- Admin (`/altfragen/admin`): Upload, Konvertierung, Freigabe
- Community-Stats nur mit gültigem Zugang (wenn Code aktiv)

Aktuell u. a.:
- **M2 SS26** Gedächtnisprotokoll (~319 Fragen)
- **M2 2025-A** Staatsexamen (320 Fragen aus 3 PDF-Teilen)
- **M2 H25** Gedächtnisprotokoll (320 Originalfragen, IMPP-Reihenfolge)

### Anki (lokal + MCP)
- MCP-Server in Cursor: Decks lesen, anreichern, zu Anki Desktop synchen
- Website-Dashboard unter `/anki` **nur lokal** (AnkiConnect + LLM-Key)
- Pro Karte: **Lösung · Erklärung · Eselsbrücke · Referenz**
- Fragetypen: SC, MC, KPRIM

---

## Docs

| Datei | Inhalt |
|-------|--------|
| [SETUP.md](SETUP.md) | Installation, Zugangscode, Env |
| [FEATURES.md](FEATURES.md) | Status & Roadmap |
| [CHANGELOG.md](CHANGELOG.md) | Änderungsverlauf |

---

## MCP Quick Start

1. Anki Desktop + AnkiConnect (`2055492159`)
2. `npm install && npm run build`
3. Cursor MCP konfigurieren — Details in [SETUP.md](SETUP.md)
4. LLM-Key setzen (`GEMINI_API_KEY` / Together / OpenAI)

Beispiel-Prompts in Cursor:
- „List my Anki decks“
- „Enrich these cards with German explanations“
- „Sync the enriched cards to my Prüfungsvorbereitung deck“

---

## Website lokal

```bash
cd website
npm install
cp .env.example .env.local   # Admin + Zugangscode setzen
npm run dev
```

→ http://localhost:3000 — Startseite mit **Kreuzen** und **Anki (lokal)**.

---

## Repo-Struktur (kurz)

```
├── src/                 # MCP server (Anki)
├── website/             # Next.js App (Kreuzen + Anki-Dashboard)
│   ├── src/app/altfragen/
│   └── data/altfragen-bank.json
├── scripts/             # Klausur-Import-Skripte
├── SETUP.md
├── FEATURES.md
└── CHANGELOG.md
```
