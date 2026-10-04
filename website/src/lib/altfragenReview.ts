import type { ExamProgress, ParsedQuestion, StoredExam } from './altfragenTypes';

export const REVIEW_KEY = 'adalbert-review-v1';
export const ANNOTATION_KEY = 'adalbert-annotations-v1';
export const REVIEW_SETTINGS_KEY = 'adalbert-review-settings-v1';

export type InlineNote = { id: string; start: number; end: number; text: string };
export type QuestionAnnotation = {
  highlights: Array<{ start: number; end: number }>;
  inlineNotes?: InlineNote[];
  crossedOut: number[];
  note: string;
  starred: boolean;
  uncertain: boolean;
};
export type ReviewAttempt = {
  sessionId?: string;
  examId: string;
  questionNumber: number;
  selection: string;
  correct: boolean | null;
  at: string;
};
export type ReviewQuestion = { examId: string; questionNumber: number };
export type ReviewSession = {
  id: string;
  title: string;
  questions: ReviewQuestion[];
  currentIndex: number;
  selections: Record<string, string>;
  checked: string[];
  activeMs: Record<string, number>;
  pauseSeconds: 0 | 30 | 60 | 90 | 120;
  weights?: YieldWeights;
  createdAt: string;
};
export type ReviewStore = { attempts: ReviewAttempt[]; sessions: ReviewSession[] };
export type ReviewGroup = 'lastWrong' | 'everWrong' | 'lastRight' | 'unseen' | 'starred' | 'uncertain';
export type YieldWeights = { errors: number; top100: number; uncertain: number; due: number };
export const DEFAULT_WEIGHTS: YieldWeights = { errors: 3, top100: 2, uncertain: 1, due: 1 };
export type ReviewSettings = {
  selectedExams: string[];
  groups: ReviewGroup[];
  count: number;
  order: 'original' | 'random' | 'priority';
  weights: YieldWeights;
  pauseSeconds: 0 | 30 | 60 | 90 | 120;
  highYield: boolean;
};
export type Candidate = {
  examId: string;
  index: number;
  question: ParsedQuestion;
  annotation: QuestionAnnotation;
  attempts: ReviewAttempt[];
  top100Topic?: string;
};

export function questionKey(examId: string, questionNumber: number): string {
  return `${examId}:${questionNumber}`;
}

export function emptyAnnotation(): QuestionAnnotation {
  return { highlights: [], crossedOut: [], note: '', starred: false, uncertain: false };
}

export function highlightSegments(text: string, ranges: QuestionAnnotation['highlights']): Array<{ start: number; end: number; marked: boolean }> {
  const valid = ranges.filter((range) => range.start >= 0 && range.end <= text.length && range.end > range.start);
  const boundaries = [...new Set([0, text.length, ...valid.flatMap((range) => [range.start, range.end])])].sort((a, b) => a - b);
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    return { start, end, marked: valid.some((range) => range.start < end && range.end > start) };
  });
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; }
}

export function readReview(): ReviewStore {
  const value = readJson<ReviewStore>(REVIEW_KEY, { attempts: [], sessions: [] });
  return { attempts: value.attempts || [], sessions: value.sessions || [] };
}

export function saveReview(value: ReviewStore): void {
  localStorage.setItem(REVIEW_KEY, JSON.stringify(value));
}

export function readAnnotations(): Record<string, QuestionAnnotation> {
  return readJson(ANNOTATION_KEY, {});
}

export function readReviewSettings(): ReviewSettings | null {
  return readJson<ReviewSettings | null>(REVIEW_SETTINGS_KEY, null);
}

export function saveReviewSettings(value: ReviewSettings): void {
  localStorage.setItem(REVIEW_SETTINGS_KEY, JSON.stringify(value));
}

export function saveAnnotation(examId: string, number: number, value: QuestionAnnotation): void {
  const all = readAnnotations();
  all[questionKey(examId, number)] = value;
  localStorage.setItem(ANNOTATION_KEY, JSON.stringify(all));
  window.dispatchEvent(new Event('adalbert-annotations-changed'));
}

