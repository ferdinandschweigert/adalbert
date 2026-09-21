import pdfExtraction from '../../scripts/h25-kreuzversion-solutions.json';
import type { OptionRationale, ParsedQuestion, StoredExam } from '@/lib/altfragenTypes';

const H25_EXAM_ID = 'm2-h25-gedaechtnisprotokoll';
const REVIEWED_AT = '2026-09-21T18:45:00Z';

/**
 * The memory protocol and the PDF use different question orders. These matches were
 * reviewed individually using the full stem, case context and neighbouring questions.
 */
export const H25_REVIEWED_PDF_MAPPING: Readonly<Record<number, number>> = {
  15: 34,
  16: 107,
  19: 26,
  23: 65,
  28: 42,
  31: 27,
  32: 28,
  36: 77,
  38: 11,
  55: 40,
  56: 82,
  58: 48,
  59: 49,
  60: 96,
  61: 97,
  63: 66,
  64: 191,
  65: 67,
  66: 101,
  68: 68,
  69: 78,
  70: 91,
  71: 72,
  72: 104,
  73: 95,
  74: 79,
  75: 92,
  76: 88,
  77: 18,
  79: 46,
  81: 47,
  82: 87,
  83: 100,
  84: 51,
  85: 50,
  86: 73,
  87: 52,
  88: 59,
  89: 81,
  90: 61,
  91: 62,
  92: 63,
  93: 89,
  94: 53,
  96: 94,
  97: 74,
  98: 55,
  99: 83,
  100: 98,
  101: 69,
  102: 70,
  103: 71,
  104: 56,
  105: 57,
  106: 58,
  142: 114,
  148: 122,
  149: 123,
  164: 135,
  171: 165,
  173: 166,
  195: 201,
  203: 170,
  213: 194,
  239: 235,
  246: 242,
  274: 270,
  312: 306,
};

/** Question 80 has complete PDF options, but the image-dependent answer is not marked. */
const H25_OPTIONS_ONLY_MAPPING: Readonly<Record<number, number>> = { 80: 80 };

interface PdfOption {
  text: string;
  correct: boolean;
}

interface PdfQuestion {
  seq: number;
  question: string;
  options: PdfOption[];
  begruendung: string;
}

const pdfBySequence = new Map(
  (pdfExtraction as PdfQuestion[]).map((question) => [question.seq, question]),
);

function links(term: string): NonNullable<OptionRationale['links']> {
  const query = term.trim().slice(0, 100);
  return [
    { label: 'Amboss (Login)', url: `https://next.amboss.com/de/search?q=${encodeURIComponent(query)}` },
    {
      label: 'DocCheck Flexikon',
      url: `https://flexikon.doccheck.com/de/Spezial:Suche?search=${encodeURIComponent(query.slice(0, 80))}`,
    },
    { label: 'Wikipedia', url: `https://de.wikipedia.org/w/index.php?search=${encodeURIComponent(query)}` },
  ];
}

function taggedQuestion(original: ParsedQuestion, stem: string): string {
  const tag = original.question.match(/^\[H25-T\d-\d+\]/)?.[0];
  return tag ? `${tag} ${stem.trim()}` : stem.trim();
}

