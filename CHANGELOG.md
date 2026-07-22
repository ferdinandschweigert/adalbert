# Changelog

Kurze Übersicht der wichtigsten Änderungen.

---

## 07/2026

### Website-Struktur & Doku
- **Startseite neu:** klare Trennung **Kreuzen** vs **Anki** (Header-Nav, zwei Module, Anker `#kreuzen` / `#anki`)
- Gemeinsamer Site-Header/Footer; Altfragen nutzt dieselbe Nav
- Doku aktualisiert: README, SETUP, FEATURES

### Altfragen / Kreuzen
- **Öffentlich nur Kreuzen**; Admin-Panel für Upload & Freigabe
- **M2 SS26** (~319) + **M2 2025-A** (320 Fragen, 3 PDFs als eine Klausur)
- Amboss-Style UI, Auswertung (richtig/falsch/Zeit), Einzel-Reset
- Community-Stats ohne Seed-Daten; Fake-Erklärungen entfernt
- Optionaler Fachschafts-Zugang; schlankere Exam-API (ohne Rationales-Blob)
- Favicon/Mark Adalbert; Header ohne Oval-Crop

### Anki
- Dashboard lazy-load auf der Startseite (`/#anki`)
- Bestehende MCP- und Website-Anreicherung unverändert nutzbar

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
- **Deck-Auswahl**: Neues Deck oder Unterdeck
- Format: Question, Q_1–Q_5, Answers (kompatibel mit bestehenden Decks)

### Resume-Funktion für Anreicherung
- Fortschritt im Browser (localStorage), Fortsetzen statt Neustart

### Karten-Anreicherung
- Bewertungstabelle, Zusammenfassung, Originalfelder erhalten
- Anreicherung ins Sources-Feld der bestehenden Karten

---

*Ältere Änderungen sind in den Commits nachvollziehbar.*
