import type { ExamProgress, ParsedQuestion, StoredExam } from './altfragenTypes';
import type { ReviewAttempt } from './altfragenReview';

export type InsightStatus = 'richtig' | 'falsch' | 'ohne-schluessel' | 'ausstehend' | 'offen';

export type InsightRow = {
  examId: string;
  examTitle: string;
  questionNumber: number;
  index: number;
  topic: string;
  question: string;
  status: InsightStatus;
  selected: string;
  solution: string;
  checkedAt: string;
  repeats: number;
  lastRepeat: 'richtig' | 'falsch' | 'ohne-schluessel' | null;
};

export type InsightExam = {
  id: string;
  title: string;
  total: number;
  checked: number;
  right: number;
  wrong: number;
  ungraded: number;
  pending: number;
  completed: boolean;
};

function pickedOptions(question: ParsedQuestion, bits: string | undefined): string {
  const selected = question.options
    .map((option, index) => bits?.[index] === '1' ? `${String.fromCharCode(65 + index)}: ${option}` : null)
    .filter((option): option is string => option !== null);
  return selected.join(' | ') || 'Keine Antwort';
}

function normalizedBits(bits: string | undefined, length: number): string {
  return (bits || '').replace(/[^01]/g, '').padEnd(length, '0').slice(0, length);
}

/** Uses only published question keys and the caller's local progress; it never writes either. */
export function buildKreuzInsights(
  exams: StoredExam[],
  progressByExam: Record<string, ExamProgress | null>,
  attempts: ReviewAttempt[] = []
): { exams: InsightExam[]; rows: InsightRow[] } {
  const attemptsByQuestion = new Map<string, ReviewAttempt[]>();
  for (const attempt of attempts) {
    const key = `${attempt.examId}:${attempt.questionNumber}`;
    attemptsByQuestion.set(key, [...(attemptsByQuestion.get(key) || []), attempt]);
  }

  const summaries: InsightExam[] = [];
  const rows: InsightRow[] = [];
  for (const exam of exams) {
    const progress = progressByExam[exam.id];
    const checked = new Set((progress?.checked || []).map(Number));
    const submitted = progress?.practiceMode !== 'exam' || Boolean(progress.completedAt);
    const summary: InsightExam = {
      id: exam.id, title: exam.title, total: exam.questions.length,
      checked: 0, right: 0, wrong: 0, ungraded: 0, pending: 0,
      completed: submitted && exam.questions.length > 0 && checked.size >= exam.questions.length,
    };

    exam.questions.forEach((question, index) => {
      const selection = progress?.selections?.[index] || '';
      const answered = selection.includes('1');
      const graded = submitted && checked.has(index) && answered;
      const key = question.correctAnswers?.includes('1') ? question.correctAnswers : '';
      let status: InsightStatus = 'offen';
      if (!submitted && answered) status = 'ausstehend';
      else if (graded && !key) status = 'ohne-schluessel';
      else if (graded) status = normalizedBits(selection, question.options.length) === normalizedBits(key, question.options.length) ? 'richtig' : 'falsch';
      else if (answered) status = 'ausstehend';

      if (graded) summary.checked += 1;
      if (status === 'richtig') summary.right += 1;
      if (status === 'falsch') summary.wrong += 1;
      if (status === 'ohne-schluessel') summary.ungraded += 1;
      if (status === 'ausstehend') summary.pending += 1;

      const repeats = attemptsByQuestion.get(`${exam.id}:${question.number}`) || [];
      const last = repeats.at(-1);
      rows.push({
        examId: exam.id,
        examTitle: exam.title,
        questionNumber: question.number,
        index,
        topic: question.topicLabel || '',
        question: question.question,
        status,
        selected: answered ? pickedOptions(question, selection) : 'Keine Antwort',
        solution: graded ? (key ? pickedOptions(question, key) : 'Kein gesicherter Lösungsschlüssel') : 'Erst nach dem Prüfen oder Abgeben sichtbar',
        checkedAt: graded ? (progress?.checkedAt?.[index] || progress?.completedAt || '') : '',
        repeats: repeats.length,
        lastRepeat: last ? last.correct === true ? 'richtig' : last.correct === false ? 'falsch' : 'ohne-schluessel' : null,
      });
    });
    summaries.push(summary);
  }
  return { exams: summaries, rows };
}
