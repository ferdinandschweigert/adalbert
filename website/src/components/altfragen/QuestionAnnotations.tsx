'use client';

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { annotationForQuestion, highlightSegments, readAnnotations, saveAnnotation, questionKey, type InlineNote, type QuestionAnnotation } from '@/lib/altfragenReview';
import { addHighlight, removeHighlight, updateInlineNote } from '@/lib/altfragenAnnotations';
import { displayHighlightRanges, displayText, displayTextWithOffsets } from '@/lib/altfragenText';

function useAnnotation(examId: string, number: number, roundId?: string): [QuestionAnnotation, (next: QuestionAnnotation) => void] {
  const [all, setAll] = useState<Record<string, QuestionAnnotation>>({});
  useEffect(() => {
    const refresh = () => setAll(readAnnotations());
    refresh();
    window.addEventListener('adalbert-annotations-changed', refresh);
    return () => window.removeEventListener('adalbert-annotations-changed', refresh);
  }, []);
  return [annotationForQuestion(all, examId, number, roundId), (next) => saveAnnotation(examId, number, next, roundId)];
}

export function QuestionAnnotations({ examId, number, text, roundId }: { examId: string; number: number; text: string; roundId?: string }) {
  const [annotation, save] = useAnnotation(examId, number, roundId);
  const [editor, setEditor] = useState<{ questionKey: string; note: InlineNote; left: number; top: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const selectionGesture = useRef(false);
  const touchSelection = useRef(false);
  const pointerDown = useRef(false);
  const decoded = useMemo(() => displayTextWithOffsets(text), [text]);
  const key = `${roundId || 'classic'}:${questionKey(examId, number)}`;
  const activeEditor = editor?.questionKey === key ? editor : null;
  const currentNote = activeEditor && (annotation.inlineNotes || []).find((note) => note.id === activeEditor.note.id);
  const capture = useCallback(() => {
    const root = textRef.current;
    const selection = window.getSelection();
    if (!root || !selection?.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return;
    const before = range.cloneRange();
    before.selectNodeContents(root);
    before.setEnd(range.startContainer, range.startOffset);
    const displayStart = before.toString().length;
    const displayEnd = displayStart + range.toString().length;
    const start = decoded.sourceOffsets[displayStart];
    const end = decoded.sourceOffsets[displayEnd];
    if (end > start) {
      selectionGesture.current = true;
      const latest = annotationForQuestion(readAnnotations(), examId, number, roundId);
      saveAnnotation(examId, number, { ...latest, highlights: addHighlight(latest.highlights, { start, end }) }, roundId);
      selection.removeAllRanges();
    }
  }, [decoded, examId, number, roundId]);

  useEffect(() => {
    let timer: number | undefined;
    const schedule = () => {
      if (!touchSelection.current || pointerDown.current) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(capture, 400);
    };
    const released = () => { pointerDown.current = false; schedule(); };
    document.addEventListener('selectionchange', schedule);
    document.addEventListener('pointerup', released);
    document.addEventListener('pointercancel', released);
    return () => { window.clearTimeout(timer); document.removeEventListener('selectionchange', schedule); document.removeEventListener('pointerup', released); document.removeEventListener('pointercancel', released); };
  }, [capture]);

  useEffect(() => {
    if (!activeEditor) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!editorRef.current?.contains(target) && !target.closest('[data-annotation-control]')) setEditor(null);
    };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setEditor(null); };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [activeEditor]);

  const displayHighlights = displayHighlightRanges(decoded, annotation.highlights);
  const inlineNotes = annotation.inlineNotes || [];
  const anchors = [
    ...annotation.highlights.filter((range, index, ranges) => ranges.findIndex((other) => other.start === range.start && other.end === range.end) === index && !inlineNotes.some((note) => note.start === range.start && note.end === range.end)).map((range) => ({ ...range, id: '', text: '' })),
    ...inlineNotes,
  ].flatMap((note) => {
    const displayed = displayHighlightRanges(decoded, [note])[0];
    return displayed ? [{ note, displayed }] : [];
  });
  const segments = highlightSegments(decoded.text, [...displayHighlights, ...anchors.map((anchor) => anchor.displayed)]);
  const openEditor = (note: InlineNote, button: HTMLButtonElement) => {
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) return;
    const anchor = button.getBoundingClientRect();
    setEditor({ questionKey: key, note: { ...note, id: note.id || crypto.randomUUID() }, left: Math.max(0, Math.min(anchor.left - container.left, container.width - 352)), top: anchor.bottom - container.top + 8 });
  };
  const remove = (start: number, end: number) => {
    const latest = annotationForQuestion(readAnnotations(), examId, number, roundId);
    saveAnnotation(examId, number, { ...latest, highlights: removeHighlight(latest.highlights, { start: decoded.sourceOffsets[start], end: decoded.sourceOffsets[end] }) }, roundId);
  };
  return (
    <div ref={containerRef} className="relative space-y-3">
      <h2 className="text-base font-medium leading-relaxed text-zinc-900 md:text-lg">
        <span className="mr-2 text-[#002F5D]">#{number}</span>
        <span ref={textRef} onPointerDown={(event) => { selectionGesture.current = false; touchSelection.current = event.pointerType === 'touch'; pointerDown.current = true; }} onMouseUp={() => { if (!touchSelection.current) capture(); }} onKeyUp={capture}>
          {segments.map(({ start, end }) => {
            const marked = displayHighlights.some((range) => range.start < end && range.end > start);
            const noted = anchors.some((anchor) => anchor.note.text && anchor.displayed.start < end && anchor.displayed.end > start);
            const fragment = decoded.text.slice(start, end);
            return <Fragment key={start}>
              {marked ? <mark role="button" tabIndex={0} aria-label={`Markierung entfernen: ${fragment}`} title="Klicken entfernt die Markierung; Anmerkungen bleiben erhalten" className="cursor-pointer rounded-sm bg-yellow-200 focus-visible:outline-2 focus-visible:outline-sky-700" onClick={() => { if (!selectionGesture.current) remove(start, end); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); remove(start, end); } }}>{fragment}</mark>
                : <span className={noted ? 'underline decoration-sky-300 decoration-dotted underline-offset-4' : undefined}>{fragment}</span>}
              {anchors.filter((anchor) => anchor.displayed.end === end).map(({ note, displayed }) => <button key={note.id || `${note.start}:${note.end}`} type="button" data-annotation-control aria-label={`${note.text ? 'Anmerkung bearbeiten' : 'Anmerkung hinzufügen'}: ${decoded.text.slice(displayed.start, displayed.end)}`} title={note.text || 'Anmerkung zu dieser Textstelle hinzufügen'} className={`mx-0.5 inline-flex h-6 w-6 select-none items-center justify-center rounded align-middle focus-visible:outline-2 focus-visible:outline-sky-700 ${note.text ? 'bg-sky-100 text-sky-800' : 'text-zinc-400 hover:bg-sky-50 hover:text-sky-800'}`} onClick={(event) => { event.stopPropagation(); openEditor(note, event.currentTarget); }}><MessageSquare className="h-3.5 w-3.5" aria-hidden /></button>)}
            </Fragment>;
          })}
        </span>
      </h2>
      <div className="flex flex-wrap gap-2 text-xs">
        {annotation.highlights.length > 0 && <button type="button" className="rounded border px-2 py-1" onClick={() => save({ ...annotation, highlights: [] })}>Markierungen entfernen</button>}
        <button type="button" aria-pressed={annotation.starred} className="rounded border px-2 py-1" onClick={() => save({ ...annotation, starred: !annotation.starred })}>{annotation.starred ? '★ Vorgemerkt' : '☆ Vormerken'}</button>
        <button type="button" aria-pressed={annotation.uncertain} className="rounded border px-2 py-1" onClick={() => save({ ...annotation, uncertain: !annotation.uncertain })}>{annotation.uncertain ? '✓ Unsicher' : 'Unsicher markieren'}</button>
      </div>
      <p className="text-xs text-zinc-500">Text auswählen markiert sofort. Markierung anklicken entfernt sie. Über die Sprechblase kannst du direkt eine Anmerkung hinzufügen.</p>
      {activeEditor && <div ref={editorRef} role="dialog" aria-label="Anmerkung zur Textstelle" className="absolute z-30 !mt-0 w-full max-w-sm space-y-3 rounded-xl border border-sky-200 bg-white p-4 shadow-xl" style={{ left: activeEditor.left, top: activeEditor.top }}>
        <div className="flex items-start justify-between gap-3"><strong className="text-sm text-sky-950">Anmerkung zur Textstelle</strong><button type="button" aria-label="Anmerkung schließen" className="rounded p-1 text-zinc-500 hover:bg-zinc-100" onClick={() => setEditor(null)}><X className="h-4 w-4" aria-hidden /></button></div>
        <blockquote className="max-h-24 overflow-auto border-l-2 border-yellow-300 pl-2 text-xs leading-relaxed text-zinc-600">{displayHighlightRanges(decoded, [activeEditor.note]).map((range) => decoded.text.slice(range.start, range.end))}</blockquote>
        <label className="block text-sm font-medium text-zinc-700">Deine Anmerkung<textarea autoFocus rows={3} className="mt-1 w-full rounded-md border border-slate-200 p-2 text-sm font-normal" placeholder="Was möchtest du dir zu dieser Stelle merken?" value={currentNote?.text || ''} onChange={(event) => { const latest = annotationForQuestion(readAnnotations(), examId, number, roundId); saveAnnotation(examId, number, updateInlineNote(latest, { ...activeEditor.note, text: event.target.value }), roundId); }} /></label>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="text-zinc-500">Wird automatisch gespeichert.</span>{currentNote && <button type="button" className="text-red-700 underline underline-offset-2" onClick={() => { const latest = annotationForQuestion(readAnnotations(), examId, number, roundId); saveAnnotation(examId, number, updateInlineNote(latest, { ...activeEditor.note, text: '' }), roundId); setEditor(null); }}>Anmerkung entfernen</button>}</div>
      </div>}
    </div>
  );
}

