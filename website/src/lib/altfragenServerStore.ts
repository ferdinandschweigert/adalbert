import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type {
  AltfragenBankFile,
  ExamSummary,
  ParsedQuestion,
  StoredExam,
} from '@/lib/altfragenTypes';

const BANK_RELATIVE = path.join('data', 'altfragen-bank.json');

function bankPath(): string {
  return path.join(process.cwd(), BANK_RELATIVE);
}

function emptyBank(): AltfragenBankFile {
  return { version: 1, updatedAt: new Date().toISOString(), exams: [] };
}

function normalizeExam(raw: Partial<StoredExam> & { questions?: ParsedQuestion[] }): StoredExam | null {
  if (!raw || typeof raw.title !== 'string' || !Array.isArray(raw.questions)) return null;
  const now = new Date().toISOString();
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : randomUUID(),
    title: raw.title.trim() || 'Unbenannte Klausur',
    sourceLabel: raw.sourceLabel ? String(raw.sourceLabel) : undefined,
    description: raw.description ? String(raw.description) : undefined,
    published: Boolean(raw.published),
    createdAt: raw.createdAt || now,
    updatedAt: raw.updatedAt || now,
    questions: raw.questions,
  };
}

async function readBankFromDisk(): Promise<AltfragenBankFile> {
  try {
    const raw = await fs.readFile(bankPath(), 'utf8');
    const parsed = JSON.parse(raw) as AltfragenBankFile;
    if (!parsed || !Array.isArray(parsed.exams)) return emptyBank();
    const exams = parsed.exams
      .map((e) => normalizeExam(e))
      .filter((e): e is StoredExam => Boolean(e));
    return { version: 1, updatedAt: parsed.updatedAt || new Date().toISOString(), exams };
  } catch {
    return emptyBank();
  }
}

async function writeBankToDisk(bank: AltfragenBankFile): Promise<void> {
  const dir = path.dirname(bankPath());
  await fs.mkdir(dir, { recursive: true });
  const payload: AltfragenBankFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    exams: bank.exams,
  };
  await fs.writeFile(bankPath(), JSON.stringify(payload, null, 2) + '\n', 'utf8');
}

function githubConfig(): { token: string; repo: string; filePath: string; branch: string } | null {
  const token = process.env.ALTFRAGEN_GITHUB_TOKEN || process.env.GITHUB_TOKEN || '';
  if (!token) return null;
  let repo = process.env.ALTFRAGEN_GITHUB_REPO || '';
  if (!repo && process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG) {
    repo = `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`;
  }
  if (!repo) repo = 'ferdinandschweigert/adalbert';
  const filePath = process.env.ALTFRAGEN_GITHUB_PATH || 'website/data/altfragen-bank.json';
  const branch = process.env.ALTFRAGEN_GITHUB_BRANCH || 'main';
  return { token, repo, filePath, branch };
}

async function readBankFromGithub(): Promise<AltfragenBankFile | null> {
  const cfg = githubConfig();
  if (!cfg) return null;
  const url = `https://api.github.com/repos/${cfg.repo}/contents/${cfg.filePath}?ref=${encodeURIComponent(cfg.branch)}`;
  const res = await fetch(url, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cfg.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: string; encoding?: string };
  if (!data.content) return null;
  const decoded = Buffer.from(data.content, 'base64').toString('utf8');
  const parsed = JSON.parse(decoded) as AltfragenBankFile;
  if (!parsed || !Array.isArray(parsed.exams)) return emptyBank();
  return {
    version: 1,
    updatedAt: parsed.updatedAt || new Date().toISOString(),
    exams: parsed.exams.map((e) => normalizeExam(e)).filter((e): e is StoredExam => Boolean(e)),
  };
}

