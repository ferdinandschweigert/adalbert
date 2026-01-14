# Anki MCP Server - Adalbert

An MCP (Model Context Protocol) server that enriches Anki exam decks with AI-generated German explanations using Gemini API.

## How It Works

**MCP is NOT a CLI** - it's a background server that runs in Cursor. When you talk to me (Adalbert), I can call these tools to:
- Read your exam .apkg files
- Enrich cards with German explanations via Gemini API
- Sync enriched cards directly to Anki Desktop (no import/export!)

## Quick Start

See [SETUP.md](SETUP.md) for detailed installation instructions.

## Prerequisites

1. **Anki Desktop** with **AnkiConnect add-on** installed
   - Install AnkiConnect: Code `2055492159` in Anki
   - Make sure Anki Desktop is running

2. **Gemini API Key** (free tier)
   - Get it at: https://makersuite.google.com/app/apikey

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the project:
```bash
npm run build
```

3. Configure Cursor MCP (see [SETUP.md](SETUP.md) for details)

4. Restart Cursor

## Usage

Once configured, just ask me (Adalbert):
- "List my Anki decks"
- "Get cards from my 'Orthopädie' deck"
- "Enrich these cards with German explanations"
- "Sync the enriched cards to my 'Prüfungsvorbereitung' deck"

### Direct Anki Integration

The server can read cards directly from your Anki Desktop decks (no export needed!):
- Reads all fields including question, options (Q_1 to Q_5), and answer codes
- Preserves original answers in a separate field
- Adds enriched explanations without losing existing data

## Card Enrichment

Each card gets enriched with:
- **✅ LÖSUNG** - The correct answer(s) clearly stated at the top
- **📚 ERKLÄRUNG** - Detailed German explanation:
  - General introduction to the concept
  - Why the correct options are correct
  - Why the incorrect options are wrong
- **💡 ESELSBRÜCKE** - Memory aids (mnemonics) when applicable
- **📖 REFERENZ** - References to textbooks/guidelines (e.g., "Duale Reihe Orthopädie")

### Supported Question Types

- **KPRIM** (Multiple correct answers) - e.g., "1 1 0 1"
- **MC** (Multiple Choice) - Single correct answer
- **SC** (Single Choice) - One correct answer

The system automatically reads options from Anki cards and generates explanations for each option.

## How It Connects

The MCP server runs as a background process that Cursor communicates with. You never need to run commands manually - just talk to me and I'll handle everything!
