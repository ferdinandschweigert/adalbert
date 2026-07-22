import { promises as fs } from 'fs';
import path from 'path';
import type { QuestionStat } from '@/lib/altfragenTypes';

export type { QuestionStat };

export interface ExamStatsFile {
  version: 1;
  updatedAt: string;
  exams: Record<
    string,
    {
      questionStats: Record<string, QuestionStat>;
    }
  >;
}

const STATS_RELATIVE = path.join('data', 'altfragen-stats.json');

function statsPath(): string {
  return path.join(process.cwd(), STATS_RELATIVE);
}

function emptyStats(): ExamStatsFile {
  return { version: 1, updatedAt: new Date().toISOString(), exams: {} };
}

let memoryStats: ExamStatsFile | null = null;

async function readStats(): Promise<ExamStatsFile> {
  try {
    const raw = await fs.readFile(statsPath(), 'utf8');
    const parsed = JSON.parse(raw) as ExamStatsFile;
    if (!parsed?.exams) return emptyStats();
    memoryStats = parsed;
    return parsed;
  } catch {
    if (!memoryStats) memoryStats = emptyStats();
    return memoryStats;
  }
}

async function writeStats(stats: ExamStatsFile): Promise<void> {
  stats.updatedAt = new Date().toISOString();
  memoryStats = stats;
  try {
    await fs.mkdir(path.dirname(statsPath()), { recursive: true });
    await fs.writeFile(statsPath(), JSON.stringify(stats, null, 2) + '\n', 'utf8');
  } catch {
    // Vercel ephemeral FS — keep in memory for this instance
  }
}

export async function getExamStats(examId: string): Promise<Record<string, QuestionStat>> {
  const stats = await readStats();
  return stats.exams[examId]?.questionStats || {};
}

export async function recordAnswer(input: {
  examId: string;
  questionNumber: number;
  optionCount: number;
  selectionBits: string;
  correctBits: string;
}): Promise<QuestionStat> {
  const stats = await readStats();
  if (!stats.exams[input.examId]) {
    stats.exams[input.examId] = { questionStats: {} };
  }
  const key = String(input.questionNumber);
  const prev = stats.exams[input.examId].questionStats[key] || {
    attempts: 0,
    correct: 0,
    optionCounts: Array(input.optionCount).fill(0),
  };

  const optionCounts = [...prev.optionCounts];
  while (optionCounts.length < input.optionCount) optionCounts.push(0);

  const bits = (input.selectionBits || '').padEnd(input.optionCount, '0');
  for (let i = 0; i < input.optionCount; i++) {
    if (bits[i] === '1') optionCounts[i] += 1;
  }

  const isCorrect =
    Boolean(input.correctBits?.includes('1')) &&
    input.correctBits.padEnd(input.optionCount, '0').slice(0, input.optionCount) ===
      bits.slice(0, input.optionCount);

  const next: QuestionStat = {
    attempts: prev.attempts + 1,
    correct: prev.correct + (isCorrect ? 1 : 0),
    optionCounts,
  };
  stats.exams[input.examId].questionStats[key] = next;
  await writeStats(stats);
  return next;
}
