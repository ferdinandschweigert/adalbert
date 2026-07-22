#!/usr/bin/env node
/**
 * Import 2025-A Staatsexamen PDFs (Altklausuren-DB format with "Lösung: X")
 * as one published exam into the Altfragen bank.
 *
 * Usage:
 *   node scripts/import-2025a-staatsexamen.mjs [pdf1] [pdf2] [pdf3]
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../website');
const EXAM_ID = 'm2-2025a-staatsexamen';

function normalizeSpaces(s) {
  return String(s || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

function stripNoise(text) {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/Page\s+\d+\/\d+/gi, '\n')
    .replace(/--\s*\d+\s+of\s+\d+\s*--/gi, '\n')
    .replace(/A 2025 \(\d+ Fragen\) TU Dresden Medizin\s*\n?Klausur 2\. Staatsexamen by anonym Altklausuren DB/gi, '\n')
    .replace(/Abb\.\s*\d+:[^\n]*/gi, '\n')
    .replace(/\n{3,}/g, '\n\n');
}

function parseQuestionsFromText(text, partLabel) {
  const cleaned = stripNoise(text);
  // Split on "Lösung: X" keeping the letter
  const parts = cleaned.split(/Lösung:\s*([A-E])\b/i);
  // parts = [chunk0, letter0, chunk1, letter1, ...]
  const questions = [];
  for (let i = 1; i < parts.length; i += 2) {
    const letter = parts[i].toUpperCase();
    const before = parts[i - 1];
    // Take from last question number start
    const qMatch = before.match(/(?:^|\n)(\d+)\s+([\s\S]+)$/);
    if (!qMatch) continue;
    const localNum = Number(qMatch[1]);
    let body = qMatch[2].trim();

    // Options: (A) ... (B) ...
    const optRe = /\(([A-E])\)\s*/g;
    const markers = [...body.matchAll(optRe)];
    if (markers.length < 2) continue;

    const questionText = normalizeSpaces(body.slice(0, markers[0].index));
    const options = [];
    for (let m = 0; m < markers.length; m++) {
      const start = markers[m].index + markers[m][0].length;
      const end = m + 1 < markers.length ? markers[m + 1].index : body.length;
      const optText = normalizeSpaces(body.slice(start, end));
      if (!optText) continue;
      options.push(optText);
    }
    if (options.length < 2 || !questionText) continue;

    const letterIdx = letter.charCodeAt(0) - 65;
    const bits = options.map((_, j) => (j === letterIdx ? '1' : '0')).join('');
    if (letterIdx < 0 || letterIdx >= options.length) continue;

    questions.push({
      localNum,
      partLabel,
      question: questionText,
      options,
      type: 'SC',
      correctAnswers: bits,
      explanation: `Lösung ${letter} (Altklausuren-DB 2025-A${partLabel ? `, ${partLabel}` : ''}).`,
    });
  }
  return questions;
}

async function extractPdfText(pdfPath) {
  const { PDFParse } = await import(
    path.join(websiteRoot, 'node_modules/pdf-parse/dist/pdf-parse/esm/index.js')
  ).catch(async () => await import(path.join(websiteRoot, 'node_modules/pdf-parse/index.js')));

  const buf = readFileSync(pdfPath);
  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  await parser.destroy();
  return result.text || '';
}

async function main() {
  const defaults = [
    '/home/ubuntu/.cursor/projects/workspace/uploads/2025-A_2._Staatsexamen_Klausur_53ac.pdf',
    '/home/ubuntu/.cursor/projects/workspace/uploads/2025-A_2._Staatsexamen_Klausur__1__c37b.pdf',
    '/home/ubuntu/.cursor/projects/workspace/uploads/2025-A_2._Staatsexamen_Klausur__2__b4e2.pdf',
  ];
  const pdfs = process.argv.slice(2).length ? process.argv.slice(2) : defaults;

  const all = [];
  for (let i = 0; i < pdfs.length; i++) {
    const pdfPath = pdfs[i];
    if (!existsSync(pdfPath)) {
      console.error('Missing PDF:', pdfPath);
      process.exit(1);
    }
    console.log('Parsing', path.basename(pdfPath), '…');
    const text = await extractPdfText(pdfPath);
    const part = `Teil ${i + 1}`;
    const qs = parseQuestionsFromText(text, part);
    console.log(`  → ${qs.length} questions`);
    all.push(...qs);
  }

  // Deduplicate by question stem (PDFs sometimes repeat stem across consecutive items)
  // Keep order; only drop exact duplicates of full question+options
  const seen = new Set();
  const unique = [];
  for (const q of all) {
    const key = q.question.slice(0, 160) + '|' + q.options.join('|');
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(q);
  }

  const questions = unique.map((q, idx) => ({
    number: idx + 1,
    question: q.question,
    options: q.options,
    type: 'SC',
    correctAnswers: q.correctAnswers,
    explanation: q.explanation,
  }));

  const withKey = questions.filter((q) => q.correctAnswers.includes('1')).length;
  const exam = {
    id: EXAM_ID,
    title: 'M2 2025-A – 2. Staatsexamen',
    sourceLabel: 'Altklausuren-DB A 2025 (TU Dresden)',
    description: `A 2025 Staatsexamen: ${questions.length} Fragen aus ${pdfs.length} PDF-Teilen, ${withKey} mit Lösung.`,
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions,
  };

  const bankPath = path.join(websiteRoot, 'data/altfragen-bank.json');
  let bank = { version: 1, updatedAt: new Date().toISOString(), exams: [] };
  if (existsSync(bankPath)) {
    try {
      bank = JSON.parse(readFileSync(bankPath, 'utf8'));
      if (!Array.isArray(bank.exams)) bank.exams = [];
    } catch {
      bank = { version: 1, updatedAt: new Date().toISOString(), exams: [] };
    }
  }

  const others = bank.exams.filter((e) => e.id !== EXAM_ID);
  bank = {
    version: 1,
    updatedAt: new Date().toISOString(),
    exams: [...others, exam],
  };

  writeFileSync(bankPath, JSON.stringify(bank, null, 2) + '\n');
  console.log(`Wrote ${bankPath}`);
  console.log(`Exam ${EXAM_ID}: ${questions.length} questions, ${withKey} with keys`);
  console.log(`Bank now has ${bank.exams.length} exam(s)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
