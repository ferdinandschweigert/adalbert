<p align="center">
  <img src="website/public/adalbert-mark.png" alt="Adalbert" width="96" />
</p>

# Adalbert

Lernplattform für Medizinstudierende mit **zwei klaren Modulen**:

| Modul | Was es tut | Wo |
|-------|------------|-----|
| **Kreuzen** | Freigegebene Staatsexamen-/Gedächtnisprotokoll-Fragen üben | [`/altfragen`](https://adalbertanki.vercel.app/altfragen) |
| **Anki** | Decks mit deutschen Erklärungen anreichern & nach Anki synchen | [`/anki`](https://adalbertanki.vercel.app/anki) + MCP in Cursor |

🌐 **Live:** [https://adalbertanki.vercel.app](https://adalbertanki.vercel.app)

> „Adalbert“ ist ein persönlicher Projektname — Open-Source-Lernhilfe ohne kommerziellen Namensanspruch.

---

## Schnellüberblick

### Kreuzen (Website)
- Öffentliche Klausur-Liste und Amboss-Style Übungsmodus
- Sofort-Feedback bei SC, Übersicht, Auswertung (richtig/falsch/Zeit)
- Admin (`/altfragen/admin`): Upload, Konvertierung, Freigabe
- Optionaler Fachschafts-Zugangscode (`ALTFRAGEN_ACCESS_CODE`)

Aktuell u. a.:
- **M2 SS26** Gedächtnisprotokoll (~319 Fragen)
- **M2 2025-A** Staatsexamen (320 Fragen aus 3 PDF-Teilen)

### Anki (Website + MCP)
- MCP-Server in Cursor: Decks lesen, anreichern, zu Anki Desktop synchen
- Website-Dashboard für Anreicherung (lokal mit AnkiConnect + LLM-Key)
- Pro Karte: **Lösung · Erklärung · Eselsbrücke · Referenz**
- Fragetypen: SC, MC, KPRIM

---

## Docs

| Datei | Inhalt |
|-------|--------|
| [SETUP.md](SETUP.md) | Installation MCP, Website, Altfragen-Env |
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
npm run dev
```

→ http://localhost:3000 — Startseite mit **Kreuzen** und **Anki**.

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
