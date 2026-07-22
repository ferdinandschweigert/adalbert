import { promises as fs } from 'fs';
import path from 'path';

export interface QuestionStat {
  /** Counts per option index */
  optionCounts: number[];
  attempts: number;
  correct: number;
}

export interface ExamStats {
  examId: string;
  updatedAt: string;
  totalAttempts: number;
  questions: Record<string, QuestionStat>; // key = question number as string
}

const STATS_RELATIVE = path.join('data', 'altfragen-stats.json');

type StatsFile = { version: 1; updatedAt: string; exams: Record<string, ExamStats> };

function statsPath() {
  return path.join(process.cwd(), STATS_RELATIVE);
}

function emptyFile(): StatsFile {
  return { version: 1, updatedAt: new Date().toISOString(), exams: {} };
}

async function readStatsFile(): Promise<StatsFile> {
  try {
    const raw = await fs.readFile(statsPath(), 'utf8');
    const parsed = JSON.parse(raw) as StatsFile;
    if (!parsed?.exams) return emptyFile();
    return parsed;
  } catch {
    return emptyFile();
  }
}

async function writeStatsFile(file: StatsFile): Promise<'filesystem' | 'memory'> {
  try {
    await fs.mkdir(path.dirname(statsPath()), { recursive: true });
    await fs.writeFile(statsPath(), JSON.stringify(file, null, 2) + '\n', 'utf8');
    return 'filesystem';
  } catch {
    memoryStats = file;
    return 'memory';
  }
}

let memoryStats: StatsFile | null = null;

async function load(): Promise<StatsFile> {
  if (memoryStats) {
    const disk = await readStatsFile();
    // merge memory over disk for this instance
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      exams: { ...disk.exams, ...memoryStats.exams },
    };
  }
  return readStatsFile();
}

export async function getExamStats(examId: string): Promise<ExamStats> {
  const file = await load();
  return (
    file.exams[examId] || {
      examId,
      updatedAt: new Date().toISOString(),
      totalAttempts: 0,
      questions: {},
    }
  );
}

export async function recordAnswer(input: {
  examId: string;
  questionNumber: number;
  optionCount: number;
  selectionBits: string;
  correct: boolean | null;
}): Promise<ExamStats> {
  const file = await load();
  const exam =
    file.exams[input.examId] ||
    ({
      examId: input.examId,
      updatedAt: new Date().toISOString(),
      totalAttempts: 0,
      questions: {},
    } satisfies ExamStats);

  const key = String(input.questionNumber);
  const prev =
    exam.questions[key] ||
    ({
      optionCounts: Array(input.optionCount).fill(0),
      attempts: 0,
      correct: 0,
    } satisfies QuestionStat);

  const optionCounts = [...prev.optionCounts];
  while (optionCounts.length < input.optionCount) optionCounts.push(0);
  const bits = (input.selectionBits || '').padEnd(input.optionCount, '0').slice(0, input.optionCount);
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === '1') optionCounts[i] += 1;
  }

  exam.questions[key] = {
    optionCounts,
    attempts: prev.attempts + 1,
    correct: prev.correct + (input.correct ? 1 : 0),
  };
  exam.totalAttempts += 1;
  exam.updatedAt = new Date().toISOString();
  file.exams[input.examId] = exam;
  file.updatedAt = exam.updatedAt;
  memoryStats = file;
  await writeStatsFile(file);
  return exam;
}
