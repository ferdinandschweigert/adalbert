<p align="center">
  <img src="website/public/adalbert-mark.png" alt="Adalbert" width="96" />
</p>

# Adalbert

Lernplattform für Medizinstudierende mit **zwei klaren Modulen**:

| Modul | Was es tut | Wo |
|-------|------------|-----|
| **Kreuzen** | Freigegebene Staatsexamen-/Gedächtnisprotokoll-Fragen üben (Fachschafts-Code) | [`/altfragen`](https://adalbertanki.vercel.app/altfragen) |
| **Anki** | Decks **lokal** anreichern & nach Anki Desktop synchen | lokal `/anki` + MCP in Cursor |

🌐 **Live:** [https://adalbertanki.vercel.app](https://adalbertanki.vercel.app)

> „Adalbert“ ist ein persönlicher Projektname — Open-Source-Lernhilfe ohne kommerziellen Namensanspruch.

---

## Teilen (Fachschaft)

1. Live-URL + **Zugangscode** (`ALTFRAGEN_ACCESS_CODE`) weitergeben — nicht öffentlich ohne Gate.
2. Admin-Passwort (`ALTFRAGEN_ADMIN_PASSWORD`) nur an Betreuende; **kein Default** mehr.
3. Details: [SETUP.md](SETUP.md) → Abschnitt „Teilen mit der Fachschaft“.

**Anki** auf dem Live-Host ist bewusst eingeschränkt (AnkiConnect nur lokal).

---

## Schnellüberblick

### Kreuzen (Website)
- Klausur-Liste und Amboss-Style Übungsmodus hinter optionalem Fachschafts-Code
- Sofort-Feedback bei SC, Übersicht, Auswertung (richtig/falsch/Zeit)
- Admin (`/altfragen/admin`): Upload, Konvertierung, Freigabe
- Community-Stats nur mit gültigem Zugang (wenn Code aktiv)

Aktuell u. a.:
- **M2 SS26** Gedächtnisprotokoll (~319 Fragen)
- **M2 2025-A** Staatsexamen (320 Fragen aus 3 PDF-Teilen)

### Anki (lokal + MCP)
- MCP-Server in Cursor: Decks lesen, anreichern, zu Anki Desktop synchen
- Website-Dashboard unter `/anki` **nur lokal** (AnkiConnect + LLM-Key)
- Pro Karte: **Lösung · Erklärung · Eselsbrücke · Referenz**
- Fragetypen: SC, MC, KPRIM

---

## Docs

| Datei | Inhalt |
|-------|--------|
| [SETUP.md](SETUP.md) | Installation, Fachschafts-Teilen, Env |
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
