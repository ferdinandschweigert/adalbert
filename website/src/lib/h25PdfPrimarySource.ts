import pdfExtraction from '../../scripts/h25-kreuzversion-solutions.json';
import type { OptionRationale, ParsedQuestion, StoredExam } from '@/lib/altfragenTypes';

const H25_EXAM_ID = 'm2-h25-gedaechtnisprotokoll';
const REVIEWED_AT = '2026-09-21T19:20:00Z';

interface PdfOption {
  letter: string;
  text: string;
  correct: boolean;
}

interface PdfQuestion {
  seq: number;
  day: number;
  number: number;
  question: string;
  options: PdfOption[];
  begruendung: string;
}

interface NormalizedPdfQuestion extends PdfQuestion {
  numberLabel: string;
}

function splitQuestion38(question: PdfQuestion): NormalizedPdfQuestion[] {
  const marker = '38b.';
  const [firstRationale = question.begruendung, secondBlock = ''] = question.begruendung.split(marker, 2);
  const secondStem = 'Im Krankenhaus zeigt das Kardiotokogramm Dezelerationen, es wird die Indikation zur Notsectio gestellt. Welches Anästhesieverfahren ist am ehesten zu wählen?';
  const secondRationale = secondBlock.replace(secondStem, '').trim();

  return [
    {
      ...question,
      numberLabel: '38',
      options: question.options.slice(0, 5),
      begruendung: firstRationale.trim(),
    },
    {
      ...question,
      numberLabel: '38b',
      question: secondStem,
      options: question.options.slice(5),
      begruendung: secondRationale,
    },
  ];
}

/** The PDF contains an additional question 38b that the original extractor merged into 38. */
const pdfQuestions: NormalizedPdfQuestion[] = (pdfExtraction as PdfQuestion[]).flatMap((question) =>
  question.seq === 38
    ? splitQuestion38(question)
    : [{ ...question, numberLabel: String(question.number) }],
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

function toBankQuestion(pdf: NormalizedPdfQuestion, index: number): ParsedQuestion {
  const options = pdf.options.map((option) => option.text.trim());
  const correctIndices = pdf.options
    .map((option, optionIndex) => (option.correct ? optionIndex : -1))
    .filter((optionIndex) => optionIndex >= 0);
  const hasAnswer = correctIndices.length === 1;
  const answerIndex = hasAnswer ? correctIndices[0] : -1;
  const answerLetter = hasAnswer ? String.fromCharCode(65 + answerIndex) : '';
  const answerText = hasAnswer ? options[answerIndex] : '';
  const rationale = pdf.begruendung.trim();

  const question: ParsedQuestion = {
    number: index + 1,
    question: `[H25-T${pdf.day}-${pdf.numberLabel}] ${pdf.question.trim()}`,
    options,
    type: 'SC',
    correctAnswers: options.map((_, optionIndex) => (optionIndex === answerIndex ? '1' : '0')).join(''),
    explanation: hasAnswer
      ? `Richtige Antwort: ${answerLetter}) ${answerText}. ${rationale} Quelle: H25-Kreuzversion mit Lösungen; fachliche Einschätzung, keine offizielle IMPP-Lösung.`
      : `${rationale} Die PDF enthält für diese Bildfrage keinen markierten Lösungsschlüssel.`,
    topicLabel: pdf.question.trim().slice(0, 140),
    explanationMeta: {
      source: 'manual',
      generatedAt: REVIEWED_AT,
      reviewedAt: REVIEWED_AT,
      confidence: hasAnswer ? 'high' : 'low',
    },
    optionRationales: options.map((option, optionIndex) => ({
      index: optionIndex,
      correct: optionIndex === answerIndex,
      text: hasAnswer
        ? optionIndex === answerIndex
          ? `Richtig (${String.fromCharCode(65 + optionIndex)}): ${option}. ${rationale}`.slice(0, 900)
          : `Falsch (${String.fromCharCode(65 + optionIndex)}): ${option} — richtig ist ${answerLetter}) ${answerText}.`.slice(0, 900)
        : `Offen (${String.fromCharCode(65 + optionIndex)}): ${option}. Ohne Bildbeilage ist keine sichere Bewertung möglich.`,
      links: links(option),
    })),
  };

  if (hasAnswer) question.answerSource = 'kreuzversion';
  return question;
}

export function applyH25PdfPrimarySource(exam: StoredExam): StoredExam {
  if (exam.id !== H25_EXAM_ID) return exam;

  const questions = pdfQuestions.map(toBankQuestion);
  const solved = questions.filter((question) => question.answerSource === 'kreuzversion').length;
  const open = questions.length - solved;

  return {
    ...exam,
    sourceLabel: 'H25 mit Lösungen.pdf',
    updatedAt: REVIEWED_AT,
    description: `H25 (Herbst 2025) vollständig auf Grundlage der neuen Kreuzversion-PDF: ${questions.length} rekonstruierte Fragen, davon ${solved} mit markierter Lösung und ${open} bildabhängige Fragen ohne Lösungsschlüssel. Die Kreuzversion-Lösungen sind fachliche Einschätzungen und keine offiziellen IMPP-Schlüssel.`,
    questions,
  };
}
