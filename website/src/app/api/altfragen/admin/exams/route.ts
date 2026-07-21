import { NextRequest, NextResponse } from 'next/server';
import { adminUnauthorized, isAdminRequest } from '@/lib/altfragenAuth';
import {
  deleteExamById,
  listAllExams,
  loadBank,
  replaceBankExams,
  setExamPublished,
  upsertExam,
} from '@/lib/altfragenServerStore';
import type { ParsedQuestion, StoredExam } from '@/lib/altfragenTypes';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) return adminUnauthorized();
  try {
    const exams = await listAllExams();
    const { backend } = await loadBank();
    return NextResponse.json({ success: true, exams, backend });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) return adminUnauthorized();
  try {
    const body = (await request.json()) as {
      id?: string;
      title?: string;
      sourceLabel?: string;
      description?: string;
      published?: boolean;
      questions?: ParsedQuestion[];
      action?: 'upsert' | 'publish' | 'unpublish' | 'delete' | 'import';
      exams?: StoredExam[];
    };

    const action = body.action || 'upsert';

    if (action === 'import') {
      if (!Array.isArray(body.exams)) {
        return NextResponse.json({ error: 'exams-Array fehlt' }, { status: 400 });
      }
      const result = await replaceBankExams(body.exams);
      const exams = await listAllExams();
      return NextResponse.json({
        success: true,
        imported: result.count,
        backend: result.backend,
        exams,
      });
    }

    if (action === 'delete') {
      if (!body.id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
      const ok = await deleteExamById(body.id);
      if (!ok) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
      return NextResponse.json({ success: true });
    }

    if (action === 'publish' || action === 'unpublish') {
      if (!body.id) return NextResponse.json({ error: 'id fehlt' }, { status: 400 });
      const exam = await setExamPublished(body.id, action === 'publish');
      if (!exam) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
      return NextResponse.json({ success: true, exam });
    }

    if (!body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json(
        { error: 'title und questions sind erforderlich' },
        { status: 400 }
      );
    }

    const { exam, backend } = await upsertExam({
      id: body.id,
      title: body.title,
      sourceLabel: body.sourceLabel,
      description: body.description,
      published: body.published,
      questions: body.questions,
    });

    return NextResponse.json({ success: true, exam, backend });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
