export type QuestionType = 'SC' | 'MC' | 'KPRIM';

export interface ParsedQuestion {
  number: number;
  question: string;
  options: string[];
  type: QuestionType;
  correctAnswers?: string;
  explanation?: string;
}

export interface StoredExam {
  id: string;
  title: string;
  sourceLabel?: string;
  createdAt: string;
  questions: ParsedQuestion[];
}

/** Per-exam practice progress (resume where left off). */
export interface ExamProgress {
  examId: string;
  currentIndex: number;
  /** Selected answer bits per question index, e.g. "10000" */
  selections: Record<number, string>;
  /** Question indices that were checked */
  checked: number[];
  completedAt?: string;
}

export interface AltfragenExport {
  version: 1;
  exportedAt: string;
  exams: StoredExam[];
}
