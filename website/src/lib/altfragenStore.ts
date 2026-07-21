import type {
  AltfragenExport,
  ExamProgress,
  ParsedQuestion,
  StoredExam,
} from '@/lib/altfragenTypes';

const EXAMS_KEY = 'adalbert-altfragen-exams';
const PROGRESS_PREFIX = 'adalbert-altfragen-progress-';

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
}

function readExams(): StoredExam[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(EXAMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredExam[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (exam) =>
        exam &&
        typeof exam.id === 'string' &&
        typeof exam.title === 'string' &&
        Array.isArray(exam.questions)
    );
  } catch {
    return [];
  }
}

function writeExams(exams: StoredExam[]): void {
  if (!canUseStorage()) return;
  localStorage.setItem(EXAMS_KEY, JSON.stringify(exams));
}

export function listExams(): StoredExam[] {
  return readExams().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getExam(id: string): StoredExam | null {
  return readExams().find((exam) => exam.id === id) ?? null;
}

export function saveExam(exam: StoredExam): StoredExam {
  const exams = readExams();
  const idx = exams.findIndex((item) => item.id === exam.id);
  if (idx >= 0) {
    exams[idx] = exam;
  } else {
    exams.push(exam);
  }
  writeExams(exams);
  return exam;
}

export function createExam(input: {
  title: string;
  sourceLabel?: string;
  questions: ParsedQuestion[];
}): StoredExam {
  const exam: StoredExam = {
    id: crypto.randomUUID(),
    title: input.title.trim() || 'Unbenannte Klausur',
    sourceLabel: input.sourceLabel,
    createdAt: new Date().toISOString(),
    questions: input.questions,
  };
  return saveExam(exam);
}

export function deleteExam(id: string): void {
  writeExams(readExams().filter((exam) => exam.id !== id));
  if (canUseStorage()) {
    localStorage.removeItem(PROGRESS_PREFIX + id);
  }
}

export function exportJson(exams?: StoredExam[]): string {
  const payload: AltfragenExport = {
    version: 1,
    exportedAt: new Date().toISOString(),
    exams: exams ?? listExams(),
  };
  return JSON.stringify(payload, null, 2);
}

export function importJson(jsonText: string): { imported: number; exams: StoredExam[] } {
  const parsed = JSON.parse(jsonText) as AltfragenExport | StoredExam[] | StoredExam;
  let incoming: StoredExam[] = [];

  if (Array.isArray(parsed)) {
    incoming = parsed;
  } else if (parsed && typeof parsed === 'object' && 'exams' in parsed && Array.isArray(parsed.exams)) {
    incoming = parsed.exams;
  } else if (parsed && typeof parsed === 'object' && 'id' in parsed && 'questions' in parsed) {
    incoming = [parsed as StoredExam];
  } else {
    throw new Error('Ungültiges Altfragen-JSON');
  }

  const existing = readExams();
  const byId = new Map(existing.map((exam) => [exam.id, exam]));
  let imported = 0;

  for (const exam of incoming) {
    if (!exam?.id || !exam.title || !Array.isArray(exam.questions)) continue;
    const normalized: StoredExam = {
      id: String(exam.id),
      title: String(exam.title),
      sourceLabel: exam.sourceLabel ? String(exam.sourceLabel) : undefined,
      createdAt: exam.createdAt || new Date().toISOString(),
      questions: exam.questions,
    };
    byId.set(normalized.id, normalized);
    imported += 1;
  }

  const merged = Array.from(byId.values());
  writeExams(merged);
  return { imported, exams: merged };
}

export function getProgress(examId: string): ExamProgress | null {
  if (!canUseStorage()) return null;
  try {
    const raw = localStorage.getItem(PROGRESS_PREFIX + examId);
    if (!raw) return null;
    return JSON.parse(raw) as ExamProgress;
  } catch {
    return null;
  }
}

export function saveProgress(progress: ExamProgress): void {
  if (!canUseStorage()) return;
  localStorage.setItem(PROGRESS_PREFIX + progress.examId, JSON.stringify(progress));
}

export function clearProgress(examId: string): void {
  if (!canUseStorage()) return;
  localStorage.removeItem(PROGRESS_PREFIX + examId);
}

export function createEmptyProgress(examId: string): ExamProgress {
  return {
    examId,
    currentIndex: 0,
    selections: {},
    checked: [],
  };
}
