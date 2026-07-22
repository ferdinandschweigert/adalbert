'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AltfragenShell } from '@/components/altfragen/AltfragenShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ExamSummary, ParsedQuestion, StoredExam } from '@/lib/altfragenTypes';
import {
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Trash2,
  Upload,
} from 'lucide-react';

type ConvertStep = 'idle' | 'extracting' | 'parsing' | 'answering' | 'done';

const ADMIN_TOKEN_KEY = 'adalbert-altfragen-admin-token';

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

function letter(i: number) {
  return String.fromCharCode(65 + i);
}

export function AltfragenAdmin() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [adminToken, setAdminToken] = useState('');
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [backend, setBackend] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [sourceLabel, setSourceLabel] = useState('Gedächtnisprotokoll');
  const [description, setDescription] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [convertStep, setConvertStep] = useState<ConvertStep>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [draftQuestions, setDraftQuestions] = useState<ParsedQuestion[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIndex, setEditIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const adminHeaders = useCallback((): HeadersInit => {
    const token = adminToken || (typeof window !== 'undefined' ? sessionStorage.getItem(ADMIN_TOKEN_KEY) || '' : '');
    return {
      'Content-Type': 'application/json',
      'x-altfragen-admin': token,
    };
  }, [adminToken]);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/altfragen/admin/exams', {
      headers: adminHeaders(),
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Admin-Laden fehlgeschlagen');
    setExams(data.exams || []);
    setBackend(data.backend || '');
  }, [adminHeaders]);

  useEffect(() => {
    const token = sessionStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return;
    setAdminToken(token);
    setAuthed(true);
    void (async () => {
      try {
        await refresh();
      } catch {
        sessionStorage.removeItem(ADMIN_TOKEN_KEY);
        setAuthed(false);
        setAdminToken('');
      }
    })();
  }, [refresh]);

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/altfragen/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login fehlgeschlagen');
      const token = typeof data.token === 'string' ? data.token : '';
      if (!token) throw new Error('Kein Session-Token vom Server');
      sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
      setAdminToken(token);
      setAuthed(true);
      setPassword('');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    setAdminToken('');
    setAuthed(false);
    await fetch('/api/altfragen/admin/login', { method: 'DELETE' });
  };

  const busy =
    convertStep === 'extracting' || convertStep === 'parsing' || convertStep === 'answering';

  const handlePdfUpload = async (file: File) => {
    setError(null);
    setInfo(null);
    setDraftQuestions(null);
    setEditingId(null);
    setConvertStep('extracting');
    setProgressMsg('Extrahiere Text aus PDF…');
    if (!title.trim()) setTitle(file.name.replace(/\.pdf$/i, ''));

    try {
      const extractForm = new FormData();
      extractForm.append('file', file);
      extractForm.append('step', 'extract');
      const extractRes = await fetch('/api/mcp/parse-pdf', { method: 'POST', body: extractForm });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.error || 'Extraktion fehlgeschlagen');
      if (!title.trim() && extractData.title) setTitle(extractData.title);

      const questions = await convertTextToQuestions(extractData.text, (step, message) => {
        setConvertStep(step);
        setProgressMsg(message);
      });
      setDraftQuestions(questions);
      setEditIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConvertStep('idle');
    }
  };

  const handlePasteConvert = async () => {
    const text = pasteText.trim();
    if (text.length < 50) {
      setError('Bitte mehr Text einfügen.');
      return;
    }
    setError(null);
    setInfo(null);
    setDraftQuestions(null);
    setEditingId(null);
    try {
      const questions = await convertTextToQuestions(text, (step, message) => {
        setConvertStep(step);
        setProgressMsg(message);
      });
      setDraftQuestions(questions);
      setEditIndex(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setConvertStep('idle');
    }
  };

  const updateDraftQuestion = (index: number, patch: Partial<ParsedQuestion>) => {
    if (!draftQuestions) return;
    const next = [...draftQuestions];
    next[index] = { ...next[index], ...patch };
    setDraftQuestions(next);
  };

  const toggleCorrectBit = (qIndex: number, optIndex: number, exclusive: boolean) => {
    if (!draftQuestions) return;
    const q = draftQuestions[qIndex];
    const bits = (q.correctAnswers || '0'.repeat(q.options.length))
      .padEnd(q.options.length, '0')
      .slice(0, q.options.length)
      .split('');
    if (exclusive) {
      for (let i = 0; i < bits.length; i++) bits[i] = i === optIndex ? '1' : '0';
    } else {
      bits[optIndex] = bits[optIndex] === '1' ? '0' : '1';
    }
    updateDraftQuestion(qIndex, { correctAnswers: bits.join('') });
  };

  const handleSave = async (publish: boolean) => {
    if (!draftQuestions?.length) return;
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      const res = await fetch('/api/altfragen/admin/exams', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          action: 'upsert',
          id: editingId || undefined,
          title: title.trim() || 'Altfragen-Klausur',
          sourceLabel: sourceLabel.trim() || undefined,
          description: description.trim() || undefined,
          published: publish,
          questions: draftQuestions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Speichern fehlgeschlagen');
      setInfo(
        publish
          ? `Veröffentlicht (${data.backend}). Studierende können jetzt kreuzen.`
          : `Als Entwurf gespeichert (${data.backend}).`
      );
      setDraftQuestions(null);
      setPasteText('');
      setTitle('');
      setDescription('');
      setEditingId(null);
      setConvertStep('idle');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (exam: ExamSummary) => {
    setError(null);
    try {
      const res = await fetch('/api/altfragen/admin/exams', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          action: exam.published ? 'unpublish' : 'publish',
          id: exam.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Aktion fehlgeschlagen');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Klausur endgültig löschen?')) return;
    try {
      const res = await fetch('/api/altfragen/admin/exams', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ action: 'delete', id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Löschen fehlgeschlagen');
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const handleLoadForEdit = async (id: string) => {
    setError(null);
    try {
      const res = await fetch(`/api/altfragen/exams/${id}`, {
        headers: adminHeaders(),
        cache: 'no-store',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Laden fehlgeschlagen');
      const exam = data.exam as StoredExam;
      setEditingId(exam.id);
      setTitle(exam.title);
      setSourceLabel(exam.sourceLabel || '');
      setDescription(exam.description || '');
      setDraftQuestions(exam.questions);
      setEditIndex(0);
      setConvertStep('done');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  if (!authed) {
    return (
      <AltfragenShell subtitle="Admin">
        <div className="mx-auto max-w-md space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Admin-Login</CardTitle>
              <CardDescription>
                Hier lädst du Klausuren hoch, prüfst Lösungen und gibst sie zum Kreuzen frei.
                Öffentlich sehen Studierende nur freigegebene Klausuren.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void handleLogin();
                }}
                placeholder="Admin-Passwort"
                className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm outline-none focus:border-[#002F5D] focus:ring-1 focus:ring-[#002F5D]"
              />
              <Button type="button" className="w-full" onClick={() => void handleLogin()} disabled={loading || !password}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Anmelden
              </Button>
              {error && (
                <p className="text-sm text-red-700">{error}</p>
              )}
              <p className="text-xs text-zinc-500">
                Passwort über Server-Env <code>ALTFRAGEN_ADMIN_PASSWORD</code> (kein Default).
              </p>
              <Button type="button" variant="ghost" size="sm" asChild>
                <Link href="/altfragen">Zurück zum Kreuzen</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AltfragenShell>
    );
  }

  const current = draftQuestions?.[editIndex];

  return (
    <AltfragenShell subtitle="Admin">
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">Klausuren verwalten</h2>
            <p className="text-sm text-zinc-500">
              Speicher-Backend: <span className="font-medium text-zinc-700">{backend || '—'}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" asChild>
              <Link href="/altfragen">Zur Übungsseite</Link>
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => void handleLogout()}>
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Logout
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {info && (
          <div className="flex items-start gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{info}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingId ? 'Klausur bearbeiten' : 'Neu hochladen & konvertieren'}
            </CardTitle>
            <CardDescription>
              PDF oder Text (Gedächtnisprotokoll). Danach Lösungen prüfen und veröffentlichen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium" htmlFor="title">
                  Titel
                </label>
                <input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="z.B. M2 Frühjahr 2025"
                  className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm outline-none focus:border-[#002F5D] focus:ring-1 focus:ring-[#002F5D]"
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="source">
                  Quelle
                </label>
                <input
                  id="source"
                  value={sourceLabel}
                  onChange={(e) => setSourceLabel(e.target.value)}
                  className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm outline-none focus:border-[#002F5D] focus:ring-1 focus:ring-[#002F5D]"
                  disabled={busy}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="desc">
                  Kurzbeschreibung
                </label>
                <input
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="optional"
                  className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm outline-none focus:border-[#002F5D] focus:ring-1 focus:ring-[#002F5D]"
                  disabled={busy}
                />
              </div>
            </div>

            <div
              className="cursor-pointer rounded-lg border-2 border-dashed border-[#c5d4e3] bg-[#f8fafc] px-4 py-8 text-center hover:border-[#002F5D]/50"
              onClick={() => !busy && fileInputRef.current?.click()}
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
              <p className="text-sm font-medium">PDF hochladen</p>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="paste">
                Oder Text einfügen
              </label>
              <textarea
                id="paste"
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                rows={5}
                className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm outline-none focus:border-[#002F5D] focus:ring-1 focus:ring-[#002F5D]"
                disabled={busy}
              />
              <Button
                type="button"
                className="mt-2"
                onClick={() => void handlePasteConvert()}
                disabled={busy || pasteText.trim().length < 50}
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Text konvertieren
              </Button>
            </div>

            {busy && (
              <div className="flex items-center gap-2 text-sm text-[#002F5D]">
                <Loader2 className="h-4 w-4 animate-spin" />
                {progressMsg}
              </div>
            )}
          </CardContent>
        </Card>

        {draftQuestions && current && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Fragen prüfen</CardTitle>
              <CardDescription>
                Frage {editIndex + 1} / {draftQuestions.length} — Lösung anklicken zum Korrigieren
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={editIndex === 0}
                  onClick={() => setEditIndex((i) => i - 1)}
                >
                  Zurück
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={editIndex >= draftQuestions.length - 1}
                  onClick={() => setEditIndex((i) => i + 1)}
                >
                  Weiter
                </Button>
                <Badge variant="secondary">{current.type}</Badge>
              </div>

              <textarea
                value={current.question}
                onChange={(e) => updateDraftQuestion(editIndex, { question: e.target.value })}
                rows={4}
                className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm outline-none focus:border-[#002F5D] focus:ring-1 focus:ring-[#002F5D]"
              />

              <ul className="space-y-2">
                {current.options.map((opt, oi) => {
                  const bits = (current.correctAnswers || '').padEnd(current.options.length, '0');
                  const selected = bits[oi] === '1';
                  return (
                    <li key={oi} className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCorrectBit(editIndex, oi, current.type === 'SC')}
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                          selected ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600'
                        }`}
                        title="Als richtig markieren"
                      >
                        {letter(oi)}
                      </button>
                      <input
                        value={opt}
                        onChange={(e) => {
                          const options = [...current.options];
                          options[oi] = e.target.value;
                          updateDraftQuestion(editIndex, { options });
                        }}
                        className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm outline-none focus:border-[#002F5D] focus:ring-1 focus:ring-[#002F5D]"
                      />
                    </li>
                  );
                })}
              </ul>

              <textarea
                value={current.explanation || ''}
                onChange={(e) => updateDraftQuestion(editIndex, { explanation: e.target.value })}
                rows={3}
                placeholder="Erklärung (optional)"
                className="w-full rounded-md border border-[#e2e8f0] px-3 py-2 text-sm outline-none focus:border-[#002F5D] focus:ring-1 focus:ring-[#002F5D]"
              />

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void handleSave(false)} disabled={loading}>
                  Entwurf speichern
                </Button>
                <Button type="button" onClick={() => void handleSave(true)} disabled={loading}>
                  Speichern & veröffentlichen
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setDraftQuestions(null);
                    setEditingId(null);
                    setConvertStep('idle');
                  }}
                >
                  Verwerfen
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Alle Klausuren</h3>
          {exams.length === 0 ? (
            <p className="text-sm text-zinc-500">Noch keine Klausuren in der Bank.</p>
          ) : (
            <ul className="space-y-2">
              {exams.map((exam) => (
                <li
                  key={exam.id}
                  className="flex flex-col gap-2 rounded-lg border border-[#e2e8f0] bg-white p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-zinc-900">
                      {exam.title}{' '}
                      <Badge variant={exam.published ? 'default' : 'secondary'} className="ml-1">
                        {exam.published ? 'Live' : 'Entwurf'}
                      </Badge>
                    </p>
                    <p className="text-xs text-zinc-500">{exam.questionCount} Fragen</p>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => void handleLoadForEdit(exam.id)}>
                      Bearbeiten
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => void handleTogglePublish(exam)}>
                      {exam.published ? (
                        <>
                          <EyeOff className="mr-1 h-3.5 w-3.5" /> Verbergen
                        </>
                      ) : (
                        <>
                          <Eye className="mr-1 h-3.5 w-3.5" /> Freigeben
                        </>
                      )}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => void handleDelete(exam.id)}>
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
