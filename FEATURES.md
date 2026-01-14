# Anki Organisations-Features für Adalbert

Eine Übersicht über mögliche Organisations-Features, die Adalbert für dein Anki-Setup bieten könnte.

## 🗂️ Deck-Organisation

### Deck-Hierarchie
- **Decks umbenennen** - Deck-Namen standardisieren und konsistent machen
- **Decks zusammenführen** - Mehrere ähnliche Decks zu einem kombinieren
- **Deck-Hierarchien erstellen** - Strukturierte Organisation (z.B. `TUD Klinik::Semester 9::Altfragen::Orthopädie`)
- **Leere Decks finden** - Automatisch leere oder ungenutzte Decks identifizieren
- **Deck-Namen standardisieren** - Konsistente Namenskonventionen durchsetzen

### Beispiel-Struktur
```
TUD Klinik/
  ├── Semester 9/
  │   ├── Altfragen/
  │   │   ├── Orthopädie (343 Karten)
  │   │   ├── Innere Medizin
  │   │   └── Chirurgie
  │   └── Lernkarten/
  │       └── Orthopädie Wichtig (Subset, ~50 Karten)
  └── Semester 10/
      └── ...
```

## 🏷️ Tag-Management

### Automatische Tags
- **Tags basierend auf Deck-Namen** - Automatisch Tags aus Deck-Hierarchie erstellen
  - `#Orthopädie` - Alle Orthopädie-Karten
  - `#Altfragen` - Alle Altfragen
  - `#Semester9` - Semester-Zuordnung
- **Tags basierend auf Fragetyp** - Automatisch Fragetyp-Tags vergeben
  - `#KPRIM` - Multiple-Choice mit mehreren richtigen Antworten
  - `#MC` - Standard Multiple-Choice
  - `#SC` - Single-Choice
- **Themen-Tags extrahieren** - Automatisch aus Frageninhalt extrahieren
  - `#Hüfte`, `#Wirbelsäule`, `#Fuß`, `#Knie`, etc.
- **Wichtigkeits-Tags** - Für Subset-Karten
  - `#Wichtig` - Für Ankiphil-Style Lernkarten

### Tag-Organisation
- **Tags standardisieren** - Inkonsistente Tags zusammenführen (z.B. "ortho" → "Orthopädie")
- **Tags zusammenführen** - Ähnliche Tags vereinheitlichen
- **Ungenutzte Tags entfernen** - Tags die nicht mehr verwendet werden löschen
- **Tag-Hierarchien** - Verschachtelte Tags erstellen (z.B. `#Medizin::Orthopädie::Hüfte`)

## 📚 Karten-Organisation

### Karten-Gruppierung
- **Karten nach Themen gruppieren** - Automatische Gruppierung nach Inhalt
  - Hüfte (45 Karten)
  - Wirbelsäule (38 Karten)
  - Knie (32 Karten)
  - Fuß/Sprunggelenk (28 Karten)
- **Karten nach Fragetyp sortieren** - Gruppierung nach KPRIM, MC, SC
- **Karten nach Schwierigkeit** - Basierend auf Häufigkeit oder Komplexität

### Wichtige Karten-Subset
- **Ankiphil-Style Lernkarten erstellen** - Wichtigste Karten extrahieren
  - ~50 wichtigste Karten aus 343
  - Basierend auf:
    - Häufigkeit in Prüfungen
    - Grundlagenwissen
    - Häufige Fehlerquellen
- **Sub-Deck automatisch erstellen** - `Orthopädie Wichtig` als Subset

### Karten-Bewegung
- **Karten zwischen Decks verschieben** - Reorganisation von Karten
- **Karten kopieren** - Für Subset-Erstellung ohne Original zu löschen
- **Karten filtern** - Nach Tags, Fragetyp, oder Inhalt

## 🔍 Duplikate & Qualität

### Duplikat-Erkennung
- **Exakte Duplikate finden** - Identische Fragen in verschiedenen Decks
- **Ähnliche Fragen finden** - Fragen mit leicht unterschiedlichem Wortlaut
- **Zusammenführen** - Duplikate automatisch zusammenführen oder markieren
- **Duplikat-Report** - Übersicht über alle gefundenen Duplikate

