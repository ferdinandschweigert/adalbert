#!/usr/bin/env node
/**
 * Extract M2 Gedächtnisprotokoll questions + green-highlighted answers into the Altfragen bank.
 *
 * Usage:
 *   node scripts/import-m2-gedaechtnisprotokoll.mjs path/to/protocol.pdf
 *
 * Green option bars (RGB ~147,196,125) are mapped to A–E. Title-row greens are ignored.
 */
import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../website');

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: node scripts/import-m2-gedaechtnisprotokoll.mjs <pdf>');
    process.exit(1);
  }

  const { getDocument, OPS } = await import(
    path.join(websiteRoot, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')
  );
  const { PDFParse } = await import(path.join(websiteRoot, 'node_modules/pdf-parse/dist/pdf-parse/esm/index.js')).catch(
    async () => await import(path.join(websiteRoot, 'node_modules/pdf-parse/index.js'))
  );

  const buf = readFileSync(pdfPath);
  const data = new Uint8Array(buf);
  const pdf = await getDocument({ data, disableFontFace: true, verbosity: 0 }).promise;

  function isGreen(r, g, b) {
    return g > 150 && r < 210 && b < 190 && g > r && g > b && g - Math.max(r, b) > 15;
  }

  async function greenRects(page) {
    const viewport = page.getViewport({ scale: 1 });
    const ops = await page.getOperatorList();
    let fill = [0, 0, 0];
    const rects = [];
    for (let i = 0; i < ops.fnArray.length; i++) {
      const name = Object.entries(OPS).find(([, v]) => v === ops.fnArray[i])?.[0];
      const args = ops.argsArray[i];
      if (name === 'setFillRGBColor') fill = args.map(Number);
      else if (name === 'constructPath' && isGreen(...fill)) {
        let idx = 0;
        for (const pop of args[0]) {
          if (pop === OPS.rectangle) {
            const x = args[1][idx++];
            const y = args[1][idx++];
            const w = args[1][idx++];
            const h = args[1][idx++];
            const y2 = y + h;
            if (w > 200 && h > 12 && h < 36 && x > 100 && y > 20 && y2 < viewport.height + 5) {
              rects.push({ x, y, w, h, y2 });
            }
          } else if (pop === OPS.moveTo || pop === OPS.lineTo) idx += 2;
          else if (pop === OPS.curveTo) idx += 6;
        }
      }
    }
    return rects;
  }

  const answers = new Map();
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const rects = await greenRects(page);
    if (!rects.length) continue;
    const tc = await page.getTextContent();
    const items = tc.items.filter((it) => it.str?.trim());
    const markers = items
      .filter((it) => /^[A-E]$/.test(it.str.trim()) && it.transform[4] < 110)
      .map((it) => ({ letter: it.str.trim(), y: it.transform[5] }));
    const qIds = [];
    for (const it of items) {
      const m = it.str.match(/\b(T\d+_\d+)\b/);
      if (m) qIds.push({ id: m[1], y: it.transform[5] });
    }
    for (const r of rects) {
      if (qIds.some((q) => q.y >= r.y - 8 && q.y <= r.y2 + 18)) continue;
      const cands = markers
        .filter((m) => m.y >= r.y - 12 && m.y <= r.y2 + 12)
        .sort((a, b) => Math.abs(a.y - r.y2) - Math.abs(b.y - r.y2));
      if (!cands.length) continue;
      let pick = cands[0];
      if (Math.abs(pick.y - r.y2) > 16) pick = [...cands].sort((a, b) => b.y - a.y)[0];
      let qid = null;
      let bestDy = Infinity;
      for (const q of qIds) {
        if (q.y > pick.y) {
          const dy = q.y - pick.y;
          if (dy < bestDy) {
            bestDy = dy;
            qid = q.id;
          }
        }
      }
      if (!qid || bestDy > 280) continue;
      if (!answers.has(qid)) answers.set(qid, new Set());
      answers.get(qid).add(pick.letter);
    }
  }
  await pdf.destroy();

  const answerMap = Object.fromEntries(
    [...answers.entries()].map(([k, v]) => [k, [...v].sort().join('')])
  );

  function normalizeSpaces(s) {
    return s.replace(/[ \t]+/g, ' ').replace(/\n+/g, ' ').trim();
  }

  const parser = new PDFParse({ data: buf });
  const result = await parser.getText();
  await parser.destroy();
  let text = (result.text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\n--\s*\d+\s+of\s+\d+\s*--\n/gi, '\n');

  const idRe = /\b(T\d+_\d+)\s*\|\s*/g;
  const starts = [...text.matchAll(idRe)];
  const questions = [];

  for (let i = 0; i < starts.length; i++) {
    const id = starts[i][1];
    const start = starts[i].index + starts[i][0].length;
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const chunk = text.slice(start, end);
    const titleMatch = chunk.match(/^([\s\S]*?)(?=\nFrage\s|\nFrage\t)/);
    const title = titleMatch ? titleMatch[1] : chunk.slice(0, 120);
    const body = titleMatch ? chunk.slice(titleMatch[0].length) : chunk;
    const frageMatch = body.match(/Frage\s+([\s\S]*?)(?=\n\s*[A-E]\+?\s)/);
    const question = frageMatch
      ? normalizeSpaces(frageMatch[1])
      : normalizeSpaces((body.split(/\n\s*[A-E]\+?\s/)[0] || '').replace(/^Frage\s+/i, ''));

    const optRe = /\n\s*([A-E])(\+?)\s+([^\n]+(?:\n(?!\s*[A-E]\+?\s)[^\n]+)*)/g;
    const options = [];
    const slice = '\n' + body;
    let m;
    while ((m = optRe.exec(slice)) !== null) {
      options[m[1].charCodeAt(0) - 65] = normalizeSpaces(m[3]).replace(/\s*T\d+_\d+.*$/, '').trim();
    }
    const cleanOptions = [];
    for (let j = 0; j < 5; j++) if (options[j]) cleanOptions.push(options[j]);
    if (cleanOptions.length < 2) continue;

    const letters = answerMap[id] || '';
    const bits = cleanOptions
      .map((_, j) => (letters.includes(String.fromCharCode(65 + j)) ? '1' : '0'))
      .join('');
    const hasKey = bits.includes('1');
    questions.push({
      number: questions.length + 1,
      question: `[${id}] ${question || normalizeSpaces(title)}`,
      options: cleanOptions,
      type: letters.length > 1 ? 'MC' : 'SC',
      correctAnswers: bits,
      explanation: hasKey
        ? `Lösung laut grüner Markierung im Gedächtnisprotokoll (${letters.split('').join(', ')}). ${normalizeSpaces(title)}`
        : `Keine grüne Lösungs-Markierung im Protokoll gefunden. ${normalizeSpaces(title)}`,
    });
  }

  const withKey = questions.filter((q) => q.correctAnswers.includes('1')).length;
  const exam = {
    id: randomUUID(),
    title: 'M2 SS26 / F26 – Gedächtnisprotokoll',
    sourceLabel: 'Gedächtnisprotokoll M2 SS26',
    description: `M2 SS26 Gedächtnisprotokoll: ${questions.length} Fragen, davon ${withKey} mit grün markierter Lösung.`,
    published: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    questions,
  };

  const out = path.join(websiteRoot, 'data/altfragen-bank.json');
  writeFileSync(
    out,
    JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), exams: [exam] }, null, 2) + '\n'
  );
  console.log(`Wrote ${out}`);
  console.log(`${questions.length} questions, ${withKey} with green answer keys`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
