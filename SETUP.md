# Setup — Adalbert

## 1. Voraussetzungen

1. **Node.js** 18+
2. **Anki Desktop** + Add-on **AnkiConnect** (`2055492159`) — nur für das Anki-Modul
3. **LLM API-Key** (Gemini / TogetherAI / OpenAI-kompatibel) — Anki-Anreicherung / Admin-Konvertierung

---

## 2. MCP-Server (Cursor / Anki-Anreicherung)

Im Repo-Root:

```bash
npm install
npm run build
```

Cursor → **MCP: Edit Config**, z. B.:

```json
{
  "mcpServers": {
    "anki": {
      "command": "node",
      "args": ["/ABSOLUTER/PFAD/ZU/adalbert/dist/index.js"],
      "env": {
        "LLM_PROVIDER": "gemini",
        "GEMINI_API_KEY": "YOUR_KEY"
      }
    }
  }
}
```

Pfad auf dein lokales Clone anpassen. Cursor neu starten.

### LLM-Optionen

| Variable | Bedeutung |
|----------|-----------|
| `LLM_PROVIDER` | `gemini` (default), `together`, `openai`, `openai-compatible` |
| `LLM_FALLBACK_PROVIDERS` | z. B. `together,openai` |
| `LLM_MODEL` / `GEMINI_MODEL` / … | Modellwahl |
| `LLM_BASE_URL` | für `openai-compatible` |
| `LLM_REQUEST_DELAY_MS` | Rate-Limit zwischen Karten |

---

## 3. Website (Kreuzen + Anki-Dashboard)

```bash
cd website
npm install
cp .env.example .env.local
npm run dev
```

http://localhost:3000

- **Kreuzen:** `/altfragen` (Fachschafts-Code, wenn gesetzt)
- **Anki-Dashboard:** `/anki` — **nur lokal** mit AnkiConnect + LLM-Key; auf dem Live-Host deaktiviert

Beispiel `.env.local`:

```
ALTFRAGEN_ADMIN_PASSWORD=dein-starkes-admin-passwort
SITE_ACCESS_CODE=dein-fachschafts-code
LLM_PROVIDER=gemini
GEMINI_API_KEY=dein-api-key
```

---

## 4. Gesamte Site — Teilen mit der Fachschaft

Ziel: Mitstudierende nutzen Kreuzen **und** Anki hinter einem gemeinsamen Zugangscode.

| Rolle | URL | Zugang |
|-------|-----|--------|
| Studierende | `/` · `/altfragen` · `/anki` | `SITE_ACCESS_CODE` (oder `ALTFRAGEN_ACCESS_CODE`) |
| Admin | `/altfragen/admin` | zusätzlich `ALTFRAGEN_ADMIN_PASSWORD` (**Pflicht**) |

### Checkliste vor dem Teilen

1. Auf Vercel **`SITE_ACCESS_CODE`** (oder `ALTFRAGEN_ACCESS_CODE`) setzen — ohne Code ist die Site offen.
2. **`ALTFRAGEN_ADMIN_PASSWORD`** setzen (stark, einzigartig; ohne Variable ist Admin deaktiviert).
3. LLM-Keys setzen (`GEMINI_API_KEY` / …) für Anki-Anreicherung & PDF auf Vercel.
4. Link teilen: Live-URL + Zugangscode (z. B. auf der passwortgeschützten Fachschaftsseite).
5. Alle Seiten hinter dem Gate; Unlock unter `/access`. Cookie speichert ein Session-Token (nicht den Klartext-Code).

### Anki auf Vercel (sicher)

Der Server greift **nie** auf dein Anki zu. Stattdessen:

1. Browser ↔ `127.0.0.1:8765` (AnkiConnect) auf **deinem** Rechner  
2. Browser → Vercel nur für LLM (Anreichern / Priorisieren / PDF), hinter dem Zugangscode  

**Einmalig in AnkiConnect Config** (`webBindAddress` bleibt `127.0.0.1`):

```json
{
  "webBindAddress": "127.0.0.1",
  "webBindPort": 8765,
  "webCorsOriginList": [
    "http://localhost",
    "https://adalbert.vercel.app"
  ]
}
```

Niemals AnkiConnect auf `0.0.0.0` binden oder per Tunnel öffentlich machen.

### Öffentliches Repo

Das GitHub-Repo ist öffentlich — inkl. `website/data/altfragen-bank.json`. Der Zugangscode gilt nur für die Live-Site, nicht für den Clone. Seiten sind `noindex`; IMPP-Inhalt nicht zusätzlich öffentlich bewerben.

### Umgebungsvariablen (Vercel / Website)

| Variable | Zweck |
|----------|--------|
| `SITE_ACCESS_CODE` | Fachschafts-Code für **gesamte** Site (**empfohlen vor Teilen**) |
| `ALTFRAGEN_ACCESS_CODE` | Alias / Fallback für denselben Code |
| `ALTFRAGEN_ADMIN_PASSWORD` | Admin-Login (**erforderlich**) |
| `GEMINI_API_KEY` / LLM-Keys | PDF/Text-Konvertierung, Erklärungen, Anki-Anreicherung |
| `ALTFRAGEN_GITHUB_TOKEN` | Persistente Bank + Stats auf Vercel |
| `ALTFRAGEN_GITHUB_REPO` | Default `ferdinandschweigert/adalbert` |
| `ALTFRAGEN_GITHUB_PATH` | Default `website/data/altfragen-bank.json` |
| `ALTFRAGEN_GITHUB_BRANCH` | Default `main` |

Ohne GitHub-Token: Bank liegt in `website/data/altfragen-bank.json` (lokal ok; auf Vercel Writes flüchtig — Token setzen oder Datei committen).

### Klausuren importieren (Skript)

```bash
# Beispiel 2025-A (3 PDFs → eine Klausur)
node scripts/import-2025a-staatsexamen.mjs

# M2 Gedächtnisprotokoll (grüne Markierungen)
node scripts/import-m2-gedaechtnisprotokoll.mjs path/to/protocol.pdf
```

---

## 5. Troubleshooting

**Cannot connect to Anki Desktop** — Anki läuft? AnkiConnect aktiv? Domain in `webCorsOriginList`? Bindung `127.0.0.1`?

**Admin: „nicht konfiguriert“** — `ALTFRAGEN_ADMIN_PASSWORD` in Vercel / `.env.local` setzen und neu deployen.

**Zugangscode erforderlich** — `SITE_ACCESS_CODE` teilen bzw. unter `/access` freischalten.

**LLM API key not set** — Key in Vercel Env / `website/.env.local`, dann neu deployen/starten.

**Altfragen leer nach Deploy** — Bank committen oder `ALTFRAGEN_GITHUB_TOKEN` setzen.
