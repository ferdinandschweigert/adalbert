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
