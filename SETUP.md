# Setup Instructions for Anki MCP Server

## Step 1: Install Dependencies

```bash
cd /Users/ferdinandschweigert/Coding/anki
npm install
```

## Step 2: Build the Project

```bash
npm run build
```

## Step 3: Get an LLM API Key (choose one)

**Option A: Gemini**
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

**Option B: TogetherAI**
1. Go to https://api.together.xyz
2. Create an API key
3. Copy the API key

**Option C: OpenAI**
1. Go to https://platform.openai.com
2. Create an API key
3. Copy the API key

## Step 4: Install AnkiConnect in Anki Desktop

1. Open Anki Desktop
2. Go to Tools → Add-ons
3. Click "Get Add-ons"
4. Enter code: `2055492159`
5. Click "OK" and restart Anki

## Step 5: Configure Cursor MCP

1. In Cursor, press `Cmd+Shift+P` (or `Ctrl+Shift+P` on Windows/Linux)
2. Type "MCP: Edit Config" and select it
3. Add this configuration:

```json
{
  "mcpServers": {
    "anki": {
      "command": "node",
      "args": ["/Users/ferdinandschweigert/Coding/anki/dist/index.js"],
      "env": {
        "LLM_PROVIDER": "gemini",
        "GEMINI_API_KEY": "YOUR_GEMINI_API_KEY_HERE"
      }
    }
  }
}
```

**Important:** Replace the API key with your actual key.

**Alternative example (TogetherAI):**
```json
{
  "mcpServers": {
    "anki": {
      "command": "node",
      "args": ["/Users/ferdinandschweigert/Coding/anki/dist/index.js"],
      "env": {
        "LLM_PROVIDER": "together",
        "TOGETHER_API_KEY": "YOUR_TOGETHER_API_KEY",
        "TOGETHER_MODEL": "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"
      }
    }
  }
}
```

### Optional LLM Configuration

You can switch providers or add fallbacks without changing code:

- `LLM_PROVIDER`: `gemini` (default), `together`, `openai`, `openai-compatible`
- `LLM_FALLBACK_PROVIDERS`: e.g. `together,openai`
- `LLM_MODEL` or provider-specific `GEMINI_MODEL`, `TOGETHER_MODEL`, `OPENAI_MODEL`
- `LLM_BASE_URL` for `openai-compatible` (e.g. `https://api.together.xyz`)
- `LLM_REQUEST_DELAY_MS` to tune rate limiting between cards

## Step 6: Restart Cursor

Close and reopen Cursor to load the MCP server.

## Step 7: Test It!

Once Cursor restarts, you can ask me (Adalbert):
- "List my Anki decks"
- "Read the deck at ~/Downloads/exam.apkg"
- "Enrich these cards with German explanations"
- "Sync them to my 'Prüfungsvorbereitung' deck"

## How It Connects

**MCP is NOT a CLI** - it's a background server that runs inside Cursor:

1. **MCP Server** (`dist/index.js`) runs as a background process
2. **Cursor** communicates with it via stdio (standard input/output)
3. **I (Adalbert)** can call the MCP tools to interact with:
   - Your .apkg files (read them)
   - LLM provider (enrich cards)
   - Anki Desktop via AnkiConnect (sync cards)

You never need to run commands manually - just talk to me!

## Anreicherung über die Website (lokal)

Die Website kann Karten direkt anreichern. So gehst du vor:

1. **Anki Desktop** und **AnkiConnect** laufen lassen.
2. **Website lokal starten:**
   ```bash
   cd website && npm install && npm run dev
   ```
3. **LLM API-Key** in `website/.env.local` (Beispiel Gemini):
   ```
   LLM_PROVIDER=gemini
   GEMINI_API_KEY=dein-api-key
   ```
   API-Key: https://aistudio.google.com/apikey
4. Im Browser: http://localhost:3000
5. Im **Dashboard**:
   - Deck wählen (z.B. `TUD Klinik::9. Semester::Päd::Altfragen Pädiatrie`)
   - Im Block **„Karten anreichern“** die Anzahl setzen (z.B. 100)
   - Auf **„Erste 100 Karten anreichern“** klicken
6. Pro Batch werden 5 Karten verarbeitet (~1–2 Min. pro Batch). 100 Karten dauern etwa 30–40 Minuten.
7. Anschließend Vorschau prüfen und mit **„Zu Anki hinzufügen“** ins Ziel-Deck übernehmen (Standard: `Deckname (angereichert)`).

## Troubleshooting

### "Cannot connect to Anki Desktop"
- Make sure Anki Desktop is **running**
- Verify AnkiConnect is installed (Tools → Add-ons)
- Check that AnkiConnect is enabled

### "LLM API key not set"
- Make sure you added the API key to the Cursor MCP config or `.env.local`
- Restart Cursor after adding the key

### "File not found"
- Use absolute paths or paths relative to your current directory
- You can use `~` for home directory (e.g., `~/Downloads/exam.apkg`)

## Altfragen (Website): Admin + Kreuzen

- **Studierende**: `/altfragen` – nur freigegebene Klausuren kreuzen
- **Admin**: `/altfragen/admin` – hochladen, konvertieren, prüfen, freigeben

### Umgebungsvariablen (Website / Vercel)

| Variable | Zweck |
|----------|--------|
| `ALTFRAGEN_ADMIN_PASSWORD` | Admin-Login (Standard lokal: `adalbert-admin`) |
| `GEMINI_API_KEY` / LLM-Keys | Für PDF/Text → Fragen-Konvertierung |
| `ALTFRAGEN_GITHUB_TOKEN` | Optional: schreibt die Klausurbank persistent nach GitHub (für Vercel) |
| `ALTFRAGEN_GITHUB_REPO` | Optional, Default `ferdinandschweigert/adalbert` |
| `ALTFRAGEN_GITHUB_PATH` | Optional, Default `website/data/altfragen-bank.json` |
| `ALTFRAGEN_GITHUB_BRANCH` | Optional, Default `main` |

Ohne GitHub-Token speichert das Admin-Panel lokal in `website/data/altfragen-bank.json` (lokal/dev). Auf Vercel ohne Token sind Writes flüchtig – für Produktion Token setzen oder die Bank-Datei committen.
