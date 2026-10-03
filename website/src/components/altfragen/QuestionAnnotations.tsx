'use client';

import { useEffect, useRef, useState } from 'react';
import { emptyAnnotation, highlightSegments, readAnnotations, saveAnnotation, questionKey, type QuestionAnnotation } from '@/lib/altfragenReview';

function useAnnotation(examId: string, number: number): [QuestionAnnotation, (next: QuestionAnnotation) => void] {
  const [all, setAll] = useState<Record<string, QuestionAnnotation>>({});
  useEffect(() => {
    const refresh = () => setAll(readAnnotations());
    refresh();
    window.addEventListener('adalbert-annotations-changed', refresh);
    return () => window.removeEventListener('adalbert-annotations-changed', refresh);
  }, []);
  return [all[questionKey(examId, number)] || emptyAnnotation(), (next) => saveAnnotation(examId, number, next)];
}

export function QuestionAnnotations({ examId, number, text }: { examId: string; number: number; text: string }) {
  const [annotation, save] = useAnnotation(examId, number);
  const [pending, setPending] = useState<{ start: number; end: number } | null>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const capture = () => {
    const root = textRef.current;
    const selection = window.getSelection();
    if (!root || !selection?.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
    const before = range.cloneRange();
    before.selectNodeContents(root);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length;
    const end = start + range.toString().length;
    if (end > start) setPending({ start, end });
  };
  const segments = highlightSegments(text, annotation.highlights);
  return (
    <div className="space-y-3">
      <h2 className="text-base font-medium leading-relaxed text-zinc-900 md:text-lg">
        <span className="mr-2 text-[#002F5D]">#{number}</span>
        <span ref={textRef} onMouseUp={capture} onKeyUp={capture} onTouchEnd={capture}>
          {segments.map(({ start, end, marked }) => {
            return marked ? <mark key={start} className="bg-yellow-200">{text.slice(start, end)}</mark>
              : <span key={start}>{text.slice(start, end)}</span>;
          })}
        </span>
      </h2>
      <div className="flex flex-wrap gap-2 text-xs">
        {pending && <button type="button" className="rounded border border-amber-300 bg-amber-50 px-2 py-1" onClick={() => {
          save({ ...annotation, highlights: [...annotation.highlights, pending] });
          setPending(null);
          window.getSelection()?.removeAllRanges();
        }}>Auswahl markieren</button>}
        {annotation.highlights.length > 0 && <button type="button" className="rounded border px-2 py-1" onClick={() => save({ ...annotation, highlights: [] })}>Markierungen entfernen</button>}
        <button type="button" aria-pressed={annotation.starred} className="rounded border px-2 py-1" onClick={() => save({ ...annotation, starred: !annotation.starred })}>{annotation.starred ? '★ Vorgemerkt' : '☆ Vormerken'}</button>
        <button type="button" aria-pressed={annotation.uncertain} className="rounded border px-2 py-1" onClick={() => save({ ...annotation, uncertain: !annotation.uncertain })}>{annotation.uncertain ? '✓ Unsicher' : 'Unsicher markieren'}</button>
      </div>
    </div>
  );
}

export function QuestionThoughts({ examId, number }: { examId: string; number: number }) {
  const [annotation, save] = useAnnotation(examId, number);
  return <label className="block border-t border-zinc-100 pt-4 text-sm font-medium text-zinc-700">Deine Gedanken zu dieser Frage
    <textarea className="mt-2 w-full rounded-md border border-zinc-200 p-3 text-sm font-normal" rows={3} value={annotation.note} onChange={(e) => save({ ...annotation, note: e.target.value })} placeholder="Was möchtest du dir merken?" />
  </label>;
}

export function CrossOutButton({ examId, number, optionIndex }: { examId: string; number: number; optionIndex: number }) {
  const [annotation, save] = useAnnotation(examId, number);
  const crossed = annotation.crossedOut.includes(optionIndex);
  return <button type="button" aria-pressed={crossed} aria-label={`Antwort ${String.fromCharCode(65 + optionIndex)} ${crossed ? 'wiederherstellen' : 'durchstreichen'}`} title="Antwort unabhängig von der Auswahl durchstreichen" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border text-xl leading-none ${crossed ? 'border-sky-600 bg-sky-50 text-sky-700' : 'border-zinc-300 text-zinc-500 hover:border-sky-500 hover:text-sky-700'}`} onClick={() => save({ ...annotation, crossedOut: crossed ? annotation.crossedOut.filter((n) => n !== optionIndex) : [...annotation.crossedOut, optionIndex] })}>×</button>;
}

export function CrossedOption({ examId, number, optionIndex, children }: { examId: string; number: number; optionIndex: number; children: React.ReactNode }) {
  const [annotation] = useAnnotation(examId, number);
  return <span className={annotation.crossedOut.includes(optionIndex) ? 'line-through opacity-55' : ''}>{children}</span>;
}