function withReviewedAnswer(original: ParsedQuestion, pdf: PdfQuestion): ParsedQuestion {
  const options = pdf.options.map((option) => option.text.trim());
  const correctIndices = pdf.options
    .map((option, index) => (option.correct ? index : -1))
    .filter((index) => index >= 0);

  if (options.length < 2 || correctIndices.length !== 1) return original;

  const answerIndex = correctIndices[0];
  const answerLetter = String.fromCharCode(65 + answerIndex);
  const answerText = options[answerIndex];
  const rationale = pdf.begruendung.trim();

  return {
    ...original,
    question: taggedQuestion(original, pdf.question),
    options,
    type: 'SC',
    correctAnswers: options.map((_, index) => (index === answerIndex ? '1' : '0')).join(''),
    answerSource: 'kreuzversion',
    explanation: `Richtige Antwort: ${answerLetter}) ${answerText}. ${rationale} Quelle: H25-Kreuzversion mit Lösungen; fachliche Einschätzung, keine offizielle IMPP-Lösung.`,
    topicLabel: pdf.question.trim().slice(0, 140),
    explanationMeta: {
      source: 'manual',
      generatedAt: REVIEWED_AT,
      reviewedAt: REVIEWED_AT,
      confidence: 'high',
    },
    optionRationales: options.map((option, index) => ({
      index,
      correct: index === answerIndex,
      text: index === answerIndex
        ? `Richtig (${String.fromCharCode(65 + index)}): ${option}. ${rationale}`.slice(0, 900)
        : `Falsch (${String.fromCharCode(65 + index)}): ${option} — richtig ist ${answerLetter}) ${answerText}.`.slice(0, 900),
      links: links(option),
    })),
  };
}

function withPdfOptionsOnly(original: ParsedQuestion, pdf: PdfQuestion): ParsedQuestion {
  const options = pdf.options.map((option) => option.text.trim());
  if (options.length < 2) return original;

  const enriched: ParsedQuestion = {
    ...original,
    question: taggedQuestion(original, pdf.question),
    options,
    type: 'SC',
    correctAnswers: '0'.repeat(options.length),
    explanation: 'Die Antwortoptionen stammen aus der H25-Kreuzversion. Eine richtige Antwort ist dort für diese Bildfrage nicht markiert; ohne die zugehörige Abbildung bleibt der Lösungsschlüssel bewusst offen.',
    topicLabel: pdf.question.trim().slice(0, 140),
    explanationMeta: {
      source: 'manual',
      generatedAt: REVIEWED_AT,
      reviewedAt: REVIEWED_AT,
      confidence: 'low',
    },
    optionRationales: options.map((option, index) => ({
      index,
      correct: false,
      text: `Offen (${String.fromCharCode(65 + index)}): ${option}. Ohne Bildbeilage ist keine sichere Bewertung möglich.`,
      links: links(option),
    })),
  };
  delete enriched.answerSource;
  return enriched;
}

export function applyH25PdfPrimarySource(exam: StoredExam): StoredExam {
  if (exam.id !== H25_EXAM_ID) return exam;

  const questions = exam.questions.map((question) => {
    const answerSequence = H25_REVIEWED_PDF_MAPPING[question.number];
    if (answerSequence !== undefined) {
      const pdf = pdfBySequence.get(answerSequence);
      return pdf ? withReviewedAnswer(question, pdf) : question;
    }

    const optionsSequence = H25_OPTIONS_ONLY_MAPPING[question.number];
    if (optionsSequence !== undefined) {
      const pdf = pdfBySequence.get(optionsSequence);
      return pdf ? withPdfOptionsOnly(question, pdf) : question;
    }
    return question;
  });

  const sourceCounts = questions.reduce(
    (counts, question) => {
      if (question.answerSource) counts[question.answerSource] += 1;
      else counts.open += 1;
      return counts;
    },
    { kreuzversion: 0, protocol: 0, ai: 0, open: 0 },
  );

  return {
    ...exam,
    updatedAt: REVIEWED_AT,
    description: `H25 (Herbst 2025), IMPP-Reihenfolge: ${questions.length} rekonstruierte Fragen. ${sourceCounts.kreuzversion} mit Lösung aus der H25-Kreuzversion, ${sourceCounts.protocol} mit Protokoll-Schlüssel, ${sourceCounts.ai} mit gekennzeichneter KI-Lösung und ${sourceCounts.open} ohne belastbaren Lösungsschlüssel. Kreuzversion-Lösungen sind fachlich geprüft, aber keine offiziellen IMPP-Schlüssel.`,
    questions,
  };
}