export function legacyAttempts(exam: StoredExam, progress: ExamProgress | null): ReviewAttempt[] {
  if (!progress) return [];
  return (progress.checked || []).flatMap((rawIndex) => {
    const index = Number(rawIndex);
    const q = exam.questions[index];
    const selection = progress.selections?.[index];
    if (!q || !selection?.includes('1')) return [];
    return [{
      examId: exam.id,
      questionNumber: q.number,
      selection,
      correct: q.correctAnswers?.includes('1')
        ? selection === q.correctAnswers : null,
      at: progress.checkedAt?.[index] || progress.completedAt || progress.startedAt || '',
    }];
  });
}

export function buildCandidates(
  exams: StoredExam[],
  progress: Record<string, ExamProgress | null>,
  annotations: Record<string, QuestionAnnotation>,
  attempts: ReviewAttempt[],
  topicMap: Record<string, string> = {}
): Candidate[] {
  return exams.flatMap((exam) => {
    const old = legacyAttempts(exam, progress[exam.id]);
    return exam.questions.map((question, index) => {
      const key = questionKey(exam.id, question.number);
      return {
        examId: exam.id,
        index,
        question,
        annotation: annotations[key] || emptyAnnotation(),
        attempts: [...old, ...attempts].filter((a) => questionKey(a.examId, a.questionNumber) === key),
        top100Topic: topicMap[key],
      };
    });
  });
}

export function candidateGroups(candidate: Candidate): ReviewGroup[] {
  const result: ReviewGroup[] = [];
  const last = candidate.attempts.at(-1);
  if (!last) result.push('unseen');
  if (last?.correct === false) result.push('lastWrong');
  if (last?.correct === true) result.push('lastRight');
  if (candidate.attempts.some((a) => a.correct === false)) result.push('everWrong');
  if (candidate.annotation.starred) result.push('starred');
  if (candidate.annotation.uncertain) result.push('uncertain');
  return result;
}

export function isDue(candidate: Candidate, now = Date.now()): boolean {
  const last = candidate.attempts.at(-1);
  if (!last?.at) return false;
  const timestamp = Date.parse(last.at);
  if (!Number.isFinite(timestamp)) return false;
  return now - timestamp >= (last.correct === false ? 24 : 7 * 24) * 3600_000;
}

export function shouldPause(
  action: { kind: 'check' | 'go' | 'results'; target?: number },
  currentIndex: number,
  activeMs: number,
  pauseSeconds: number
): boolean {
  if (action.kind === 'go' && (action.target ?? currentIndex) <= currentIndex) return false;
  return pauseSeconds > 0 && activeMs < pauseSeconds * 1000;
}

export function yieldReasons(candidate: Candidate, weights: YieldWeights, now = Date.now()): Array<{ text: string; points: number }> {
  const errors = Math.min(3, candidate.attempts.filter((a) => a.correct === false).length);
  const reasons: Array<{ text: string; points: number }> = [];
  if (errors && weights.errors) reasons.push({ text: `${errors} eigene Fehler`, points: errors * weights.errors });
  if (candidate.top100Topic && weights.top100) reasons.push({ text: `Top 100: ${candidate.top100Topic}`, points: weights.top100 });
  if (candidate.annotation.uncertain && weights.uncertain) reasons.push({ text: 'Als unsicher markiert', points: weights.uncertain });
  if (isDue(candidate, now) && weights.due) reasons.push({ text: 'Wiederholung fällig', points: weights.due });
  return reasons;
}

export function selectCandidates(
  candidates: Candidate[],
  groups: ReviewGroup[],
  count: number,
  order: 'original' | 'random' | 'priority',
  weights: YieldWeights,
  now = Date.now()
): Candidate[] {
  const seen = new Set<string>();
  const selected = candidates.filter((c) => {
    const key = questionKey(c.examId, c.question.number);
    if (seen.has(key) || (groups.length && !groups.some((g) => candidateGroups(c).includes(g)))) return false;
    seen.add(key);
    return true;
  });
  if (order === 'priority') selected.sort((a, b) =>
    yieldReasons(b, weights, now).reduce((sum, r) => sum + r.points, 0) -
    yieldReasons(a, weights, now).reduce((sum, r) => sum + r.points, 0));
  if (order === 'random') selected.sort(() => Math.random() - 0.5);
  return selected.slice(0, Math.max(0, count));
}
