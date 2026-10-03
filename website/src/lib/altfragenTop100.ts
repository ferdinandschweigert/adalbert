/** AMBOSS M2 Herbst 2026, Top-100-Kapitel (Checkliste), read 2026-10-03.
 * https://next.amboss.com/de/courses/AQ0RAf/qiYCsK
 * Only an unambiguous chapter title in a checked question topic label earns a bonus.
 */
export const TOP_100_CHAPTERS = [
  'Ischämischer Schlaganfall',
  'Epidemiologie und Wahrscheinlichkeiten',
  'Pneumonie',
  'Lungenkarzinom',
  'Mammakarzinom',
  'Meningitis',
  'Diabetes mellitus',
  'Bandscheibenprolaps',
  'Humangenetik (Klinik)',
  'Lyme-Borreliose',
  'Sepsis',
  'Vorhofflimmern',
  'Myokardinfarkt',
  'Reaktionen auf schwere Belastungen und Anpassungsstörungen',
  'Divertikulose, Divertikelkrankheit und Divertikulitis',
  'Orale Antikoagulanzien',
  'Periphere arterielle Verschlusskrankheit',
  'Subarachnoidalblutung',
  'Kolorektales Karzinom',
  'Nosokomiale Infektionen',
  'Studientypen der medizinischen Forschung',
  'Essstörungen',
  'Bakterielle Infektionen von Haut und Weichgewebe',
  'Angststörungen',
  'Lungenembolie',
  'Thanatologie',
  'Magenkarzinom',
  'Phlebothrombose',
  'Cholelithiasis, Cholezystitis und Cholangitis',
  'Hyperthyreose',
  'Arterielle Hypertonie',
  'Hyperurikämie und Gicht',
  'Zervixkarzinom',
  'Morbus Crohn',
  'Pneumothorax',
  'Antidiabetika',
  'Herzinsuffizienz',
  'Rheumatoide Arthritis',
  'Gesetzliche Krankenversicherung',
  'Riesenzellarteriitis',
  'Tuberkulose',
  'Zystische Fibrose',
  'Allergische Erkrankungen',
  'HIV-Infektion',
  'Psychopathologischer Befund',
  'Osteoporose',
  'Nierenzellkarzinom',
  'Ärztliche Rechtskunde',
  'Migräne',
  'Unipolare Depression',
  'Infektiöse Endokarditis',
  'Chronisch-obstruktive Lungenerkrankung',
  'Zwangsstörungen',
  'Antibiotika',
  'Chronische Wunden und Wundbehandlung',
  'Lupus erythematodes',
  'Parkinson-Syndrom und Parkinson-Krankheit',
  'Sterilität, Infertilität und Impotenz',
  'Zytostatika',
  'Infektiöse Mononukleose',
  'Polyneuropathie',
  'Guillain-Barré-Syndrom',
  'Herpes zoster',
  'Masern',
  'Malignes Melanom',
  'Diagnostik in der Gynäkologie',
  'Axiale Spondylarthritis',
  'Maligne Ovarialtumoren',
  'Arthrose',
  'Systemische Sklerose',
  'Asthma bronchiale',
  'Epilepsien und Epilepsiesyndrome',
  'Rehabilitation',
  'Endometriose',
  'Sarkoidose',
  'Zöliakie',
  'Schulterläsionen',
  'Alkoholbezogene Störungen',
  'Schizophrenie',
  'Vitamin-B12-Mangel',
  'Benignes Prostatasyndrom',
  'Gliome',
  'Multiple Sklerose',
  'Glaukom',
  'Psychotherapeutische Verfahren (Klinik)',
  'Morbus Perthes',
  'Antipsychotika',
  'Aortendissektion',
  'Neurologische Untersuchung',
  'Bakterielle Durchfallerkrankungen',
  'Soziale Sicherung',
  'Multiples Myelom',
  'Alzheimer-Krankheit',
  'Adrenogenitales Syndrom',
  'Präklinische Traumaversorgung',
  'Nicht-Opioid-Analgetika',
  'Metabolisches Syndrom',
  'Akute Leukämien',
  'Cushing-Syndrom',
  'Mesenteriale Ischämie',
] as const;

function normalize(value: string): string {
  return ` ${value.toLocaleLowerCase('de-DE').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()} `;
}

export function findTop100Topic(topicLabel: string): string | undefined {
  const label = normalize(topicLabel);
  const matches = TOP_100_CHAPTERS.filter((title) => label.includes(normalize(title)));
  return matches.length === 1 ? matches[0] : undefined;
}

/** The existing topic labels summarize each question. These labels were checked
 * against the current list. A few labels repeat the case history even when the
 * specific follow-up question is about a different subject.
 */
const AMBIGUOUS_QUESTIONS: Record<string, number[]> = {
  'm2-ss26-f26-gedaechtnisprotokoll': [10],
  'm2-h25-gedaechtnisprotokoll': [72, 221, 222, 246, 247],
};

export function verifiedTop100Topic(examId: string, questionNumber: number, topicLabel: string | undefined): string | undefined {
  if (AMBIGUOUS_QUESTIONS[examId]?.includes(questionNumber)) return undefined;
  return findTop100Topic(topicLabel || '');
}
