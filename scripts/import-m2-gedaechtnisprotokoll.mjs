#!/usr/bin/env node
/**
 * Import M2 Gedächtnisprotokoll PDF → Altfragen bank with green-highlight answers.
 *
 * Uses pixel sampling (green option bars) + cross-page option linking.
 *
 * Usage:
 *   node scripts/import-m2-gedaechtnisprotokoll.mjs path/to/protocol.pdf
 */
import { readFileSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../website');

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: node scripts/import-m2-gedaechtnisprotokoll.mjs <pdf>');
    process.exit(1);
  }

  const { getDocument } = await import(
    path.join(websiteRoot, 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')
  );
  const { createCanvas } = await import(path.join(websiteRoot, 'node_modules/@napi-rs/canvas/js-binding.js')).catch(
    async () => await import('@napi-rs/canvas')
  );
  const { PDFParse } = await import(
    path.join(websiteRoot, 'node_modules/pdf-parse/dist/pdf-parse/esm/index.js')
  ).catch(async () => await import(path.join(websiteRoot, 'node_modules/pdf-parse/index.js')));

  const buf = readFileSync(pdfPath);
  const data = new Uint8Array(buf);
  const pdf = await getDocument({ data, disableFontFace: true, verbosity: 0 }).promise;

  function isGreenPixel(r, g, b) {
    return (
      g > 130 &&
      g > r + 10 &&
      g >= b - 5 &&
      r < 240 &&
      b < 240 &&
      g - r + (g - Math.min(b, g)) > 20
    );
  }

  function greenScore(px, width, height, vx, vy) {
    const x0 = Math.max(0, Math.floor(vx + 8));
    const x1 = Math.min(width - 1, Math.floor(vx + 480));
    const y0 = Math.max(0, Math.floor(vy - 18));
    const y1 = Math.min(height - 1, Math.floor(vy + 10));
    let green = 0;
    let total = 0;
    for (let y = y0; y <= y1; y += 2) {
      for (let x = x0; x <= x1; x += 2) {
        const i = (y * width + x) * 4;
        total++;
        if (isGreenPixel(px[i], px[i + 1], px[i + 2])) green++;
      }
    }
    return total ? green / total : 0;
  }

  function rowGreenScore(px, width, height, vy) {
    const y0 = Math.max(0, Math.floor(vy - 16));
    const y1 = Math.min(height - 1, Math.floor(vy + 10));
    let green = 0;
    let total = 0;
    for (let y = y0; y <= y1; y += 2) {
      for (let x = 90; x < width - 40; x += 3) {
        const i = (y * width + x) * 4;
        total++;
        if (isGreenPixel(px[i], px[i + 1], px[i + 2])) green++;
      }
    }
    return total ? green / total : 0;
  }

  const scores = new Map();
  function addScore(qid, letter, score) {
    if (!qid || score < 0.04) return;
    if (!scores.has(qid)) scores.set(qid, {});
    const cur = scores.get(qid);
    cur[letter] = Math.max(cur[letter] || 0, score);
  }

  let carryQid = null;
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const scale = 2;
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data: px, width, height } = img;

    const tc = await page.getTextContent();
    const items = tc.items.filter((it) => typeof it.str === 'string' && it.str.trim());
    const qIds = [];
    const markers = [];
    for (const it of items) {
      const [x, y] = viewport.convertToViewportPoint(it.transform[4], it.transform[5]);
      const m = it.str.match(/\b(T\d+_\d+)\b/);
      if (m) qIds.push({ id: m[1], x, y });
      if (/^[A-E]\+?$/.test(it.str.trim()) && it.transform[4] < 130) {
        markers.push({ letter: it.str.trim().replace('+', ''), x, y });
      }
    }
    qIds.sort((a, b) => a.y - b.y);
    const firstQY = qIds[0]?.y ?? Infinity;

    for (const m of markers) {
      let qid = null;
      if (m.y < firstQY - 8 && carryQid) qid = carryQid;
      else {
        let best = Infinity;
        for (const q of qIds) {
          if (q.y < m.y + 2) {
            const dy = m.y - q.y;
            if (dy < best) {
              best = dy;
              qid = q.id;
            }
          }
        }
      }
      if (!qid) continue;
      const s = Math.max(
        greenScore(px, width, height, m.x, m.y),
        rowGreenScore(px, width, height, m.y) * 0.9
      );
      addScore(qid, m.letter, s);
    }
    carryQid = qIds.length ? qIds[qIds.length - 1].id : carryQid;
    if (p % 15 === 0) console.log('page', p, 'qs', scores.size);
  }
  await pdf.destroy();

  const answerMap = {};
  for (const [qid, map] of scores) {
    const entries = Object.entries(map)
      .filter(([, s]) => s >= 0.05)
      .sort((a, b) => b[1] - a[1]);
    if (entries.length) answerMap[qid] = entries[0][0];
  }

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
    const letter = answerMap[id] || '';
    const bits = cleanOptions
      .map((_, j) => (letter === String.fromCharCode(65 + j) ? '1' : '0'))
      .join('');
    questions.push({
      number: questions.length + 1,
      question: `[${id}] ${question || normalizeSpaces(title)}`,
      options: cleanOptions,
      type: 'SC',
      correctAnswers: bits.includes('1') ? bits : '0'.repeat(cleanOptions.length),
      explanation: bits.includes('1')
        ? `Lösung ${letter} (grüne Markierung im Gedächtnisprotokoll). ${normalizeSpaces(title)}`
        : `Keine grüne Markierung erkannt. ${normalizeSpaces(title)}`,
    });
  }

  const withKey = questions.filter((q) => q.correctAnswers.includes('1')).length;
  const exam = {
    id: 'm2-ss26-f26-gedaechtnisprotokoll',
    title: 'M2 SS26 / F26 – Gedächtnisprotokoll',
    sourceLabel: 'Gedächtnisprotokoll M2 SS26',
    description: `M2 SS26: ${questions.length} Fragen, ${withKey} mit grün erkannter Lösung.`,
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
  console.log(`Wrote ${out}: ${questions.length} questions, ${withKey} with keys`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
