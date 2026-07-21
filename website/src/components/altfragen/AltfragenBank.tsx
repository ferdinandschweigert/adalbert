'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AltfragenShell } from '@/components/altfragen/AltfragenShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ParsedQuestion, StoredExam } from '@/lib/altfragenTypes';
import {
  createExam,
  deleteExam,
  exportJson,
  importJson,
  listExams,
} from '@/lib/altfragenStore';
import {
  AlertCircle,
  Download,
  FileUp,
  Loader2,
  Play,
  Trash2,
  Upload,
} from 'lucide-react';

type ConvertStep = 'idle' | 'extracting' | 'parsing' | 'answering' | 'done';

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

async function convertTextToQuestions(
  text: string,
  onProgress: (step: ConvertStep, message: string) => void
): Promise<ParsedQuestion[]> {
  onProgress('parsing', 'Extrahiere Fragen aus dem Text…');
  const parseForm = new FormData();
  parseForm.append('step', 'parse');
  parseForm.append('text', text);
  const parseRes = await fetch('/api/mcp/parse-pdf', { method: 'POST', body: parseForm });
  const parseData = await parseRes.json();
  if (!parseRes.ok) throw new Error(parseData.error || 'Parsen fehlgeschlagen');

  onProgress('answering', `${parseData.count} Fragen gefunden. Bestimme Antworten…`);
  const answerForm = new FormData();
  answerForm.append('step', 'answer');
  answerForm.append('questions', JSON.stringify(parseData.questions));
  const answerRes = await fetch('/api/mcp/parse-pdf', { method: 'POST', body: answerForm });
  const answerData = await answerRes.json();
  if (!answerRes.ok) throw new Error(answerData.error || 'Antworten fehlgeschlagen');

  onProgress('done', `${answerData.count} Fragen bereit`);
  return (answerData.questions || []) as ParsedQuestion[];
}

