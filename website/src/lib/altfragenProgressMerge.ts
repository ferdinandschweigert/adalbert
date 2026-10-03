import type { ExamProgress } from './altfragenTypes';

/** Fill gaps from an export without replacing answers made later in this browser. */
export function mergeExamProgress(local: ExamProgress | null, incoming: ExamProgress): ExamProgress {
  if (!local) return incoming;
  const selections = { ...incoming.selections, ...local.selections };
  const checkedAt = { ...incoming.checkedAt, ...local.checkedAt };
  const checked = new Set<number>(local.checked || []);
  for (const raw of incoming.checked || []) {
    const index = Number(raw);
    const localChecked = checked.has(index);
    const localDraft = Boolean(local.selections?.[index]) && !localChecked;
    if (!localDraft) checked.add(index);
  }
  for (const [key, value] of Object.entries(incoming.selections || {})) {
    const index = Number(key);
    const localDate = local.checkedAt?.[index];
    const importDate = incoming.checkedAt?.[index];
    if (importDate && localDate && Date.parse(importDate) > Date.parse(localDate)) {
      selections[index] = value;
      checkedAt[index] = importDate;
    }
  }
  return {
    ...incoming,
    ...local,
    examId: local.examId,
    selections,
    checked: [...checked].sort((a, b) => a - b),
    checkedAt,
    startedAt: [local.startedAt, incoming.startedAt].filter(Boolean).sort()[0],
  };
}
