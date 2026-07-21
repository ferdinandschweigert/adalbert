# Adalbert Feature-Roadmap 🚀

Eine strukturierte Übersicht über alle Features und die Entwicklungs-Roadmap von Adalbert – deiner KI-gestützten Lernplattform für Medizinstudenten mit Fokus auf Anki-Anreicherung und Altfragen-Training.

---

## 📋 Inhaltsverzeichnis

- [Vision](#-vision)
- [v1.0.0 – Fundament](#v100--fundament-aktuell)
- [v1.1.0 – Anki-Anreicherung Plus](#v110--anki-anreicherung-plus)
- [v1.2.0 – Deck-Organisation](#v120--deck-organisation)
- [v1.3.0 – Intelligente Tags](#v130--intelligente-tags)
- [v2.0.0 – Lernplattform Altfragen](#v200--lernplattform-altfragen)
- [v2.1.0 – Prüfungssimulation](#v210--prüfungssimulation)
- [v2.2.0 – Lernstatistiken & Analytics](#v220--lernstatistiken--analytics)
- [v3.0.0 – Community & Zusammenarbeit](#v300--community--zusammenarbeit)
- [Langfristige Vision](#-langfristige-vision-v40)

---

## 🎯 Vision

**Adalbert** entwickelt sich von einem Anki-Anreicherungs-Tool zu einer vollständigen Lernplattform für Medizinstudenten:

1. **Anki-Anreicherung** – KI-generierte Erklärungen für Prüfungskarten
2. **Altfragen-Training** – Strukturiertes Lernen mit echten Prüfungsfragen
3. **Lernplattform** – Umfassende Tools für effektives Medizinstudium

---

## v1.0.0 – Fundament (Aktuell) ✅

> **Status:** Implementiert | **Release:** Initial

### 🔧 Kern-Features

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| MCP Server | ✅ | Hintergrund-Server für Cursor-Integration |
| AnkiConnect Integration | ✅ | Direkte Verbindung zu Anki Desktop |
| Gemini API Integration | ✅ | KI-gestützte Erklärungsgenerierung |
| APKG Import | ✅ | Lesen von Anki-Prüfungsdecks |
| Live Website | ✅ | [adalbertanki.vercel.app](https://adalbertanki.vercel.app) |

### 📝 Karten-Anreicherung

- ✅ **LÖSUNG** – Korrekte Antwort(en) klar dargestellt
- ✅ **ERKLÄRUNG** – Detaillierte deutsche Erklärung
- ✅ **ESELSBRÜCKE** – Merksprüche und Gedächtnisstützen
- ✅ **REFERENZ** – Lehrbuch-/Leitlinien-Verweise

### 📚 Unterstützte Fragetypen

- ✅ **KPRIM** – Multiple-Choice mit mehreren richtigen Antworten
- ✅ **MC** – Standard Multiple-Choice
- ✅ **SC** – Single-Choice

---

## v1.1.0 – Anki-Anreicherung Plus

> **Status:** Geplant | **Priorität:** Hoch

### 🆕 Neue Anreicherungs-Features

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Batch-Anreicherung | 🔲 | Alle Karten eines Decks automatisch anreichern |
| Anreicherungs-Vorlagen | 🔲 | Verschiedene Erklärungs-Stile (kurz/lang/detailliert) |
| Fachspezifische Prompts | 🔲 | Angepasste Prompts für verschiedene Fächer |
| Erklärungs-Qualitätsprüfung | 🔲 | Automatische Validierung der Erklärungen |
| Multi-API Support | 🔲 | GPT-4, Claude, Gemini wählbar |

### 📊 Anreicherungs-Statistiken

- 🔲 **Fortschritts-Tracking** – Wie viele Karten bereits angereichert
- 🔲 **Qualitäts-Score** – Bewertung der Erklärungsqualität
- 🔲 **Kosten-Tracking** – API-Kosten pro Anreicherung

---

## v1.2.0 – Deck-Organisation

> **Status:** Geplant | **Priorität:** Hoch

### 🗂️ Deck-Hierarchie

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Decks umbenennen | 🔲 | Standardisierte Namenskonventionen |
| Decks zusammenführen | 🔲 | Ähnliche Decks kombinieren |
| Hierarchien erstellen | 🔲 | z.B. `TUD Klinik::Semester 9::Orthopädie` |
| Leere Decks finden | 🔲 | Ungenutzte Decks identifizieren |

### 📁 Beispiel-Struktur

```
TUD Klinik/
  ├── Semester 9/
  │   ├── Altfragen/
  │   │   ├── Orthopädie (343 Karten)
  │   │   ├── Innere Medizin
  │   │   └── Chirurgie
  │   └── Lernkarten/
  │       └── Orthopädie Wichtig (~50 Karten)
  └── Semester 10/
      └── ...
```

### 🔍 Duplikate & Qualität

- 🔲 **Exakte Duplikate finden** – Identische Fragen erkennen
- 🔲 **Ähnliche Fragen finden** – Fragen mit ähnlichem Wortlaut
- 🔲 **Duplikat-Report** – Übersicht & Zusammenführen
- 🔲 **Karten ohne Erklärung** – Automatisch identifizieren
- 🔲 **Leere/Ungültige Karten** – Qualitätsprobleme erkennen

---

## v1.3.0 – Intelligente Tags

> **Status:** Geplant | **Priorität:** Mittel

### 🏷️ Automatisches Tagging

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Deck-basierte Tags | 🔲 | `#Orthopädie`, `#Altfragen`, `#Semester9` |
| Fragetyp-Tags | 🔲 | `#KPRIM`, `#MC`, `#SC` |
| Themen-Tags | 🔲 | `#Hüfte`, `#Wirbelsäule`, `#Knie` |
| Wichtigkeits-Tags | 🔲 | `#Wichtig`, `#Prüfungsrelevant` |

### 🧠 Intelligente Kategorisierung

- 🔲 **Themen automatisch erkennen** – Aus Frageninhalt extrahieren
- 🔲 **Schwierigkeit einschätzen** – Basierend auf Komplexität
- 🔲 **Wichtigkeit bewerten** – Für Subset-Erstellung
- 🔲 **Tag-Hierarchien** – `#Medizin::Orthopädie::Hüfte`

### 📚 Wichtig-Subset Feature

- 🔲 **Ankiphil-Style Subsets** – ~50 wichtigste Karten aus großen Decks
- 🔲 **Basierend auf:** Prüfungshäufigkeit, Grundlagenwissen, Fehlerquellen
- 🔲 **Automatische Sub-Deck-Erstellung** – `Orthopädie Wichtig`

---

## v2.0.0 – Lernplattform Altfragen 🎓

> **Status:** Teilweise live (v1 Subpage) | **Priorität:** Hoch | **Major Release**

### ✅ Live auf der Website (`/altfragen` + `/altfragen/admin`)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Öffentliches Kreuzen | ✅ | Studierende sehen nur freigegebene Klausuren und üben |
| Admin-Panel | ✅ | Passwortgeschützt: Upload, KI-Konvertierung, Prüfung, Freigabe |
| PDF/Text-Upload | ✅ | Gedächtnisprotokolle hochladen oder Text einfügen |
| KI-Konvertierung | ✅ | Automatisch SC/MC/KPRIM mit Lösungsvorschlägen |
| Gemeinsame Klausurbank | ✅ | Server-seitig (`data/altfragen-bank.json`, optional GitHub-Token) |
| Quiz-Modus (Kreuzen) | ✅ | Anklickbare Optionen, Feedback, Score, Fortsetzen |

### 🏥 Altfragen-Datenbank (weiter geplant)

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Altfragen-Import | ✅ | Admin-Upload-Pipeline live |
| Fach-Kategorisierung | 🔲 | Strukturierung nach Fächern/Semestern |
| Universität-Filter | 🔲 | Altfragen nach Uni sortieren |
| Jahr-Filter | 🔲 | Altfragen nach Prüfungsjahr |
| Schwierigkeitsgrad | 🔲 | Einfach/Mittel/Schwer Klassifizierung |

### 📖 Fächer-Übersicht

```
📚 Klinische Fächer
├── Innere Medizin
│   ├── Kardiologie (245 Fragen)
│   ├── Pneumologie (189 Fragen)
│   └── Gastroenterologie (156 Fragen)
├── Chirurgie
│   ├── Allgemeinchirurgie (312 Fragen)
│   ├── Unfallchirurgie (198 Fragen)
│   └── Viszeralchirurgie (167 Fragen)
├── Orthopädie (343 Fragen)
├── Neurologie (278 Fragen)
└── ...

📚 Vorklinische Fächer
├── Anatomie (520 Fragen)
├── Physiologie (445 Fragen)
├── Biochemie (389 Fragen)
└── ...
```

### 🎯 Lern-Modi

- 🔲 **Klassisch** – Frage anzeigen, Antwort aufdecken
- ✅ **Quiz-Modus** – Interaktive Abfrage mit Feedback (`/altfragen`)
- 🔲 **Spaced Repetition** – Anki-Style Wiederholungen
- 🔲 **Random-Modus** – Zufällige Fragen aus gewählten Fächern

---

## v2.1.0 – Prüfungssimulation

> **Status:** Geplant | **Priorität:** Mittel

### 📝 Prüfungs-Modi

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Mock-Exams | 🔲 | Realistische Prüfungssimulation |
| Zeitlimit | 🔲 | Prüfungszeit konfigurierbar |
| Fach-Mix | 🔲 | Kombinierte Fragen aus mehreren Fächern |
| Semester-Prüfung | 🔲 | Simulation einer Semester-Endprüfung |

### 🏆 Prüfungsergebnisse

- 🔲 **Sofort-Auswertung** – Ergebnis nach Prüfungsende
- 🔲 **Detaillierte Analyse** – Schwächen & Stärken identifizieren
- 🔲 **Vergleich** – Performance vs. Durchschnitt
- 🔲 **Empfehlungen** – Welche Themen wiederholen

### 📅 Prüfungs-Kalender

- 🔲 **Prüfungstermine eintragen** – Countdown & Planung
- 🔲 **Lernplan-Generator** – Automatischer Lernplan basierend auf Zeit
- 🔲 **Tägliche Ziele** – Empfohlene Lerneinheiten

---

## v2.2.0 – Lernstatistiken & Analytics

> **Status:** Geplant | **Priorität:** Mittel

### 📊 Persönliche Statistiken

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Lernzeit-Tracking | 🔲 | Gesamte Lernzeit pro Tag/Woche/Monat |
| Karten-Statistiken | 🔲 | Gelernte/Neue/Fällige Karten |
| Erfolgsquote | 🔲 | Richtig/Falsch pro Fach |
| Streak-Tracking | 🔲 | Tägliche Lernsträhne |

### 📈 Fortschritts-Dashboard

```
📊 Dein Lernfortschritt diese Woche
═══════════════════════════════════
✅ Gelernte Karten:     847
⏱️ Lernzeit:           12h 34min
📈 Erfolgsquote:       78%
🔥 Streak:             14 Tage

📚 Top Fächer diese Woche:
1. Orthopädie        ████████████ 89%
2. Innere Medizin    ████████░░░░ 72%
3. Chirurgie         ███████░░░░░ 65%

⚠️ Wiederholungsbedarf:
- Pharmakologie (43 Karten fällig)
- Neurologie (28 Karten fällig)
```

### 🎯 Schwächen-Analyse

- 🔲 **Themen mit niedrigster Erfolgsquote** – Fokus-Empfehlungen
- 🔲 **Häufig falsche Fragen** – Markierte Problemkarten
- 🔲 **Vergessens-Kurve** – Wann Wiederholung nötig
- 🔲 **Verbesserungs-Trend** – Fortschritt über Zeit

---

## v3.0.0 – Community & Zusammenarbeit

> **Status:** Langfristig | **Priorität:** Niedrig | **Major Release**

### 👥 Community-Features

| Feature | Status | Beschreibung |
|---------|--------|--------------|
| Deck-Sharing | 🔲 | Angereicherte Decks teilen |
| Erklärungs-Bewertung | 🔲 | Community bewertet Erklärungen |
| Diskussionen | 🔲 | Fragen zu schwierigen Karten stellen |
| Lerngruppen | 🔲 | Gemeinsam lernen & Fortschritt teilen |

### 🏆 Gamification

- 🔲 **Achievements** – Meilensteine & Abzeichen
- 🔲 **Leaderboard** – Rangliste (optional, anonymisiert)
- 🔲 **Challenges** – Wöchentliche Lern-Challenges
- 🔲 **XP-System** – Punkte für Lernfortschritt

### 📤 Deck-Marketplace

- 🔲 **Hochwertige Decks teilen** – Von der Community kuratiert
- 🔲 **Deck-Bewertungen** – Sterne & Reviews
- 🔲 **Fach-Kategorien** – Decks nach Fächern durchsuchen
- 🔲 **Universität-spezifische Decks** – Nach Uni filtern

---

## 🔮 Langfristige Vision (v4.0+)

### 🤖 KI-Tutor

- 🔲 **Personalisierter Lernassistent** – KI kennt deine Schwächen
- 🔲 **Adaptive Fragen** – Schwierigkeit passt sich an
- 🔲 **Erklärungen on-demand** – Bei jeder Frage nachfragen
- 🔲 **Lernstil-Anpassung** – Visuell/Auditiv/Praktisch

### 📱 Mobile App

- 🔲 **iOS & Android App** – Unterwegs lernen
- 🔲 **Offline-Modus** – Ohne Internet verfügbar
- 🔲 **Push-Notifications** – Lern-Erinnerungen
- 🔲 **Widget** – Tägliche Karte auf dem Homescreen

### 🔗 Integrationen

- 🔲 **Amboss-Integration** – Verknüpfung mit Amboss-Artikeln
- 🔲 **Meditricks-Links** – Merkbilder verlinken
- 🔲 **Lehrbuch-Integration** – Direkte Kapitel-Verweise
- 🔲 **Kalender-Sync** – Prüfungstermine synchronisieren

---

## 📊 Status-Legende

| Symbol | Bedeutung |
|--------|-----------|
| ✅ | Implementiert |
| 🔲 | Geplant |
| 🚧 | In Entwicklung |
| ⏸️ | Pausiert |

---

## 💡 Feature-Vorschläge

Hast du Ideen für neue Features? Erstelle ein GitHub Issue oder kontaktiere uns!

**Fokus-Bereiche für Vorschläge:**
- 📚 Anki-Anreicherung verbessern
- 🎓 Altfragen-Training optimieren
- 📊 Lernstatistiken erweitern
- 👥 Community-Features

---

*Zuletzt aktualisiert: Januar 2026*
