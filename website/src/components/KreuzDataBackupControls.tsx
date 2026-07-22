'use client';

import { useRef, useState } from 'react';
import {
  downloadKreuzBackup,
  importKreuzData,
  type KreuzDataBackup,
} from '@/lib/altfragenLocalBackup';
import { Download, Upload } from 'lucide-react';

/**
 * Export/import Kreuzungsdaten so progress survives browser clears,
 * device switches, and the occasional exam-id rename.
 */
export function KreuzDataBackupControls({ examIds = [] }: { examIds?: string[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onExport = () => {
    try {
      downloadKreuzBackup(examIds);
      setError(null);
      setMessage('Backup heruntergeladen.');
    } catch (e) {
      setMessage(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const onImportFile = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as KreuzDataBackup;
      const result = importKreuzData(parsed);
      setError(null);
      setMessage(
        `Wiederhergestellt: ${result.restoredExams} Klausur-Fortschritt(e), ${result.restoredStats} Stats-Cache(s). Seite neu laden…`
      );
      window.setTimeout(() => window.location.reload(), 700);
    } catch (e) {
      setMessage(null);
      setError(e instanceof Error ? e.message : 'Import fehlgeschlagen');
    }
  };

  return (
    <div className="rounded-xl border border-[#e2e8f0] bg-[#f8fafc] px-4 py-4">
      <p className="text-sm font-medium text-zinc-800">Kreuzungsdaten sichern</p>
      <p className="mt-1 text-xs text-zinc-500">
        Fortschritt liegt lokal im Browser (ohne Login). Nach Cache-Löschen oder auf einer anderen
        Domain (z.&nbsp;B. adalbertanki) wirkt alles leer — Backup hilft.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-medium text-[#002F5D] hover:border-[#002F5D]/40"
        >
          <Download className="h-3.5 w-3.5" />
          Backup exportieren
        </button>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-md border border-[#e2e8f0] bg-white px-3 py-1.5 text-xs font-medium text-[#002F5D] hover:border-[#002F5D]/40"
        >
          <Upload className="h-3.5 w-3.5" />
          Backup importieren
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void onImportFile(file);
            e.target.value = '';
          }}
        />
      </div>
      {message && <p className="mt-2 text-xs text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