async function writeBankToGithub(bank: AltfragenBankFile): Promise<boolean> {
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

  const payload: AltfragenBankFile = {
    version: 1,
    updatedAt: new Date().toISOString(),
    exams: bank.exams,
  };
  const content = Buffer.from(JSON.stringify(payload, null, 2) + '\n', 'utf8').toString('base64');

  const putRes = await fetch(`https://api.github.com/repos/${cfg.repo}/contents/${cfg.filePath}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cfg.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `chore(altfragen): update exam bank (${bank.exams.length} exams)`,
      content,
      branch: cfg.branch,
      ...(sha ? { sha } : {}),
    }),
  });

  return putRes.ok;
}

export type BankBackend = 'github' | 'filesystem' | 'memory';

let memoryBank: AltfragenBankFile | null = null;

export async function loadBank(): Promise<{ bank: AltfragenBankFile; backend: BankBackend }> {
  const fromGh = await readBankFromGithub();
  if (fromGh) return { bank: fromGh, backend: 'github' };

  try {
    const fromDisk = await readBankFromDisk();
    memoryBank = fromDisk;
    return { bank: fromDisk, backend: 'filesystem' };
  } catch {
    if (!memoryBank) memoryBank = emptyBank();
    return { bank: memoryBank, backend: 'memory' };
  }
}

export async function saveBank(bank: AltfragenBankFile): Promise<{ backend: BankBackend }> {
  const wroteGh = await writeBankToGithub(bank);
  if (wroteGh) {
    memoryBank = bank;
    return { backend: 'github' };
  }

  try {
    await writeBankToDisk(bank);
    memoryBank = bank;
    return { backend: 'filesystem' };
  } catch {
    memoryBank = bank;
    return { backend: 'memory' };
  }
}

export function toSummary(exam: StoredExam): ExamSummary {
  return {
    id: exam.id,
    title: exam.title,
    sourceLabel: exam.sourceLabel,
    description: exam.description,
    published: exam.published,
    createdAt: exam.createdAt,
    updatedAt: exam.updatedAt,
    questionCount: exam.questions.length,
  };
}

export async function listPublishedExams(): Promise<ExamSummary[]> {
  const { bank } = await loadBank();
  return bank.exams
    .filter((e) => e.published)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map(toSummary);
}

export async function listAllExams(): Promise<ExamSummary[]> {
  const { bank } = await loadBank();
  return bank.exams
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map(toSummary);
}

export async function getExamById(id: string, opts?: { publishedOnly?: boolean }): Promise<StoredExam | null> {
  const { bank } = await loadBank();
  const exam = bank.exams.find((e) => e.id === id) ?? null;
  if (!exam) return null;
  if (opts?.publishedOnly && !exam.published) return null;
  return exam;
}

export async function upsertExam(
  input: {
    id?: string;
    title: string;
    sourceLabel?: string;
    description?: string;
    published?: boolean;
    questions: ParsedQuestion[];
  }
): Promise<{ exam: StoredExam; backend: BankBackend }> {
  const { bank } = await loadBank();
  const now = new Date().toISOString();
  const existingIdx = input.id ? bank.exams.findIndex((e) => e.id === input.id) : -1;
  const existing = existingIdx >= 0 ? bank.exams[existingIdx] : null;

  const exam: StoredExam = {
    id: existing?.id || input.id || randomUUID(),
    title: input.title.trim() || 'Unbenannte Klausur',
    sourceLabel: input.sourceLabel,
    description: input.description,
    published: input.published ?? existing?.published ?? false,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
    questions: input.questions,
  };

  if (existingIdx >= 0) bank.exams[existingIdx] = exam;
  else bank.exams.push(exam);

  const { backend } = await saveBank(bank);
  return { exam, backend };
}

export async function setExamPublished(id: string, published: boolean): Promise<StoredExam | null> {
  const { bank } = await loadBank();
  const idx = bank.exams.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  bank.exams[idx] = {
    ...bank.exams[idx],
    published,
    updatedAt: new Date().toISOString(),
  };
  await saveBank(bank);
  return bank.exams[idx];
}

export async function deleteExamById(id: string): Promise<boolean> {
  const { bank } = await loadBank();
  const next = bank.exams.filter((e) => e.id !== id);
  if (next.length === bank.exams.length) return false;
  bank.exams = next;
  await saveBank(bank);
  return true;
}

export async function replaceBankExams(exams: StoredExam[]): Promise<{ backend: BankBackend; count: number }> {
  const normalized = exams
    .map((e) => normalizeExam(e))
    .filter((e): e is StoredExam => Boolean(e));
  const { backend } = await saveBank({
    version: 1,
    updatedAt: new Date().toISOString(),
    exams: normalized,
  });
  return { backend, count: normalized.length };
}
