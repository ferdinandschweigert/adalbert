export type ChangelogBullet = string;

export type ChangelogSection = {
  title: string;
  items: ChangelogBullet[];
};

export type ChangelogMonth = {
  /** Display label, e.g. "08/2026" */
  id: string;
  sections: ChangelogSection[];
};

/** In-app changelog mirrored from CHANGELOG.md (newest first). */
export const CHANGELOG_MONTHS: ChangelogMonth[] = [
  {
    id: '08/2026',
    sections: [
      {
        title: 'Kreuzen · UI',
        items: [
          '**Changelog** im Footer als Popup, nach Monat gruppiert',
          '**KI-Hinweis** auf der Klausur-Liste kompakt (Info-Icon + KI) — Volltext per Klick',
          'Site-Footer auch auf Kreuzen-Seiten',
        ],
      },
    ],
  },
  {
    id: '07/2026',
    sections: [
      {
        title: 'Easter Egg',
        items: [
          '**Startseite:** Klick auf Adalbert spielt den Nick Song; Player erscheint ganz unten auf der Seite; Stop an der Figur / nochmal klicken',
        ],
      },
      {
        title: 'Share-Readiness',
        items: [
          '**Admin:** kein Default-Passwort mehr; Session-Token statt Klartext-Passwort in Cookie/Session',
          '**Stats-API** pro Klausur hinter demselben Zugangscode wie die Fragen',
          '**Anki** auf Startseite/`/anki` klar als lokal (AnkiConnect); Host-Banner verbessert',
          'Doku: Checkliste „Teilen / Zugangscode“ in SETUP/README',
        ],
      },
      {
        title: 'Kreuzungsdaten / Persistenz',
        items: [
          'Legacy-Exam-IDs (UUID → Slug) werden aus `localStorage` migriert',
          'Stats-Merge bevorzugt reichere Attempt-Historie (kein Wipe durch leeren Server)',
          'Warn-Banner auf Nicht-kanonischen Vercel-Hosts (`adalbertanki` vs `adalbert`)',
          'Export/Import-Backup für lokalen Fortschritt auf der Startseite',
          'Unvollständige GP-Optionen („?“) als „Nicht im Protokoll überliefert“ gekennzeichnet',
        ],
      },
      {
        title: 'Website-Struktur & Doku',
        items: [
          '**Startseite:** Module Kreuzen + Anki; Hero mit Figur/Text; **kein** Header-Logo auf `/`',
          '**Anki-Subpage** `/anki`; Header-Logo (Figur + „Adalbert“) nur auf Kreuzen- & Anki-Seiten',
          'Gemeinsamer Site-Header/Footer; Doku aktualisiert (README, SETUP, FEATURES)',
          'Live-URL: **https://adalbert.vercel.app**',
        ],
      },
      {
        title: 'Altfragen / Kreuzen',
        items: [
          '**Prüfungsmodus:** Umschalter Lernen ↔ Prüfung — Lösungen, Erklärungen und Richtig/Falsch erst nach „Klausur abgeben“',
          '**FAQ** auf der Klausur-Liste (Kurz erklärt)',
          'Fragen-Navigation als festes Raster (kein Lücken-Wrap)',
          'Fachschafts-Wording entfernt (neutraler Zugangscode)',
          '**Öffentlich nur Kreuzen**; Admin-Panel für Upload & Freigabe',
          '**M2 SS26** (~319) + **M2 2025-A** (320 Fragen, 3 PDFs als eine Klausur)',
          'Amboss-Style UI, Auswertung (richtig/falsch/Zeit), Einzel-Reset',
          'Community-Stats ohne Seed-Daten; Fake-Erklärungen entfernt',
          'Optionaler Zugangscode; schlankere Exam-API (ohne Rationales-Blob)',
          'Favicon/Mark Adalbert; Header ohne Oval-Crop',
        ],
      },
      {
        title: 'Anki',
        items: [
          'Eigenes Dashboard unter `/anki` (lazy-load)',
          'Bestehende MCP- und Website-Anreicherung unverändert nutzbar',
        ],
      },
    ],
  },
  {
    id: '01/2026',
    sections: [
      {
        title: 'Stabilität & Sicherheit',
        items: [
          '**Enrich-Cards Pagination Fix**: Offset/Batching arbeitet wieder deck-weit (keine leeren Batches mehr)',
          '**Anki Sync Dry-Run**: Optionaler Testlauf, um Matches/Fehler vor dem Schreiben zu sehen',
          '**LLM-Timeouts & Prompt-Sanitizing**: Verhindert Hänger und reduziert HTML-Störungen',
        ],
      },
      {
        title: 'PDF Klausur-Import (NEU)',
        items: [
          '**PDF hochladen** → Altklausuren als Anki-Karten',
          '**LLM extrahiert Fragen** (SC/MC/KPRIM erkannt)',
          '**LLM bestimmt korrekte Antworten** + Erklärungen',
          '**Deck-Auswahl**: Neues Deck oder Unterdeck',
          'Format: Question, Q_1–Q_5, Answers (kompatibel mit bestehenden Decks)',
        ],
      },
      {
        title: 'Resume-Funktion für Anreicherung',
        items: ['Fortschritt im Browser (localStorage), Fortsetzen statt Neustart'],
      },
      {
        title: 'Karten-Anreicherung',
        items: [
          'Bewertungstabelle, Zusammenfassung, Originalfelder erhalten',
          'Anreicherung ins Sources-Feld der bestehenden Karten',
        ],
      },
    ],
  },
];
