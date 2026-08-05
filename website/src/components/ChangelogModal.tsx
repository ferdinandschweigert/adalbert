'use client';

import { useEffect, useId, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { CHANGELOG_MONTHS } from '@/lib/changelog';

type ChangelogModalProps = {
  open: boolean;
  onClose: () => void;
};

/** Renders light markdown-ish **bold** and `code` spans in changelog bullets. */
function ChangelogText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-zinc-800">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <code
              key={i}
              className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-700"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export function ChangelogModal({ open, onClose }: ChangelogModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const frame = requestAnimationFrame(() => {
      panelRef.current?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Changelog schließen"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-[#e2e8f0] bg-white shadow-lg outline-none"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e2e8f0] px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-[#2C94CC]">
              Neuigkeiten
            </p>
            <h2
              id={titleId}
              className="truncate text-lg font-bold tracking-tight text-[#002F5D]"
            >
              Changelog
            </h2>
            <p className="mt-0.5 text-sm text-zinc-500">Wichtigste Änderungen nach Monat</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Schließen
          </Button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5">
          <div className="space-y-8">
            {CHANGELOG_MONTHS.map((month) => (
              <section key={month.id} className="space-y-3">
                <h3 className="text-base font-semibold text-[#002F5D]">{month.id}</h3>
                <div className="space-y-4">
                  {month.sections.map((section) => (
                    <div key={section.title}>
                      <h4 className="mb-1.5 text-sm font-medium text-zinc-800">
                        {section.title}
                      </h4>
                      <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed text-zinc-600">
                        {section.items.map((item) => (
                          <li key={item}>
                            <ChangelogText text={item} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <p className="mt-8 border-t border-[#e2e8f0] pt-4 text-xs text-zinc-400">
            Ältere Änderungen sind in den Commits nachvollziehbar.
          </p>
        </div>
      </div>
    </div>
  );
}