### Qualitätskontrolle
- **Karten ohne Erklärung finden** - Automatisch identifizieren und anreichern
- **Karten mit leeren Optionen** - Ungültige oder unvollständige Karten finden
- **Karten mit ungültigen Binärcodes** - Fehlerhafte Antwort-Codes identifizieren
- **Leere Karten** - Karten mit fehlendem Front/Back finden

## 📊 Statistiken & Übersicht

### Deck-Statistiken
- **Karten-Anzahl** - Total und nach Fragetyp
- **Tag-Verteilung** - Welche Tags werden wie oft verwendet
- **Themen-Verteilung** - Automatische Themen-Analyse
- **Erklärungs-Status** - Wie viele Karten haben bereits Erklärungen
- **Qualitäts-Metriken** - Vollständigkeit, Duplikate, etc.

### Beispiel-Report
```
Orthopädie Deck:
- 343 Karten total
- 120 KPRIM, 150 MC, 73 SC
- 0 Tags (sollte organisiert werden)
- 0 Karten mit Erklärungen (können angereichert werden)
- Themen: Hüfte (45), Wirbelsäule (38), Knie (32), Fuß (28)
```

## 🤖 Intelligente Features

### Automatische Kategorisierung
- **Themen automatisch erkennen** - Aus Frageninhalt Themen extrahieren
- **Schwierigkeit einschätzen** - Basierend auf Komplexität der Frage
- **Wichtigkeit bewerten** - Für Subset-Erstellung

### Vorschläge
- **Deck-Struktur-Vorschläge** - Basierend auf aktuellen Tags und Inhalten
- **Tag-Vorschläge** - Für neue Karten basierend auf Inhalt
- **Organisations-Vorschläge** - Wie Decks besser organisiert werden könnten

## 🔄 Wartung & Backup

### Wartung
- **Backup vor Änderungen** - Automatisches Backup vor größeren Operationen
- **Änderungsprotokoll** - Was wurde geändert, wann, warum
- **Validierung** - Deck-Struktur und Karten-Integrität prüfen

### Batch-Operationen
- **Massen-Tagging** - Viele Karten gleichzeitig taggen
- **Massen-Verschiebung** - Karten in Batches verschieben
- **Massen-Anreicherung** - Alle Karten ohne Erklärung anreichern

## 💡 Praktische Workflows

### Workflow 1: Deck initial organisieren
1. "Organisiere mein Orthopädie-Deck"
   - Tags vergeben (#Orthopädie, #Altfragen, #Semester9)
   - Themen-Tags extrahieren (#Hüfte, #Wirbelsäule, ...)
   - Statistiken zeigen

### Workflow 2: Wichtig-Subset erstellen
1. "Erstelle ein Wichtig-Subset mit 50 Karten"
   - Wichtigste Karten identifizieren
   - Neues Sub-Deck erstellen
   - Karten dorthin kopieren

### Workflow 3: Duplikate finden
1. "Finde Duplikate in meinen Decks"
   - Ähnliche Fragen finden
   - Vorschläge zum Zusammenführen

### Workflow 4: Qualität verbessern
1. "Finde alle Karten ohne Erklärung"
   - Liste generieren
   - Automatisch anreichern

## 🎯 Priorisierung

### Phase 1: Grundlagen (Höchste Priorität)
- ✅ Tags automatisch vergeben (Deck-basiert, Fragetyp)
- ✅ Statistiken & Übersicht
- ✅ Karten ohne Erklärung finden

### Phase 2: Organisation (Hohe Priorität)
- ✅ Wichtig-Subset erstellen
- ✅ Duplikate finden
- ✅ Deck-Hierarchie standardisieren

### Phase 3: Erweiterte Features (Mittlere Priorität)
- ✅ Themen-Tags automatisch extrahieren
- ✅ Karten nach Themen gruppieren
- ✅ Intelligente Vorschläge

### Phase 4: Wartung (Niedrige Priorität)
- ✅ Backup-System
- ✅ Änderungsprotokoll
- ✅ Batch-Operationen