export function AltfragenBank() {
  const [exams, setExams] = useState<StoredExam[]>([]);
  const [mounted, setMounted] = useState(false);
  const [title, setTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [convertStep, setConvertStep] = useState<ConvertStep>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<ParsedQuestion[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setExams(listExams());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  const resetConvert = () => {
    setConvertStep('idle');
    setProgressMsg('');
    setError(null);
    setPreviewQuestions(null);
  };

  const handleSavePreview = () => {
    if (!previewQuestions?.length) return;
    createExam({
      title: title.trim() || 'M2 Altfragen',
      sourceLabel: 'Gedächtnisprotokoll',
      questions: previewQuestions,
    });
    setTitle('');
    setPasteText('');
    resetConvert();
    refresh();
  };

  const handlePdfUpload = async (file: File) => {
    setError(null);
    setPreviewQuestions(null);
    setConvertStep('extracting');
    setProgressMsg('Extrahiere Text aus PDF…');
    if (!title.trim()) {
      setTitle(file.name.replace(/\.pdf$/i, ''));
    }

    try {
      const extractForm = new FormData();
      extractForm.append('file', file);
      extractForm.append('step', 'extract');
      const extractRes = await fetch('/api/mcp/parse-pdf', { method: 'POST', body: extractForm });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.error || 'Extraktion fehlgeschlagen');

      if (!title.trim() && extractData.title) {
        setTitle(extractData.title);
      }
      setProgressMsg(
        `${extractData.charCount} Zeichen extrahiert${extractData.usedOcr ? ' (OCR)' : ''}`
      );

      const questions = await convertTextToQuestions(extractData.text, (step, message) => {
        setConvertStep(step);
        setProgressMsg(message);
      });
      setPreviewQuestions(questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConvertStep('idle');
    }
  };

  const handlePasteConvert = async () => {
    const text = pasteText.trim();
    if (text.length < 50) {
      setError('Bitte mehr Text einfügen (Gedächtnisprotokoll).');
      return;
    }
    setError(null);
    setPreviewQuestions(null);
    try {
      const questions = await convertTextToQuestions(text, (step, message) => {
        setConvertStep(step);
        setProgressMsg(message);
      });
      setPreviewQuestions(questions);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConvertStep('idle');
    }
  };

  const handleExport = () => {
    const json = exportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `adalbert-altfragen-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const result = importJson(text);
      refresh();
      setProgressMsg(`${result.imported} Klausur(en) importiert`);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import fehlgeschlagen');
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Klausur wirklich löschen?')) return;
    deleteExam(id);
    refresh();
  };

  const busy = convertStep === 'extracting' || convertStep === 'parsing' || convertStep === 'answering';

  return (
    <AltfragenShell>
      <div className="mx-auto max-w-3xl space-y-8">
        <section className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-[#2C94CC]">
            2. Staatsexamen
          </p>
          <h2 className="text-2xl font-bold text-zinc-900 md:text-3xl">
            Alte Klausuren kreuzen
          </h2>
          <p className="max-w-2xl text-zinc-600">
            Lade ein Gedächtnisprotokoll (PDF oder Text) hoch. Adalbert wandelt es in
            anklickbare SC/MC/KPRIM-Fragen um – einmal konvertiert, jederzeit üben.
          </p>
        </section>

        <Card className="border-[#e2e8f0] shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Neue Klausur hochladen</CardTitle>
            <CardDescription>
              PDF-Gedächtnisprotokoll oder Text einfügen. Speichern legt die Fragen in
              deiner lokalen Klausurbank ab (dieser Browser).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700" htmlFor="exam-title">
                Titel
              </label>
              <input
                id="exam-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. M2 Frühjahr 2025"
                className="w-full rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm outline-none focus:border-[#002F5D] focus:ring-1 focus:ring-[#002F5D]"
                disabled={busy}
              />
            </div>

            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-[#c5d4e3] bg-[#f8fafc] px-4 py-8 text-center transition hover:border-[#002F5D]/50 hover:bg-[#eef5fb]/50"
              onClick={() => !busy && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (busy) return;
                const file = e.dataTransfer.files?.[0];
                if (file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf')) {
                  void handlePdfUpload(file);
                }
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handlePdfUpload(file);
                  e.target.value = '';
                }}
              />
              <Upload className="mx-auto mb-2 h-8 w-8 text-[#002F5D]/60" />
              <p className="text-sm font-medium text-zinc-800">PDF hier ablegen oder klicken</p>
              <p className="mt-1 text-xs text-zinc-500">Gedächtnisprotokoll als PDF</p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-700" htmlFor="paste-text">
                Oder Text einfügen
              </label>
              <textarea
                id="paste-text"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={6}
                placeholder="Gedächtnisprotokoll hier einfügen…"
                className="w-full rounded-md border border-[#e2e8f0] bg-white px-3 py-2 text-sm outline-none focus:border-[#002F5D] focus:ring-1 focus:ring-[#002F5D]"
                disabled={busy}
              />
              <Button
                type="button"
                className="mt-2"
                onClick={() => void handlePasteConvert()}
                disabled={busy || pasteText.trim().length < 50}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Konvertiere…
                  </>
                ) : (
                  'Text konvertieren'
                )}
              </Button>
            </div>

            {busy && (
              <div className="flex items-center gap-2 rounded-md bg-[#eef5fb] px-3 py-2 text-sm text-[#002F5D]">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                {progressMsg}
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {previewQuestions && previewQuestions.length > 0 && (
              <div className="space-y-3 rounded-lg border border-[#e2e8f0] bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-zinc-900">
                    {previewQuestions.length} Fragen bereit
                  </p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={resetConvert}>
                      Verwerfen
                    </Button>
                    <Button type="button" size="sm" onClick={handleSavePreview}>
                      In Klausurbank speichern
                    </Button>
                  </div>
                </div>
                <ul className="max-h-48 space-y-2 overflow-y-auto text-sm text-zinc-600">
                  {previewQuestions.slice(0, 8).map((q) => (
                    <li key={q.number} className="border-b border-zinc-100 pb-2 last:border-0">
                      <Badge variant="secondary" className="mr-2">
                        {q.type}
                      </Badge>
                      <span className="text-zinc-800">#{q.number}</span>{' '}
                      {q.question.slice(0, 100)}
                      {q.question.length > 100 ? '…' : ''}
                    </li>
                  ))}
                  {previewQuestions.length > 8 && (
                    <li className="text-zinc-400">… und {previewQuestions.length - 8} weitere</li>
                  )}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-semibold text-zinc-900">Deine Klausurbank</h3>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={!mounted || exams.length === 0}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                JSON exportieren
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => importInputRef.current?.click()}
              >
                <FileUp className="mr-1.5 h-3.5 w-3.5" />
                JSON importieren
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleImportFile(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>

          {!mounted ? (
            <p className="text-sm text-zinc-500">Lade Klausuren…</p>
          ) : exams.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#c5d4e3] bg-white/60 px-4 py-8 text-center text-sm text-zinc-500">
              Noch keine Klausuren gespeichert. Lade ein Gedächtnisprotokoll hoch.
            </p>
          ) : (
            <ul className="space-y-3">
              {exams.map((exam) => (
                <li
                  key={exam.id}
                  className="flex flex-col gap-3 rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-zinc-900">{exam.title}</p>
                    <p className="mt-0.5 text-sm text-zinc-500">
                      {exam.questions.length} Fragen
                      {exam.sourceLabel ? ` · ${exam.sourceLabel}` : ''}
                      {' · '}
                      {formatDate(exam.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link href={`/altfragen/${exam.id}`}>
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Kreuzen
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(exam.id)}
                      aria-label="Löschen"
                    >
                      <Trash2 className="h-4 w-4 text-zinc-500" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AltfragenShell>
  );
}
