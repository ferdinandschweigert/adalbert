import { NextRequest, NextResponse } from 'next/server';
import { accessUnauthorizedIfNeeded } from '@/lib/siteAccess';

export const runtime = 'nodejs';

interface ParsedQuestion {
  number: number;
  question: string;
  options: string[];
  type: 'SC' | 'MC' | 'KPRIM';
  correctAnswers?: string;
  explanation?: string;
}

const FIELD_SEPARATOR = '\x1f';
const MAX_OPTIONS = 5;
const FIELD_NAMES = [
  'Question',
  'QType (0=kprim,1=mc,2=sc)',
  'Q_1',
  'Q_2',
  'Q_3',
  'Q_4',
  'Q_5',
  'Answers',
  'Sources',
];

const FRONT_TEMPLATE = `
<div class="question">{{Question}}</div>
<div class="meta">Typ: {{QType (0=kprim,1=mc,2=sc)}}</div>
<ol class="options" type="A">
  {{#Q_1}}<li>{{Q_1}}</li>{{/Q_1}}
  {{#Q_2}}<li>{{Q_2}}</li>{{/Q_2}}
  {{#Q_3}}<li>{{Q_3}}</li>{{/Q_3}}
  {{#Q_4}}<li>{{Q_4}}</li>{{/Q_4}}
  {{#Q_5}}<li>{{Q_5}}</li>{{/Q_5}}
</ol>
`.trim();

const BACK_TEMPLATE = `
{{FrontSide}}

<hr id="answer">

<div class="answers"><strong>Antwortcode:</strong> {{Answers}}</div>
{{#Sources}}<div class="sources">{{Sources}}</div>{{/Sources}}
`.trim();

const CARD_CSS = `
.card {
  font-family: Arial, sans-serif;
  font-size: 16px;
  text-align: left;
  color: #111827;
  background-color: #ffffff;
}
.question {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 10px;
}
.meta {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
}
.options {
  margin: 0;
  padding-left: 1.2rem;
}
.options li {
  margin: 4px 0;
}
.answers {
  margin-top: 10px;
  padding: 8px;
  border: 1px solid #bbf7d0;
  background: #f0fdf4;
  border-radius: 6px;
}
.sources {
  margin-top: 10px;
  font-size: 12px;
  color: #374151;
}
`.trim();

function sanitizeField(value: string): string {
  return value.replace(/\u001f/g, ' ').trim();
}

function normalizeOptions(options: string[]): string[] {
  const normalized = options.map((opt) => sanitizeField(String(opt || '')));
  while (normalized.length < MAX_OPTIONS) normalized.push('');
  return normalized.slice(0, MAX_OPTIONS);
}

function normalizeAnswerBits(value: string | undefined, optionCount: number): string {
  const raw = (value || '').replace(/[^01]/g, '');
  return raw.padEnd(optionCount, '0').slice(0, optionCount);
}

function formatAnswerBits(bits: string): string {
  return bits.split('').join(' ');
}

function getQType(type: string): number {
  switch (type) {
    case 'KPRIM':
      return 0;
    case 'MC':
      return 1;
    case 'SC':
      return 2;
    default:
      return 2;
  }
}

function readColJson(db: { exec: (sql: string) => Array<{ values: unknown[] }> }, column: string) {
  const result = db.exec(`select ${column} from col where id=1`);
  if (!result.length || !result[0].values.length) return null;
  const raw = result[0].values[0];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== 'string') return null;
  return JSON.parse(value) as Record<string, unknown>;
}

function writeColJson(
  db: { prepare: (sql: string) => { getAsObject: (params: Record<string, unknown>) => void } },
  column: string,
  value: unknown
) {
  db.prepare(`update col set ${column}=:value where id=1`).getAsObject({
    ':value': JSON.stringify(value),
  });
}

function buildModel(baseModel: Record<string, unknown>, modelId: number, deckId: number, modelName: string) {
  const fields = FIELD_NAMES.map((name, ord) => ({
    name,
    media: [],
    sticky: false,
    rtl: false,
    ord,
    font: 'Arial',
    size: 20,
  }));

  return {
    ...baseModel,
    name: modelName,
    id: modelId,
    did: deckId,
    sortf: 0,
    req: [[0, 'all', [0]]],
    flds: fields,
    tmpls: [
      {
        name: 'Card 1',
        qfmt: FRONT_TEMPLATE,
        did: null,
        bafmt: '',
        afmt: BACK_TEMPLATE,
        ord: 0,
        bqfmt: '',
      },
    ],
    css: CARD_CSS,
  };
}

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(request: NextRequest) {
  const denied = accessUnauthorizedIfNeeded(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const deckName = String(body.deckName || '').trim();
    const questions: ParsedQuestion[] = Array.isArray(body.questions) ? body.questions : [];
    const modelName = String(body.modelName || deckName || 'MC_SC_KPRIM').trim();

    if (!deckName) {
      return NextResponse.json({ error: 'deckName ist erforderlich' }, { status: 400 });
    }
    if (!questions.length) {
      return NextResponse.json({ error: 'Keine Fragen zum Exportieren' }, { status: 400 });
    }

    const ankiModule = await import('anki-apkg-export');
    const AnkiExport = ankiModule.default || ankiModule;
    const apkg = new AnkiExport(deckName);
    const db = apkg.db;

    const models = readColJson(db, 'models') || {};
    const modelId = apkg.topModelId as number;
    const deckId = apkg.topDeckId as number;
    const modelKey = String(modelId);
    const baseModel =
      (models as Record<string, Record<string, unknown>>)[modelKey] ||
      (models as Record<string, Record<string, unknown>>)[Object.keys(models)[0]];

    if (!baseModel) {
      return NextResponse.json({ error: 'Konnte Model-Template nicht lesen' }, { status: 500 });
    }

    const updatedModel = buildModel(baseModel, modelId, deckId, modelName);
    (models as Record<string, Record<string, unknown>>)[modelKey] = updatedModel;
    writeColJson(db, 'models', models);

    const conf = readColJson(db, 'conf');
    if (conf && typeof conf === 'object') {
      (conf as Record<string, unknown>).curModel = String(modelId);
      writeColJson(db, 'conf', conf);
    }

    for (const question of questions) {
      const options = normalizeOptions(Array.isArray(question.options) ? question.options : []);
      const answerBits = normalizeAnswerBits(question.correctAnswers, MAX_OPTIONS);
      const answers = formatAnswerBits(answerBits);
      const qType = String(getQType(question.type));
      const explanation = question.explanation ? sanitizeField(question.explanation) : '';

      const fields = [
        sanitizeField(question.question || ''),
        qType,
        ...options,
        answers,
        explanation,
      ];

      const front = fields[0];
      const back = fields.slice(1).join(FIELD_SEPARATOR);
      const tags = ['pdf-import', question.type || 'SC'];
      apkg.addCard(front, back, { tags });
    }

    const zip = await apkg.save();
    const filename = `${sanitizeFileName(deckName || 'anki-export')}.apkg`;

    return new NextResponse(zip, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
