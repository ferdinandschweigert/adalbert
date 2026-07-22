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
ALTFRAGEN_ACCESS_CODE=dein-fachschafts-code
LLM_PROVIDER=gemini
GEMINI_API_KEY=dein-api-key
```

---

## 4. Altfragen / Kreuzen — Teilen mit der Fachschaft

Ziel: Mitstudierende üben freigegebene Klausuren unter einem gemeinsamen Zugangscode. Anki bleibt Companion für den eigenen Rechner.

| Rolle | URL | Zugang |
|-------|-----|--------|
| Studierende | `/altfragen` | `ALTFRAGEN_ACCESS_CODE` |
| Admin | `/altfragen/admin` | `ALTFRAGEN_ADMIN_PASSWORD` (**Pflicht**, kein Default) |

### Checkliste vor dem Teilen

1. Auf Vercel **`ALTFRAGEN_ACCESS_CODE`** setzen (ohne Code ist Kreuzen offen).
2. **`ALTFRAGEN_ADMIN_PASSWORD`** setzen (stark, einzigartig; ohne Variable ist Admin deaktiviert).
3. Link teilen: Live-URL + Zugangscode (nicht öffentlich posten, wo Suchmaschinen/Indexer mitlesen).
4. Altfragen-Seiten sind `noindex`; Admin ebenfalls.
5. Anki auf dem Live-Host klar als lokal kennzeichnen — kein Versprechen, dass Anreicherung online geht.

### Rechtlicher Rahmen

Offizielle IMPP-Fragen nicht öffentlich indexieren. Sinnvoll: Fachschafts-/Forum-Verteilung + Zugangscode; Seiten sind `noindex`.

### Umgebungsvariablen (Vercel / Website)

| Variable | Zweck |
|----------|--------|
| `ALTFRAGEN_ADMIN_PASSWORD` | Admin-Login (**erforderlich**) |
| `ALTFRAGEN_ACCESS_CODE` | Fachschafts-Code (**empfohlen vor Teilen**) |
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

**Cannot connect to Anki Desktop** — Anki läuft? AnkiConnect aktiv? Nur lokal, nicht auf Vercel.

**Admin: „nicht konfiguriert“** — `ALTFRAGEN_ADMIN_PASSWORD` in Vercel / `.env.local` setzen und neu deployen.

**Zugangscode erforderlich** — `ALTFRAGEN_ACCESS_CODE` teilen bzw. Cookie nach Login am Gate.

**LLM API key not set** — Key in MCP-Config oder `website/.env.local`, dann neu starten.

**Altfragen leer nach Deploy** — Bank committen oder `ALTFRAGEN_GITHUB_TOKEN` setzen.