export function QuestionThoughts({ examId, number }: { examId: string; number: number }) {
  const [annotation, save] = useAnnotation(examId, number);
  return <label className="block border-t border-zinc-100 pt-4 text-sm font-medium text-zinc-700">Deine Gedanken zu dieser Frage
    <textarea className="mt-2 w-full rounded-md border border-zinc-200 p-3 text-sm font-normal" rows={3} value={annotation.note} onChange={(e) => save({ ...annotation, note: e.target.value })} placeholder="Was möchtest du dir merken?" />
  </label>;
}

export function CrossOutButton({ examId, number, optionIndex, integrated = false, roundId }: { examId: string; number: number; optionIndex: number; integrated?: boolean; roundId?: string }) {
  const [annotation, save] = useAnnotation(examId, number, roundId);
  const crossed = annotation.crossedOut.includes(optionIndex);
  return <button type="button" aria-pressed={crossed} aria-label={`Antwort ${String.fromCharCode(65 + optionIndex)} ${crossed ? 'wiederherstellen' : 'durchstreichen'}`} title="Antwort unabhängig von der Auswahl durchstreichen" className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xl leading-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 ${integrated ? 'absolute right-2 top-1/2 -translate-y-1/2 border border-transparent' : 'border'} ${crossed ? `${integrated ? '' : 'border-sky-600'} bg-sky-50 text-sky-700` : `${integrated ? '' : 'border-zinc-300'} text-zinc-500 hover:bg-sky-50 hover:text-sky-700`}`} onClick={() => save({ ...annotation, crossedOut: crossed ? annotation.crossedOut.filter((n) => n !== optionIndex) : [...annotation.crossedOut, optionIndex] })}>×</button>;
}

export function CrossedOption({ examId, number, optionIndex, children, roundId }: { examId: string; number: number; optionIndex: number; children: React.ReactNode; roundId?: string }) {
  const [annotation] = useAnnotation(examId, number, roundId);
  return <span className={annotation.crossedOut.includes(optionIndex) ? 'line-through opacity-55' : ''}>{typeof children === 'string' ? displayText(children) : children}</span>;
}
