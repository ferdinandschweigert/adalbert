import { promises as fs } from 'fs';
import path from 'path';
import type { QuestionStat } from '@/lib/altfragenTypes';

export type { QuestionStat };

export interface ExamStatsFile {
  version: 1;
  updatedAt: string;
  /** YYYY-MM-DD → number of answer checks that day (all exams). */
  dailyActivity?: Record<string, number>;
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
  return { version: 1, updatedAt: new Date().toISOString(), dailyActivity: {}, exams: {} };
}

let memoryStats: ExamStatsFile | null = null;

function githubConfig(): { token: string; repo: string; filePath: string; branch: string } | null {
  const token = process.env.ALTFRAGEN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
  if (!token) return null;
  let repo = process.env.ALTFRAGEN_GITHUB_REPO || '';
  if (!repo && process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG) {
    repo = `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`;
  }
  if (!repo) repo = 'ferdinandschweigert/adalbert';
  return {
    token,
    repo,
    filePath: process.env.ALTFRAGEN_STATS_GITHUB_PATH || 'website/data/altfragen-stats.json',
    branch: process.env.ALTFRAGEN_GITHUB_BRANCH || 'main',
  };
}

async function readStatsFromGithub(): Promise<ExamStatsFile | null> {
  const cfg = githubConfig();
  if (!cfg) return null;
  const url = `https://api.github.com/repos/${cfg.repo}/contents/${cfg.filePath}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cfg.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    cache: 'no-store',
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: string };
  if (!data.content) return null;
  const parsed = JSON.parse(Buffer.from(data.content, 'base64').toString('utf8')) as ExamStatsFile;
  return parsed?.exams ? parsed : emptyStats();
}

async function writeStatsToGithub(stats: ExamStatsFile): Promise<boolean> {
  const cfg = githubConfig();
  if (!cfg) return false;
  const getUrl = `https://api.github.com/repos/${cfg.repo}/contents/${cfg.filePath}?ref=${encodeURIComponent(cfg.branch)}`;
  const getRes = await fetch(getUrl, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cfg.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  let sha: string | undefined;
  if (getRes.ok) {
    const existing = (await getRes.json()) as { sha?: string };
    sha = existing.sha;
  }
  const content = Buffer.from(JSON.stringify(stats, null, 2) + '\n', 'utf8').toString('base64');
  const putRes = await fetch(`https://api.github.com/repos/${cfg.repo}/contents/${cfg.filePath}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cfg.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: 'chore(altfragen): update community kreuzen stats',
      content,
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  return putRes.ok;
}

function mergeStats(a: ExamStatsFile, b: ExamStatsFile): ExamStatsFile {
  const out: ExamStatsFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    dailyActivity: { ...(a.dailyActivity || {}) },
    exams: { ...a.exams },
  };
  for (const [day, count] of Object.entries(b.dailyActivity || {})) {
    out.dailyActivity![day] = Math.max(out.dailyActivity![day] || 0, count);
  }
  for (const [examId, examB] of Object.entries(b.exams || {})) {
    if (!out.exams[examId]) {
      out.exams[examId] = { questionStats: { ...examB.questionStats } };
      continue;
    }
    const merged = { ...out.exams[examId].questionStats };
    for (const [qKey, statB] of Object.entries(examB.questionStats || {})) {
      const statA = merged[qKey];
      if (!statA) {
        merged[qKey] = statB;
        continue;
      }
      // Prefer higher attempt count (more complete)
      merged[qKey] = statA.attempts >= statB.attempts ? statA : statB;
    }
    out.exams[examId] = { questionStats: merged };
  }
  return out;
}

async function readStats(): Promise<ExamStatsFile> {
  let disk = emptyStats();
  try {
    const raw = await fs.readFile(statsPath(), 'utf8');
    const parsed = JSON.parse(raw) as ExamStatsFile;
    if (parsed?.exams) disk = parsed;
  } catch {
    // ignore
  }
  const gh = await readStatsFromGithub();
  let combined = gh ? mergeStats(disk, gh) : disk;
  if (memoryStats) combined = mergeStats(combined, memoryStats);
  memoryStats = combined;
  return combined;
}

async function writeStats(stats: ExamStatsFile): Promise<void> {
  stats.updatedAt = new Date().toISOString();
  memoryStats = stats;
  try {
    await fs.mkdir(path.dirname(statsPath()), { recursive: true });
    await fs.writeFile(statsPath(), JSON.stringify(stats, null, 2) + '\n', 'utf8');
  } catch {
    // ephemeral FS
  }
  await writeStatsToGithub(stats);
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

  const day = new Date().toISOString().slice(0, 10);
  if (!stats.dailyActivity) stats.dailyActivity = {};
  stats.dailyActivity[day] = (stats.dailyActivity[day] || 0) + 1;

  await writeStats(stats);
  return next;
}

export interface HomepageExamStat {
  examId: string;
  title: string;
  attempts: number;
  correct: number;
  questionsWithData: number;
}

export interface HomepageStatsOverview {
  totalAttempts: number;
  totalCorrect: number;
  exams: HomepageExamStat[];
  /** Last 98 days (14 weeks × 7), oldest → newest */
  heatmap: Array<{ date: string; count: number }>;
}

export async function getHomepageStatsOverview(
  examMeta: Array<{ id: string; title: string }>
): Promise<HomepageStatsOverview> {
  const stats = await readStats();
  const exams: HomepageExamStat[] = [];
  let totalAttempts = 0;
  let totalCorrect = 0;

  for (const meta of examMeta) {
    const qs = stats.exams[meta.id]?.questionStats || {};
    let attempts = 0;
    let correct = 0;
    let questionsWithData = 0;
    for (const st of Object.values(qs)) {
      if (!st.attempts) continue;
      questionsWithData += 1;
      attempts += st.attempts;
      correct += st.correct;
    }
    totalAttempts += attempts;
    totalCorrect += correct;
    exams.push({
      examId: meta.id,
      title: meta.title,
      attempts,
      correct,
      questionsWithData,
    });
  }

  exams.sort((a, b) => b.attempts - a.attempts);

  const heatmap: Array<{ date: string; count: number }> = [];
  const activity = stats.dailyActivity || {};
  const today = new Date();
  today.setUTCHours(12, 0, 0, 0);
  for (let i = 97; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - i);
    const key = d.toISOString().slice(0, 10);
    heatmap.push({ date: key, count: activity[key] || 0 });
  }

  return { totalAttempts, totalCorrect, exams, heatmap };
}
