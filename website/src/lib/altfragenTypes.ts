export type QuestionType = 'SC' | 'MC' | 'KPRIM';

export interface ExplanationMeta {
  source?: 'cursor' | 'llm' | 'wiki' | 'manual';
  model?: string;
  generatedAt?: string;
  reviewedAt?: string;
  confidence?: 'high' | 'low';
}

export interface ParsedQuestion {
  number: number;
  question: string;
  options: string[];
  type: QuestionType;
  correctAnswers?: string;
  explanation?: string;
  /** Amboss-style per-option rationale */
  optionRationales?: OptionRationale[];
  /** Short topic label for knowledge-base / Amboss search button */
  topicLabel?: string;
  explanationMeta?: ExplanationMeta;
}

export interface OptionRationale {
  /** 0-based option index */
  index: number;
  correct: boolean;
  text: string;
  links?: Array<{ label: string; url: string }>;
}

export interface StoredExam {
  id: string;
  title: string;
  sourceLabel?: string;
  description?: string;
  /** Only published exams appear on the public practice page. */
  published: boolean;
  createdAt: string;
  updatedAt: string;
  questions: ParsedQuestion[];
}

/** Summary without question bodies (public list). */
export interface ExamSummary {
  id: string;
  title: string;
  sourceLabel?: string;
  description?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
  questionCount: number;
}

/** Per-exam practice progress (resume where left off). */
export interface ExamProgress {
  examId: string;
  currentIndex: number;
  selections: Record<number, string>;
  checked: number[];
  /** ISO timestamp when the session started (first answer or first open). */
  startedAt?: string;
  /** ISO timestamp when each question index was checked. */
  checkedAt?: Record<number, string>;
  completedAt?: string;
}

export interface AltfragenExport {
  version: 1;
  exportedAt: string;
  exams: StoredExam[];
}

export interface AltfragenBankFile {
  version: 1;
  updatedAt: string;
  exams: StoredExam[];
}

/** Aggregate community answer stats per question. */
export interface QuestionStat {
  attempts: number;
  correct: number;
  optionCounts: number[];
}
