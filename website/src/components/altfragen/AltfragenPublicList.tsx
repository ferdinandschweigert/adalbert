'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AltfragenShell } from '@/components/altfragen/AltfragenShell';
import { Button } from '@/components/ui/button';
import type { ExamSummary } from '@/lib/altfragenTypes';
import { AlertCircle, ChevronDown, Loader2, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const FAQ_ITEMS: Array<{ q: string; a: string }> = [
  {
    q: 'Wie funktioniert Kreuzen?',
    a: 'Wähle eine Klausur, tippe Antworten an und springe über die Nummernleiste zwischen Fragen. Dein Fortschritt bleibt lokal im Browser gespeichert.',
  },
  {
    q: 'Was ist Lernen vs. Prüfung?',
    a: 'Im Lernmodus siehst du die Lösung direkt nach der Antwort. Im Prüfungsmodus bleiben Lösungen verborgen, bis du die Klausur abgibst — dann kommt die Auswertung.',
  },
  {
    q: 'Was bedeuten die Farben bei den Fragen?',
    a: 'Grün = richtig, Rot = falsch, Amber = beantwortet (Prüfungsmodus), Grau = noch offen. Die aktuelle Frage ist dunkelblau markiert.',
  },
  {
    q: 'Kann ich einzelne Fragen zurücksetzen?',
    a: 'Ja — unter der Frage gibt es „Frage“ zum Zurücksetzen nur dieser Antwort. „Neu starten“ löscht den gesamten Fortschritt der Klausur.',
  },
  {
    q: 'Woher kommen die Erklärungen?',
    a: 'Soweit hinterlegt, erscheinen nach dem Prüfen bzw. nach der Abgabe kurze Erklärungen und Option-Hinweise. Community-% zeigt, wie oft andere dieselbe Option gewählt haben.',
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold text-zinc-900">Kurz erklärt</h3>
        <p className="text-sm text-zinc-500">FAQ zum Übungs- und Prüfungsmodus</p>
      </div>
      <ul className="divide-y divide-[#e2e8f0] overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-sm">
        {FAQ_ITEMS.map((item, i) => {
          const isOpen = open === i;
          return (
            <li key={item.q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-[#f8fafc]"
                aria-expanded={isOpen}
              >
                <span className="text-sm font-medium text-zinc-800">{item.q}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 shrink-0 text-zinc-400 transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>
              {isOpen && (
                <p className="px-4 pb-3 text-sm leading-relaxed text-zinc-600">{item.a}</p>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function AltfragenPublicList() {
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/altfragen/exams', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Laden fehlgeschlagen');
      setExams(data.exams || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AltfragenShell>
      <div className="mx-auto max-w-3xl space-y-8">
        <section className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-wide text-[#2C94CC]">
            Übungsmodus
          </p>
          <h2 className="text-2xl font-bold text-zinc-900 md:text-3xl">
            Altfragen kreuzen
          </h2>
          <p className="max-w-2xl text-zinc-600">
            Wähle eine freigegebene Klausur und übe im Multiple-Choice-Format — ohne Login.
            Umschaltbar zwischen Lernmodus (Lösung sofort) und Prüfungsmodus (Lösung erst nach Abgabe).
          </p>
        </section>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Lade Klausuren…
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && exams.length === 0 && (
          <p className="rounded-lg border border-dashed border-[#c5d4e3] bg-white/60 px-4 py-10 text-center text-sm text-zinc-500">
            Noch keine freigegebenen Klausuren. Sobald im Admin-Bereich etwas veröffentlicht
            wurde, erscheint es hier zum Kreuzen.
          </p>
        )}

        {!loading && exams.length > 0 && (
          <ul className="space-y-3">
            {exams.map((exam) => (
              <li
                key={exam.id}
                className="flex flex-col gap-3 rounded-lg border border-[#e2e8f0] bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-900">{exam.title}</p>
                  <p className="mt-0.5 text-sm text-zinc-500">
                    {exam.questionCount} Fragen
                    {exam.sourceLabel ? ` · ${exam.sourceLabel}` : ''}
                    {' · '}
                    {formatDate(exam.updatedAt)}
                  </p>
                  {exam.description ? (
                    <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{exam.description}</p>
                  ) : null}
                </div>
                <Button type="button" size="sm" asChild>
                  <Link href={`/altfragen/${exam.id}`}>
                    <Play className="mr-1.5 h-3.5 w-3.5" />
                    Kreuzen
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}

        <FaqSection />
      </div>
    </AltfragenShell>
  );
}
