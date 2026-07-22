# Changelog

Kurze Übersicht der wichtigsten Änderungen.

---

## 07/2026

### Altfragen-Lernmodus (Website `/altfragen`)
- **Öffentlich nur Kreuzen**: freigegebene Klausuren üben
- **Admin-Panel** (`/altfragen/admin`): Upload, KI-Konvertierung, Lösungsprüfung, Freigabe
- **Gemeinsame Klausurbank** (Datei + optional GitHub Contents API)
- **M2 SS26**: 319 Fragen mit grünen Lösungen (Pixel-Extraktion, seitenübergreifend)
- **Amboss-Style**: Fragenübersicht, Seitennavigation, Springen zu Fragen
- **Option-Erklärungen**: Warum richtig/falsch inkl. Amboss-/Wikipedia-Links
- **Community-Statistik**: Wie oft Optionen gewählt / % richtig (Seed + Live)
- **Fachschafts-Zugang**: optionaler `ALTFRAGEN_ACCESS_CODE` (kein Login nötig)
- Prompts für **2. Staatsexamen / M2** generalisiert (nicht mehr Derma-only)

---

## 01/2026

### Stabilität & Sicherheit
- **Enrich-Cards Pagination Fix**: Offset/Batching arbeitet wieder deck-weit (keine leeren Batches mehr)
- **Anki Sync Dry-Run**: Optionaler Testlauf, um Matches/Fehler vor dem Schreiben zu sehen
- **LLM-Timeouts & Prompt-Sanitizing**: Verhindert Hänger und reduziert HTML-Störungen

### PDF Klausur-Import (NEU)
- **PDF hochladen** → Altklausuren als Anki-Karten
- **LLM extrahiert Fragen** (SC/MC/KPRIM erkannt)
- **LLM bestimmt korrekte Antworten** + Erklärungen
- **Deck-Auswahl**: Neues Deck oder Unterdeck (z.B. "Derma::Altklausuren::WS18-19")
- Format: Question, Q_1–Q_5, Answers (kompatibel mit bestehenden Decks)

### Resume-Funktion für Anreicherung
- **Fortschritt wird automatisch gespeichert** im Browser (localStorage)
- Bei Netzwerkfehler oder Computer-Schlaf: **Fortsetzen** statt Neustart
- "Neu starten" Button um von vorne zu beginnen
- Anzeige des gespeicherten Fortschritts mit Zeitstempel

### 80/20 Themenliste (LLM)
- Top 15 **Themen** statt einzelner Fragen, Fokus auf Konzepte
- LLM-basierte Analyse mit Lernzielen und Begründungen
- Kein nutzloser Heuristik-Fallback mehr; klare Fehlermeldung, wenn LLM nicht verfügbar

### Karten-Anreicherung: Struktur & Originalerhalt
- **Bewertungstabelle**: Aussage | Richtig/Falsch | Begründung (MC-Fragen)
- **Zusammenfassung** als Take-Home-Message
- **Original-Frage, Q1–Q5, Binärcode** bleiben erhalten und werden klickbar/lesbar angezeigt
- Binärcode-Anzeige: Grün (✓) / Rot (✗) pro Option; Leerzeichen im Code werden ignoriert

### Export: Anreicherung in Original-Karten (Option A)
- **Keine neuen Karten** mehr; Anreicherung wird ins **Sources-Feld** der bestehenden Karten geschrieben
- KPRIM/MC-Format (Question, Q_1–Q_5, Answers) bleibt unverändert
- Lösung, Tabelle, Zusammenfassung, Eselsbrücke, Referenz, Hinweis landen im Sources-Feld

---

*Ältere Änderungen sind in den Commits nachvollziehbar.*
