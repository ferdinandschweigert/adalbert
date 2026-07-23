import { NextRequest, NextResponse } from 'next/server';
import { PDFParse } from 'pdf-parse';
import { buildLlmConfig, generateTextWithFallback } from '@/lib/llmClient';
import { accessUnauthorizedIfNeeded } from '@/lib/siteAccess';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 Minuten für große PDFs

interface ParsedQuestion {
  number: number;
  question: string;
  options: string[];
  type: 'SC' | 'MC' | 'KPRIM';
  correctAnswers?: string; // Binärcode z.B. "10010"
  explanation?: string;
}

interface ParsedExam {
  title: string;
  date?: string;
  questions: ParsedQuestion[];
}

function normalizePdfText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/([A-Za-zÄÖÜäöü])-\n([A-Za-zÄÖÜäöü])/g, '$1$2')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function extractJsonFromText(text: string): string {
  let jsonText = text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/gm, '').replace(/```$/gm, '');
  }
  const objectMatch = jsonText.match(/\{[\s\S]*\}/);
  if (objectMatch) return objectMatch[0];
  const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
  return arrayMatch ? arrayMatch[0] : jsonText;
}

function sanitizeJsonString(jsonText: string): string {
  let out = '';
  let inString = false;
  let escaped = false;
  for (let i = 0; i < jsonText.length; i++) {
    const ch = jsonText[i];
    if (inString) {
      if (escaped) {
        out += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        out += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        out += ch;
        inString = false;
        continue;
      }
      const code = ch.charCodeAt(0);
      if (code < 0x20) {
        if (ch === '\n') out += '\\n';
        else if (ch === '\r') out += '\\r';
        else if (ch === '\t') out += '\\t';
        continue;
      }
      out += ch;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    out += ch;
  }
  return out;
}

function stripTrailingCommas(jsonText: string): string {
  return jsonText.replace(/,\s*([}\]])/g, '$1');
}

function safeJsonParse<T>(text: string): T | null {
  const jsonText = extractJsonFromText(text);
  try {
    return JSON.parse(jsonText) as T;
  } catch {
    try {
      const sanitized = stripTrailingCommas(sanitizeJsonString(jsonText));
      return JSON.parse(sanitized) as T;
    } catch {
      return null;
    }
  }
}

function normalizeQuestionNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d]/g, '');
    const parsed = Number(cleaned);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return fallback;
}

function normalizeQuestionType(value: unknown): ParsedQuestion['type'] {
  const raw = String(value || '').toUpperCase();
  if (raw.includes('KPRIM')) return 'KPRIM';
  if (raw.includes('MC')) return 'MC';
  if (raw.includes('SC')) return 'SC';
  return 'SC';
}

function normalizeAnswerBits(value: unknown, optionCount: number): string {
  const raw = typeof value === 'string' ? value : String(value || '');
  const bits = raw.replace(/[^01]/g, '');
  if (!optionCount) return bits;
  return bits.padEnd(optionCount, '0').slice(0, optionCount);
}

function normalizeQuestions(questions: ParsedQuestion[]): ParsedQuestion[] {
  return questions
    .map((q, index) => {
      const question = typeof q.question === 'string' ? q.question.trim() : '';
      const options = Array.isArray(q.options)
        ? q.options.map((opt) => String(opt || '').trim()).filter(Boolean)
        : [];
      const type = normalizeQuestionType(q.type);
      const number = normalizeQuestionNumber(q.number, index + 1);
      const explanation = typeof q.explanation === 'string' ? q.explanation.trim() : undefined;
      const correctAnswers =
        q.correctAnswers && options.length
          ? normalizeAnswerBits(q.correctAnswers, options.length)
          : q.correctAnswers;
      return {
        number,
        question,
        options,
        type,
        correctAnswers,
        explanation,
      };
    })
    .filter((q) => q.question && q.options.length > 0);
}

const MIN_EXTRACT_CHARS = 200;

// Extrahiert Text aus PDF (pdf-parse 2.x: PDFParse + getText)
async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text || '';
  } finally {
    await parser.destroy();
  }
}

async function renderPdfPagesToBase64Pngs(buffer: Buffer, scale: number): Promise<string[]> {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createCanvas } = await import('@napi-rs/canvas');

  if (!GlobalWorkerOptions.workerSrc) {
    GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
  }

  const loadingTask = getDocument({
    data: buffer,
    disableFontFace: true,
    verbosity: 0,
  });
  const pages: string[] = [];

  try {
    const pdfDocument = await loadingTask.promise;
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
      const page = await pdfDocument.getPage(pageNum);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const context = canvas.getContext('2d') as unknown as CanvasRenderingContext2D;
      await page.render({ canvasContext: context, viewport }).promise;
      pages.push(canvas.toBuffer('image/png').toString('base64'));
    }
  } finally {
    await loadingTask.destroy();
  }

  return pages;
}

async function extractTextFromPdfWithGemini(
  buffer: Buffer,
  llmConfig: ReturnType<typeof buildLlmConfig>
): Promise<string> {
  const provider = llmConfig.providers.find((item) => item.provider === 'gemini');
  if (!provider) throw new Error('Kein Gemini-Provider konfiguriert');

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(provider.apiKey);
  const model = genAI.getGenerativeModel({ model: provider.model });

  const systemPrompt = `Du bist ein OCR-System. Extrahiere den GESAMTEN Text aus der PDF.
Gib NUR den extrahierten Text zurück, keine Erklärungen oder Formatierung.
Behalte die Struktur (Absätze, Nummerierungen, Optionen A/B/C/D/E) bei.`;

  const result = await model.generateContent([
    systemPrompt,
    {
      inlineData: {
        mimeType: 'application/pdf',
        data: buffer.toString('base64'),
      },
    },
  ]);

  return result.response.text();
}

// OCR-Fallback für gescannte/bildbasierte PDFs: PDF → Seiten als PNG → LLM Vision OCR
async function extractTextFromPdfWithOcr(
  buffer: Buffer,
  llmConfig: ReturnType<typeof buildLlmConfig>
): Promise<string> {
  let images: string[] = [];
  try {
    // PDF zu Base64-PNG-Bildern konvertieren (scale 2 für bessere Lesbarkeit)
    images = await renderPdfPagesToBase64Pngs(buffer, 2);
  } catch (err) {
    if (llmConfig.providers.some((item) => item.provider === 'gemini')) {
      return await extractTextFromPdfWithGemini(buffer, llmConfig);
    }
    throw err;
  }
  if (!images?.length) {
    if (llmConfig.providers.some((item) => item.provider === 'gemini')) {
      return await extractTextFromPdfWithGemini(buffer, llmConfig);
    }
    return '';
  }

  const parts: string[] = [];
  
  // Jede Seite per LLM Vision OCR verarbeiten
  for (let i = 0; i < images.length; i++) {
    const base64Image = images[i];
    const text = await ocrImageWithLlm(base64Image, i + 1, images.length, llmConfig);
    if (text?.trim()) parts.push(text.trim());
  }
  
  const text = parts.join('\n\n').trim();
  if (!text && llmConfig.providers.some((item) => item.provider === 'gemini')) {
    return await extractTextFromPdfWithGemini(buffer, llmConfig);
  }
  return text;
}

// LLM Vision OCR für ein einzelnes Bild
async function ocrImageWithLlm(
  base64Image: string,
  pageNum: number,
  totalPages: number,
  llmConfig: ReturnType<typeof buildLlmConfig>
): Promise<string> {
  const provider = llmConfig.providers[0];
  if (!provider) throw new Error('Kein LLM-Provider konfiguriert');

  // Vision-Modell für Together AI
  const visionModel = provider.provider === 'together'
    ? 'meta-llama/Llama-Vision-Free'
    : provider.provider === 'gemini'
      ? 'gemini-2.0-flash'
      : 'gpt-4o-mini'; // OpenAI fallback

  const systemPrompt = `Du bist ein OCR-System. Extrahiere den GESAMTEN Text aus dem Bild einer Prüfungsseite.
Gib NUR den extrahierten Text zurück, keine Erklärungen oder Formatierung.
Behalte die Struktur (Absätze, Nummerierungen, Optionen A/B/C/D/E) bei.
Dies ist Seite ${pageNum} von ${totalPages}.`;

  if (provider.provider === 'gemini') {
    // Gemini Vision API
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(provider.apiKey);
    const model = genAI.getGenerativeModel({ model: visionModel });
    
    const result = await model.generateContent([
      systemPrompt,
      {
        inlineData: {
          mimeType: 'image/png',
          data: base64Image,
        },
      },
    ]);
    return result.response.text();
  }

  // Together AI / OpenAI-kompatible Vision API
  const baseUrl = provider.baseUrl || 
    (provider.provider === 'together' ? 'https://api.together.xyz' : 'https://api.openai.com');

  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: visionModel,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: systemPrompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`Vision OCR fehlgeschlagen: ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

// LLM-Prompt zum Parsen der Fragen
function buildParsePrompt(text: string): string {
  return `Du bist ein Experte für das deutsche 2. Staatsexamen (M2 / IMPP) und medizinische Altfragen.

Analysiere den Klausurtext (oft ein Gedächtnisprotokoll) und extrahiere ALLE Prüfungsfragen.

WICHTIG:
- Erkenne den Fragetyp: SC (eine Antwort, z.B. "Bitte kreuzen Sie eine Antwort an"), MC (mehrere), KPRIM (ja/nein je Option)
- Optionen als (A) (B) (C) (D) (E) oder 1.–5. – gib sie exakt als Array
- "question" = vollständiger Fragetext inkl. Stamm, ohne die Optionsliste
- Gedächtnisprotokolle sind oft unvollständig oder laut: fehlende Optionen weglassen, keine erfundenen Antworten einfügen
- Hinweise wie "vermutlich A", "Lösung C", "richtig war …" NICHT in den Fragetext schreiben – nur die eigentliche Frage + Optionen
- Nummerierung so beibehalten wie im Protokoll, sonst fortlaufend ab 1

Antworte NUR mit diesem JSON (keine Erklärungen):
{
  "questions": [
    {
      "number": 1,
      "question": "Vollständiger Fragetext...",
      "options": ["Option A", "Option B", "Option C", "Option D", "Option E"],
      "type": "SC"
    }
  ]
}

KLAUSURTEXT:
${text.substring(0, 80000)}`;
}

// LLM-Prompt zum Bestimmen der korrekten Antworten
function buildAnswerPrompt(questions: ParsedQuestion[]): string {
  const questionsText = questions.map((q, i) => {
    const optionsText = q.options.map((opt, j) => `  ${String.fromCharCode(65 + j)}) ${opt}`).join('\n');
    return `Frage ${q.number}: ${q.question}\n${optionsText}`;
  }).join('\n\n');

  return `Du bist ein Experte für klinische Medizin und das deutsche 2. Staatsexamen (M2 / IMPP-Stil).

Bestimme die KORREKTEN Antworten für jede Frage. Nutze solides klinisches Fachwissen über alle Fächer (Innere, Chirurgie, Pädiatrie, Gynäkologie, Neurologie, Psychiatrie, Pharmakologie usw.).

WICHTIG:
- Bei SC (Single Choice): Genau EINE richtige Antwort
- Bei MC (Multiple Choice): Eine oder mehrere richtige Antworten
- Bei KPRIM: Je Option richtig (1) oder falsch (0)
- Gib Antworten als Binärcode (1=richtig, 0=falsch), Länge = Anzahl der Optionen
- Gib eine KURZE deutschsprachige Erklärung
- Wenn die Frage aus einem Gedächtnisprotokoll unklar/unvollständig ist: beste medizinische Schätzung und das in der Erklärung kurz erwähnen

Antworte NUR mit diesem JSON:
{
  "answers": [
    {
      "number": 1,
      "correctAnswers": "10000",
      "explanation": "A ist richtig weil... B ist falsch weil..."
    }
  ]
}

FRAGEN:
${questionsText}`;
}

// Parst den extrahierten Text mit LLM
async function parseQuestionsWithLlm(
  text: string,
  llmConfig: ReturnType<typeof buildLlmConfig>
): Promise<ParsedQuestion[]> {
  const prompt = buildParsePrompt(text);
  const response = await generateTextWithFallback(prompt, llmConfig);
  const parsed = safeJsonParse<{ questions?: ParsedQuestion[] } | ParsedQuestion[]>(response);
  const questions = Array.isArray(parsed)
    ? normalizeQuestions(parsed)
    : normalizeQuestions(parsed?.questions || []);
  if (!questions.length) {
    throw new Error('LLM hat keine Fragen extrahiert');
  }
  return questions;
}

// Bestimmt korrekte Antworten mit LLM
async function determineAnswersWithLlm(
  questions: ParsedQuestion[],
  llmConfig: ReturnType<typeof buildLlmConfig>
): Promise<ParsedQuestion[]> {
  const batchSize = 5;
  const results: ParsedQuestion[] = [...questions];
  
  for (let i = 0; i < questions.length; i += batchSize) {
    const batch = questions.slice(i, i + batchSize);
    const prompt = buildAnswerPrompt(batch);
    
    try {
      const response = await generateTextWithFallback(prompt, llmConfig);
      const parsed = safeJsonParse<
        | { answers?: Array<{ number?: number; correctAnswers?: string; explanation?: string }> }
        | Array<{ number?: number; correctAnswers?: string; explanation?: string }>
      >(response);

      const answers = Array.isArray(parsed) ? parsed : parsed?.answers || [];
      if (answers.length > 0) {
        for (const answer of answers) {
          const idx = answer.number
            ? results.findIndex((q) => q.number === answer.number)
            : -1;
          const targetIndex = idx !== -1 ? idx : i + answers.indexOf(answer);
          if (targetIndex >= 0 && targetIndex < results.length) {
            const optionCount = results[targetIndex].options.length;
            if (answer.correctAnswers) {
              results[targetIndex].correctAnswers = normalizeAnswerBits(
                answer.correctAnswers,
                optionCount
              );
            }
            if (answer.explanation) {
              results[targetIndex].explanation = answer.explanation;
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error determining answers for batch ${i}:`, e);
    }
  }
  
  return results;
}

export async function POST(request: NextRequest) {
  const denied = accessUnauthorizedIfNeeded(request);
  if (denied) return denied;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const provider = formData.get('provider') as string || 'gemini';
    const model = formData.get('model') as string || '';
    const step = formData.get('step') as string || 'extract'; // 'extract', 'parse', 'answer'
    const questionsJson = formData.get('questions') as string || '';
    // API keys only from server env — never from the browser
    const apiKey = '';
    const baseUrl = formData.get('baseUrl') as string || '';

    if (!file && step === 'extract') {
      return NextResponse.json({ error: 'Keine PDF-Datei hochgeladen' }, { status: 400 });
    }

    const llmConfig = buildLlmConfig({
      provider,
      model: model || undefined,
      apiKey: apiKey || undefined,
      baseUrl: baseUrl || undefined,
    });

    // Step 1: Text extrahieren
    if (step === 'extract') {
      const buffer = Buffer.from(await file!.arrayBuffer());
      let rawText = await extractTextFromPdf(buffer);
      let text = normalizePdfText(rawText);
      let usedOcr = false;

      // OCR-Fallback bei gescannten/bildbasierten PDFs
      if (text.length < MIN_EXTRACT_CHARS) {
        try {
          rawText = await extractTextFromPdfWithOcr(buffer, llmConfig);
          text = normalizePdfText(rawText);
          usedOcr = true;
        } catch (ocrErr) {
          const ocrMsg = ocrErr instanceof Error ? ocrErr.message : String(ocrErr);
          const nativeBindingHint = ocrMsg.toLowerCase().includes('native binding')
            ? ` (Tipp: Node ${process.version} erkannt; Plattform ${process.platform}/${process.arch}. Installiere optionale Binaries mit "npm install" in /website oder "npm install --include=optional". Bei Rosetta/Arch-Mismatch bitte Node neu installieren und deps neu installieren.)`
            : '';
          console.error('OCR fallback failed:', ocrErr);
          return NextResponse.json(
            {
              error:
                `Text-Extraktion lieferte nur ${text.length} Zeichen. ` +
                `OCR-Fallback fehlgeschlagen: ${ocrMsg}${nativeBindingHint}. ` +
                'Bitte bessere Scanqualität oder eine durchsuchbare PDF verwenden. ' +
                '(Hinweis: OCR benötigt das Paket "@napi-rs/canvas" – ggf. installieren: npm install @napi-rs/canvas)',
            },
            { status: 400 }
          );
        }
      }

      if (text.length < MIN_EXTRACT_CHARS) {
        return NextResponse.json(
          {
            error:
              `Zu wenig Text extrahiert (${text.length} Zeichen${usedOcr ? ' auch nach OCR' : ''}). ` +
              'Bitte bessere Scanqualität, höhere Auflösung oder eine durchsuchbare PDF verwenden.',
          },
          { status: 400 }
        );
      }

      // Titel aus erstem Teil extrahieren (M2 / Fachklausuren)
      const titleMatch =
        text.match(/(?:M2|2\.?\s*Staatsexamen|IMPP)[^\n]{0,60}/i) ||
        text.match(/Gedächtnisprotokoll[^\n]{0,40}/i) ||
        text.match(/Derma[^\n]*/i) ||
        text.match(/[A-ZÄÖÜ][a-zäöüß]+\s+WS\s+\d{2}-\d{2}/);
      const dateMatch =
        text.match(/\d{2}\.\d{2}\.\d{4}/) ||
        text.match(/(?:Frühjahr|Herbst|Sommer|Winter)\s*20\d{2}/i);

      return NextResponse.json({
        success: true,
        step: 'extract',
        text: text.substring(0, 50000), // Limit
        title: titleMatch?.[0]?.trim() || 'Unbekannte Klausur',
        date: dateMatch?.[0] || '',
        charCount: text.length,
        usedOcr: usedOcr || undefined,
      });
    }

    // Step 2: Fragen parsen
    if (step === 'parse') {
      const text = normalizePdfText((formData.get('text') as string) || '');
      if (!text) {
        return NextResponse.json({ error: 'Kein Text zum Parsen' }, { status: 400 });
      }
      if (text.length < MIN_EXTRACT_CHARS) {
        return NextResponse.json(
          {
            error:
              `Zu wenig Text zum Parsen (${text.length} Zeichen). ` +
              'Bitte erneut extrahieren oder eine bessere PDF verwenden.',
          },
          { status: 400 }
        );
      }

      const questions = await parseQuestionsWithLlm(text, llmConfig);
      
      return NextResponse.json({
        success: true,
        step: 'parse',
        questions,
        count: questions.length,
      });
    }

    // Step 3: Antworten bestimmen
    if (step === 'answer') {
      if (!questionsJson) {
        return NextResponse.json({ error: 'Keine Fragen zum Beantworten' }, { status: 400 });
      }
      
      const questions: ParsedQuestion[] = JSON.parse(questionsJson);
      const answered = await determineAnswersWithLlm(questions, llmConfig);
      
      return NextResponse.json({
        success: true,
        step: 'answer',
        questions: answered,
        count: answered.length,
      });
    }

    return NextResponse.json({ error: 'Ungültiger Step' }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('PDF Parse error:', e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
