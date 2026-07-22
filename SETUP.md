# Setup — Adalbert

## 1. Voraussetzungen

1. **Node.js** 18+
2. **Anki Desktop** + Add-on **AnkiConnect** (`2055492159`)
3. **LLM API-Key** (Gemini / TogetherAI / OpenAI-kompatibel)

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
cp .env.example .env.local   # falls vorhanden
npm run dev
```

http://localhost:3000

- **Kreuzen:** `/altfragen`
- **Anki-Dashboard:** `/anki` (braucht laufendes Anki + Key in `.env.local`)

Beispiel `.env.local`:

```
LLM_PROVIDER=gemini
GEMINI_API_KEY=dein-api-key
```

Im Dashboard: Deck wählen → Karten anreichern → nach Anki synchen.

---

## 4. Altfragen / Kreuzen

| Rolle | URL | Zugang |
|-------|-----|--------|
| Studierende | `/altfragen` | optional `ALTFRAGEN_ACCESS_CODE` |
| Admin | `/altfragen/admin` | `ALTFRAGEN_ADMIN_PASSWORD` (lokal Default: `adalbert-admin`) |

### Rechtlicher Rahmen

Offizielle IMPP-Fragen nicht öffentlich indexieren. Sinnvoll: Fachschafts-/Forum-Verteilung + optionaler Zugangscode; Seiten sind `noindex`.

### Umgebungsvariablen (Vercel / Website)

| Variable | Zweck |
|----------|--------|
| `ALTFRAGEN_ADMIN_PASSWORD` | Admin-Login |
| `ALTFRAGEN_ACCESS_CODE` | Optionaler Fachschafts-Code |
| `GEMINI_API_KEY` / LLM-Keys | PDF/Text-Konvertierung, Erklärungen |
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

**Cannot connect to Anki Desktop** — Anki läuft? AnkiConnect aktiv?

**LLM API key not set** — Key in MCP-Config oder `website/.env.local`, dann neu starten.

**Altfragen leer nach Deploy** — Bank committen oder `ALTFRAGEN_GITHUB_TOKEN` setzen.
