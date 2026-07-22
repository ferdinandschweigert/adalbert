'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  FileText,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Download,
  Target,
  Upload,
  FileUp,
  Copy
} from 'lucide-react';

interface Deck {
  name: string;
  cardCount?: number;
}

interface AnkiCard {
  front: string;
  back: string;
  question: string;
  options: string[];
  answers: string;
  qType: number;
}

interface BewertungsEintrag {
  aussage: string;
  bewertung: 'Richtig' | 'Falsch' | 'Yes' | 'No';
  begründung: string;
}

interface EnrichedCard {
  front: string;
  back: string;
  options?: string[];
  originalAnswers?: string;
  lösung: string;
  erklärung: string;
  bewertungsTabelle?: BewertungsEintrag[];
  zusammenfassung?: string;
  eselsbrücke: string;
  referenz: string;
  extra1?: string;
}

interface PrioritySuggestion {
  id: string;
  rank: number;
  front: string;
  topic?: string;
  reason?: string;
  learningGoals?: string[];
}

interface ParsedQuestion {
  number: number;
  question: string;
  options: string[];
  type: 'SC' | 'MC' | 'KPRIM';
  correctAnswers?: string;
  explanation?: string;
}

type LlmProvider = 'gemini' | 'together' | 'openai' | 'openai-compatible';
type LlmProfile = 'speed' | 'balanced' | 'quality';

const LLM_PROFILES: Array<{ value: LlmProfile; label: string; hint: string }> = [
  { value: 'speed', label: 'Schnell', hint: 'Schnellste Antwort, geringere Detailtiefe' },
  { value: 'balanced', label: 'Ausgewogen', hint: 'Guter Mittelweg zwischen Tempo und Qualität' },
  { value: 'quality', label: 'Qualität', hint: 'Beste Erklärungen, langsamer/teurer' },
];

const LLM_PROVIDERS: Array<{ value: LlmProvider; label: string; note?: string }> = [
  { value: 'gemini', label: 'Gemini' },
  { value: 'together', label: 'TogetherAI' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'openai-compatible', label: 'OpenAI-kompatibel', note: 'Base URL via .env' },
];

const MODEL_PRESETS: Record<LlmProvider, Record<LlmProfile, string>> = {
  gemini: {
    speed: 'gemini-1.5-flash',
    balanced: 'gemini-2.5-flash',
    quality: 'gemini-2.5-pro',
  },
  together: {
    speed: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
    balanced: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    quality: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
  },
  openai: {
    speed: 'gpt-4o-mini',
    balanced: 'gpt-4o',
    quality: 'gpt-4o',
  },
  'openai-compatible': {
    speed: 'gpt-4o-mini',
    balanced: 'gpt-4o',
    quality: 'gpt-4o',
  },
};

export default function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string>('');
  const [cards, setCards] = useState<AnkiCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isHosted, setIsHosted] = useState<boolean | null>(null);

  // Anreicherung
  const [enrichLimit, setEnrichLimit] = useState(100);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState<{ done: number; total: number } | null>(null);
  const [enrichedCards, setEnrichedCards] = useState<EnrichedCard[]>([]);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [llmProvider, setLlmProvider] = useState<LlmProvider>('together');
  const [llmProfile, setLlmProfile] = useState<LlmProfile>('balanced');
  const [llmModelOverride, setLlmModelOverride] = useState('');
  const [syncTargetDeck, setSyncTargetDeck] = useState('');
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [prioritySuggestions, setPrioritySuggestions] = useState<PrioritySuggestion[]>([]);
  const [priorityLoading, setPriorityLoading] = useState(false);
  const [priorityError, setPriorityError] = useState<string | null>(null);
  const [priorityLimit, setPriorityLimit] = useState(300);
  const [priorityMeta, setPriorityMeta] = useState<{ considered: number; method: string } | null>(null);
  const priorityTopN = 15;
  const selectedProviderNote = LLM_PROVIDERS.find((provider) => provider.value === llmProvider)?.note;
  const selectedProfileHint = LLM_PROFILES.find((profile) => profile.value === llmProfile)?.hint;
  const presetModel = MODEL_PRESETS[llmProvider][llmProfile];

  // Resume-Funktionalität: Fortschritt im localStorage speichern
  const getStorageKey = (deck: string) => `enrichment_${deck.replace(/[^a-zA-Z0-9]/g, '_')}`;
  
  const saveProgress = (deck: string, cards: EnrichedCard[]) => {
    try {
      localStorage.setItem(getStorageKey(deck), JSON.stringify({ cards, timestamp: Date.now() }));
    } catch (e) {
      console.warn('Could not save progress to localStorage', e);
    }
  };
  
  const loadProgress = (deck: string): { cards: EnrichedCard[]; timestamp: number } | null => {
    try {
      const data = localStorage.getItem(getStorageKey(deck));
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      return null;
    }
  };
  
  const clearProgress = (deck: string) => {
    try {
      localStorage.removeItem(getStorageKey(deck));
    } catch (e) {
      console.warn('Could not clear progress', e);
    }
  };
  
  const [savedProgress, setSavedProgress] = useState<{ cards: EnrichedCard[]; timestamp: number } | null>(null);

  // PDF Import State
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfText, setPdfText] = useState<string>('');
  const [pdfTitle, setPdfTitle] = useState<string>('');
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [pdfStep, setPdfStep] = useState<'upload' | 'parsing' | 'answering' | 'preview' | 'importing' | 'exporting'>('upload');
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfProgress, setPdfProgress] = useState<string>('');
  const [importDeckName, setImportDeckName] = useState<string>('');
  const [pdfUsedOcr, setPdfUsedOcr] = useState(false);
  const [pdfCopySuccess, setPdfCopySuccess] = useState(false);

  const loadDecks = async () => {
    if (isHosted) return;
    setLoading(true);
    setError(null);
    setStatus('Lade Decks...');
    try {
      const response = await fetch('/api/mcp/list-decks');
      const data = await response.json();
      if (data.success) {
        setDecks(data.decks.map((name: string) => ({ name })));
        setStatus(`${data.decks.length} Decks geladen`);
      } else {
        throw new Error(data.error || 'Failed to load decks');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Decks');
      setStatus('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  const loadCards = async (deckName: string) => {
    if (!deckName || isHosted) return;
    setLoading(true);
    setError(null);
    setStatus(`Lade Karten aus "${deckName}"...`);
    try {
      const response = await fetch('/api/mcp/get-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckName }),
      });
      const data = await response.json();
      if (data.success) {
        setCards(data.cards || []);
        setStatus(`${data.count || 0} Karten geladen`);
      } else {
        throw new Error(data.error || 'Failed to load cards');
      }
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden der Karten');
      setStatus('Fehler beim Laden');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const host = window.location.hostname;
    const isLocal =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1';
    setIsHosted(!isLocal);
  }, []);

  useEffect(() => {
    if (isHosted === null) return;
    if (isHosted) {
      setError(null);
      setStatus('AnkiConnect nur lokal verfügbar');
      return;
    }
    loadDecks();
  }, [isHosted]);

  useEffect(() => {
    if (isHosted || !selectedDeck) {
      return;
    }
    loadCards(selectedDeck);
  }, [isHosted, selectedDeck]);

  useEffect(() => {
    if (selectedDeck) {
      setSyncTargetDeck(`${selectedDeck} (angereichert)`);
      // Gespeicherten Fortschritt laden
      const progress = loadProgress(selectedDeck);
      setSavedProgress(progress);
      if (progress && progress.cards.length > 0) {
        setEnrichedCards(progress.cards);
      } else {
        setEnrichedCards([]);
      }
    } else {
      setSavedProgress(null);
      setEnrichedCards([]);
    }
    setPrioritySuggestions([]);
    setPriorityMeta(null);
    setPriorityError(null);
  }, [selectedDeck]);

  const runEnrich = async (startFresh = false) => {
    if (!selectedDeck || isHosted) return;
    setEnriching(true);
    setEnrichError(null);
    
    // Bei Neustart oder ohne gespeicherte Daten: von vorne
    let all: EnrichedCard[] = [];
    let offset = 0;
    
    if (!startFresh && savedProgress && savedProgress.cards.length > 0) {
      // Fortsetzen: bereits angereicherte Karten übernehmen
      all = [...savedProgress.cards];
      offset = all.length;
      setEnrichProgress({ done: offset, total: enrichLimit });
    } else {
      // Neustart
      clearProgress(selectedDeck);
      setEnrichedCards([]);
      setEnrichProgress({ done: 0, total: enrichLimit });
    }
    
    const resolvedModel = llmModelOverride.trim() || presetModel;
    try {
      for (;;) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 180000); // 3 Min. Timeout pro Batch
        
        let res: Response;
        try {
          res = await fetch('/api/mcp/enrich-cards', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deckName: selectedDeck,
              limit: enrichLimit,
              offset,
              provider: llmProvider,
              model: resolvedModel,
            }),
            signal: controller.signal,
          });
        } catch (fetchError: unknown) {
          clearTimeout(timeoutId);
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            throw new Error('Timeout: Der Batch hat zu lange gedauert (>3 Min.). Bitte erneut versuchen.');
          }
          throw new Error(`Netzwerkfehler: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`);
        }
        clearTimeout(timeoutId);
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(errorData.error || `HTTP ${res.status}: ${res.statusText}`);
        }
        
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Enrichment fehlgeschlagen');
        
        all = all.concat(data.enriched || []);
        setEnrichedCards(all);
        
        // Fortschritt speichern nach jedem Batch
        saveProgress(selectedDeck, all);
        setEnrichProgress({ done: data.nextOffset ?? offset + (data.enriched?.length || 0), total: data.total ?? enrichLimit });
        if (!data.hasMore) break;
        offset = data.nextOffset;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setEnrichError(msg + ' – Fortschritt gespeichert, du kannst fortsetzen.');
      console.error('Enrichment error:', e);
      // Bei Fehler trotzdem speichern was wir haben
      if (all.length > 0) {
        saveProgress(selectedDeck, all);
        setSavedProgress({ cards: all, timestamp: Date.now() });
      }
    } finally {
      setEnriching(false);
      setEnrichProgress(null);
      // savedProgress aktualisieren
      const progress = loadProgress(selectedDeck);
      setSavedProgress(progress);
    }
  };

  const runSync = async () => {
    if (!selectedDeck || enrichedCards.length === 0) return;
    setSyncLoading(true);
    setSyncError(null);
    try {
      const res = await fetch('/api/mcp/sync-to-anki', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckName: selectedDeck, cards: enrichedCards }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Sync fehlgeschlagen');
      // Erfolg anzeigen
      setSyncError(null);
      alert(data.message || `${data.updated} Karten aktualisiert`);
    } catch (e: unknown) {
      setSyncError(e instanceof Error ? e.message : String(e));
    } finally {
      setSyncLoading(false);
    }
  };

  const runPrioritize = async () => {
    if (!selectedDeck || isHosted) return;
    setPriorityLoading(true);
    setPriorityError(null);
    setPrioritySuggestions([]);
    setPriorityMeta(null);
    const resolvedModel = llmModelOverride.trim() || presetModel;
    try {
      const res = await fetch('/api/mcp/prioritize-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckName: selectedDeck,
          limit: priorityLimit,
          topN: priorityTopN,
          provider: llmProvider,
          model: resolvedModel,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Priorisierung fehlgeschlagen');
      }
      if (data.warning) {
        setPriorityError(data.warning);
      }
      setPrioritySuggestions(data.priorities || []);
      setPriorityMeta({
        considered: data.considered || 0,
        method: data.method || 'llm',
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setPriorityError(msg);
    } finally {
      setPriorityLoading(false);
    }
  };

  // PDF Import Funktionen
  const handlePdfUpload = async (file: File) => {
    setPdfFile(file);
    setPdfError(null);
    setPdfStep('parsing');
    setPdfProgress('Extrahiere Text aus PDF...');
    
    const resolvedModel = llmModelOverride.trim() || presetModel;
    
    try {
      // Step 1: Text extrahieren
      const formData = new FormData();
      formData.append('file', file);
      formData.append('provider', llmProvider);
      formData.append('model', resolvedModel);
      formData.append('step', 'extract');
      
      const extractRes = await fetch('/api/mcp/parse-pdf', {
        method: 'POST',
        body: formData,
      });
      const extractData = await extractRes.json();
      if (!extractRes.ok) throw new Error(extractData.error);
      
      setPdfText(extractData.text);
      setPdfTitle(extractData.title || file.name.replace(/\.pdf$/i, ''));
      setPdfUsedOcr(extractData.usedOcr === true);
      setImportDeckName(''); // Kein Bezug zu Originaldaten – Nutzer wählt selbst
      setPdfProgress(`${extractData.charCount} Zeichen extrahiert${extractData.usedOcr ? ' (OCR)' : ''}. Parse Fragen...`);
      
      // Step 2: Fragen parsen
      const parseFormData = new FormData();
      parseFormData.append('provider', llmProvider);
      parseFormData.append('model', resolvedModel);
      parseFormData.append('step', 'parse');
      parseFormData.append('text', extractData.text);
      
      const parseRes = await fetch('/api/mcp/parse-pdf', {
        method: 'POST',
        body: parseFormData,
      });
      const parseData = await parseRes.json();
      if (!parseRes.ok) throw new Error(parseData.error);
      
      setParsedQuestions(parseData.questions || []);
      setPdfProgress(`${parseData.count} Fragen gefunden. Bestimme Antworten...`);
      setPdfStep('answering');
      
      // Step 3: Antworten bestimmen
      const answerFormData = new FormData();
      answerFormData.append('provider', llmProvider);
      answerFormData.append('model', resolvedModel);
      answerFormData.append('step', 'answer');
      answerFormData.append('questions', JSON.stringify(parseData.questions));
      
      const answerRes = await fetch('/api/mcp/parse-pdf', {
        method: 'POST',
        body: answerFormData,
      });
      const answerData = await answerRes.json();
      if (!answerRes.ok) throw new Error(answerData.error);
      
      setParsedQuestions(answerData.questions || []);
      setPdfProgress(`${answerData.count} Fragen mit Antworten bereit`);
      setPdfStep('preview');
      
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : String(e));
      setPdfStep('upload');
    }
  };

  const handleImportToAnki = async () => {
    if (!importDeckName.trim() || parsedQuestions.length === 0) return;
    
    setPdfStep('importing');
    setPdfProgress('Importiere nach Anki...');
    setPdfError(null);
    
    try {
      const res = await fetch('/api/mcp/import-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckName: importDeckName.trim(),
          questions: parsedQuestions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setPdfProgress(data.message);
      alert(data.message);
      
      // Reset
      setPdfStep('upload');
      setPdfFile(null);
      setParsedQuestions([]);
      loadDecks(); // Refresh decks
      
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : String(e));
      setPdfStep('preview');
    }
  };

  const handleExportApkg = async () => {
    if (parsedQuestions.length === 0) return;

    const deckName = importDeckName.trim() || pdfTitle || 'PDF Import';
    setPdfStep('exporting');
    setPdfProgress('Erstelle .apkg...');
    setPdfError(null);

    try {
      const res = await fetch('/api/mcp/export-apkg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deckName,
          questions: parsedQuestions,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Export fehlgeschlagen (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const fileName = deckName.replace(/[^a-zA-Z0-9._-]/g, '_') + '.apkg';
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      setPdfProgress(`APKG exportiert: ${fileName}`);
      setPdfStep('preview');
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : String(e));
      setPdfStep('preview');
    }
  };

  const resetPdfImport = () => {
    setPdfFile(null);
    setPdfText('');
    setPdfTitle('');
    setPdfUsedOcr(false);
    setParsedQuestions([]);
    setPdfStep('upload');
    setPdfError(null);
    setPdfProgress('');
  };

  const copyPdfText = () => {
    navigator.clipboard.writeText(pdfText).then(
      () => { setPdfCopySuccess(true); setTimeout(() => setPdfCopySuccess(false), 2000); },
      () => {}
    );
  };

  const downloadPdfText = () => {
    const blob = new Blob([pdfText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (pdfTitle || 'extrahiert').replace(/[^a-zA-Z0-9äöüÄÖÜß._-]/g, '_') + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-[#002F5D]" />
                Anki Dashboard
              </CardTitle>
              <CardDescription>
                Verbinde dich mit Anki Desktop und verwalte deine Decks
              </CardDescription>
            </div>
            <Button 
              onClick={loadDecks} 
              variant="outline" 
              size="sm"
              disabled={loading || isHosted === true}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Aktualisieren
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {isHosted && (
            <div className="mb-4 p-3 bg-[#eef5fb] border border-[#2C94CC]/40 rounded-lg flex items-center gap-2 text-[#002F5D]">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="text-sm">
                Anki läuft nur lokal (Anki Desktop + AnkiConnect). Auf diesem Host sind Anreicherung,
                Sync und PDF-Import deaktiviert — starte die Website mit{' '}
                <code className="rounded bg-white/70 px-1">npm run dev</code> auf deinem Rechner.
              </span>
            </div>
          )}
          
          {status && (
            <div className="mb-4 p-3 bg-[#eef5fb] border border-[#2C94CC]/40 rounded-lg flex items-center gap-2 text-[#002F5D]">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">{status}</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">
                Deck auswählen:
              </label>
              <select
                value={selectedDeck}
                onChange={(e) => setSelectedDeck(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002F5D]"
                disabled={loading || decks.length === 0 || isHosted === true}
              >
                <option value="">-- Deck auswählen --</option>
                {decks.map((deck) => (
                  <option key={deck.name} value={deck.name}>
                    {deck.name}
                  </option>
                ))}
              </select>
            </div>

            {decks.length === 0 && !loading && !isHosted && (
              <div className="text-center py-8 text-zinc-500">
                <p>Keine Decks gefunden.</p>
                <p className="text-sm mt-2">
                  Stelle sicher, dass Anki Desktop läuft und AnkiConnect installiert ist.
                </p>
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[#002F5D]" />
                <span className="ml-2 text-zinc-600">Lade...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Anreicherung */}
      {!isHosted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#002F5D]" />
              Karten anreichern
            </CardTitle>
            <CardDescription>
              KI-Erklärungen, Eselsbrücken und Referenzen generieren. Wähle Provider und Profil für Tempo/Qualität. Pro Batch 5 Karten, ~1–2 Min. pro Batch.
              <br />
              <span className="text-xs text-[#002F5D]/80 mt-1 block">
                ⚠️ Limits hängen vom Provider/Plan ab. Bei Quota/Ratelimit bitte später erneut versuchen oder Provider/Key wechseln.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {enrichError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-red-700">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium mb-1">{enrichError}</p>
                  {enrichError.includes('quota') || enrichError.includes('429') || enrichError.includes('limit') ? (
                    <p className="text-xs text-red-600 mt-1">
                      💡 Tipp: Provider-Quota erreicht. Bitte später erneut versuchen oder einen anderen Provider/Key nutzen.
                    </p>
                  ) : null}
                </div>
              </div>
            )}

            {/* Fortschritt: sofort sichtbar, sobald Anreicherung läuft */}
            {enriching && enrichProgress && (
              <div className="p-4 bg-[#eef5fb] border-2 border-[#2C94CC]/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-6 w-6 animate-spin text-[#002F5D] flex-shrink-0" />
                  <div>
                    <p className="font-medium text-[#002F5D]">Anreicherung läuft</p>
                    <p className="text-[#002F5D]/90 text-sm mt-0.5">
                      Fortschritt: <strong>{enrichProgress.done} von {enrichProgress.total}</strong> Karten
                    </p>
                    {enrichProgress.done === 0 ? (
                      <p className="text-[#002F5D]/80 text-sm mt-1">
                        Der erste Batch (5 Karten) kann 1–2 Minuten dauern. Bitte warten…
                      </p>
                    ) : (
                      <p className="text-[#002F5D]/80 text-sm mt-1">Nächster Batch wird verarbeitet…</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">LLM-Provider</label>
                <select
                  value={llmProvider}
                  onChange={(e) => setLlmProvider(e.target.value as LlmProvider)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002F5D]"
                  disabled={enriching}
                >
                  {LLM_PROVIDERS.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
                {selectedProviderNote && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {selectedProviderNote}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Qualitätsprofil</label>
                <select
                  value={llmProfile}
                  onChange={(e) => setLlmProfile(e.target.value as LlmProfile)}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002F5D]"
                  disabled={enriching}
                >
                  {LLM_PROFILES.map((profile) => (
                    <option key={profile.value} value={profile.value}>
                      {profile.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  {selectedProfileHint}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Modell (optional)</label>
                <input
                  type="text"
                  value={llmModelOverride}
                  onChange={(e) => setLlmModelOverride(e.target.value)}
                  placeholder={presetModel}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002F5D]"
                  disabled={enriching}
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Empfohlen: {presetModel}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Anzahl Karten (Max.)</label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={enrichLimit}
                  onChange={(e) => setEnrichLimit(Math.max(1, Math.min(500, parseInt(e.target.value, 10) || 1)))}
                  className="w-24 px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002F5D]"
                  disabled={enriching}
                />
              </div>
              
              {/* Resume-Buttons wenn Fortschritt vorhanden */}
              {savedProgress && savedProgress.cards.length > 0 && !enriching ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => runEnrich(false)}
                    disabled={enriching || !selectedDeck}
                  >
                    Fortsetzen ({savedProgress.cards.length} fertig)
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      clearProgress(selectedDeck);
                      setSavedProgress(null);
                      setEnrichedCards([]);
                    }}
                    disabled={enriching}
                  >
                    Neu starten
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => runEnrich(true)}
                  disabled={enriching || !selectedDeck || decks.length === 0}
                >
                  {enriching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {enrichProgress ? ` ${enrichProgress.done}/${enrichProgress.total} …` : ' Anreichern…'}
                    </>
                  ) : (
                    <>Erste {enrichLimit} Karten anreichern</>
                  )}
                </Button>
              )}
            </div>
            
            {/* Gespeicherter Fortschritt Info */}
            {savedProgress && savedProgress.cards.length > 0 && !enriching && (
              <p className="text-sm text-[#002F5D]">
                💾 {savedProgress.cards.length} Karten gespeichert (vom {new Date(savedProgress.timestamp).toLocaleString('de-DE')})
              </p>
            )}
            
            {enrichProgress && enriching && (
              <p className="text-sm text-zinc-600">
                {enrichProgress.done} von {enrichProgress.total} Karten angereichert…
              </p>
            )}

            {enrichedCards.length > 0 && (
              <div className="space-y-4 border-t border-zinc-200 pt-4">
                <h4 className="font-medium text-zinc-900">Angereicherte Karten ({enrichedCards.length})</h4>
                <div className="max-h-[600px] overflow-y-auto space-y-3">
                  {enrichedCards.slice(0, 20).map((c, i) => (
                    <div key={i} className="p-4 border border-zinc-200 rounded-lg bg-zinc-50">
                      <button
                        type="button"
                        className="w-full text-left flex justify-between items-center"
                        onClick={() => setExpandedCard(expandedCard === i ? null : i)}
                      >
                        <span className="text-sm font-medium text-zinc-900 line-clamp-2">{c.front}</span>
                        {expandedCard === i ? <ChevronUp className="h-4 w-4 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 flex-shrink-0" />}
                      </button>
                      {expandedCard === i && (
                        <div className="mt-4 space-y-4 text-sm">
                          {/* Original-Frage */}
                          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                            <span className="text-sm text-zinc-500">Frage:</span>
                            <p className="text-zinc-800 mt-1">{c.front}</p>
                          </div>

                          {/* Original-Optionen mit Binärcode-Auswertung */}
                          {c.options && c.options.length > 0 && (() => {
                            // Binärcode: Leerzeichen und andere Zeichen entfernen
                            const rawCode = c.originalAnswers || c.back || '';
                            const binaryCode = rawCode.replace(/[^01]/g, ''); // Nur 0 und 1 behalten
                            return (
                              <div className="p-3 bg-white border border-zinc-200 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm text-zinc-600">Antwort-Optionen:</span>
                                  {binaryCode && (
                                    <span className="text-xs font-mono text-zinc-400">
                                      {binaryCode}
                                    </span>
                                  )}
                                </div>
                                <div className="space-y-1">
                                  {c.options.map((opt, idx) => {
                                    const answerBit = binaryCode ? binaryCode[idx] : undefined;
                                    const isCorrect = answerBit === '1';
                                    const isIncorrect = answerBit === '0';
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`flex items-start gap-2 py-1 px-2 rounded ${
                                          isCorrect ? 'bg-green-50' : isIncorrect ? 'bg-red-50' : ''
                                        }`}
                                      >
                                        <span className="font-mono text-xs text-zinc-400 w-6">Q{idx + 1}</span>
                                        <span className={`flex-1 text-sm ${isCorrect ? 'text-green-700' : isIncorrect ? 'text-zinc-500' : 'text-zinc-700'}`}>
                                          {opt}
                                        </span>
                                        {isCorrect && <span className="text-green-600 text-sm">✓</span>}
                                        {isIncorrect && <span className="text-red-400 text-sm">✗</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })()}

                          {/* Lösung */}
                          <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                            <span className="text-sm font-medium text-zinc-600">Lösung:</span>
                            <p className="text-zinc-800 mt-1">{c.lösung}</p>
                          </div>

                          {/* Bewertungstabelle für MC-Fragen */}
                          {c.bewertungsTabelle && c.bewertungsTabelle.length > 0 && (
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm border-collapse">
                                <thead>
                                  <tr className="bg-zinc-100">
                                    <th className="text-left p-2 border border-zinc-200 font-medium text-zinc-600">Aussage</th>
                                    <th className="text-center p-2 border border-zinc-200 font-medium text-zinc-600 w-20"></th>
                                    <th className="text-left p-2 border border-zinc-200 font-medium text-zinc-600">Begründung</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {c.bewertungsTabelle.map((row, idx) => (
                                    <tr key={idx} className="bg-white">
                                      <td className="p-2 border border-zinc-200 text-zinc-700">{row.aussage}</td>
                                      <td className={`p-2 border border-zinc-200 text-center ${
                                        row.bewertung === 'Richtig' || row.bewertung === 'Yes' 
                                          ? 'text-green-600' 
                                          : 'text-red-500'
                                      }`}>
                                        {row.bewertung === 'Richtig' || row.bewertung === 'Yes' ? '✓' : '✗'}
                                      </td>
                                      <td className="p-2 border border-zinc-200 text-zinc-600">{row.begründung}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* Zusammenfassung */}
                          {c.zusammenfassung && (
                            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                              <span className="text-sm font-medium text-zinc-600">Zusammenfassung:</span>
                              <p className="text-zinc-800 mt-1">{c.zusammenfassung}</p>
                            </div>
                          )}

                          {/* Erklärung (fallback wenn keine Tabelle) */}
                          {c.erklärung && !c.bewertungsTabelle?.length && (
                            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-lg">
                              <span className="text-sm font-medium text-zinc-600">Erklärung:</span>
                              <p className="text-zinc-700 whitespace-pre-wrap mt-1">{c.erklärung}</p>
                            </div>
                          )}

                          {/* Zusatzinfos */}
                          {(c.eselsbrücke || c.referenz || c.extra1) && (
                            <div className="text-sm text-zinc-600 space-y-1 pt-2 border-t border-zinc-200">
                              {c.eselsbrücke && (
                                <p><span className="text-zinc-500">Eselsbrücke:</span> {c.eselsbrücke}</p>
                              )}
                              {c.referenz && (
                                <p><span className="text-zinc-500">Referenz:</span> {c.referenz}</p>
                              )}
                              {c.extra1 && (
                                <p><span className="text-zinc-500">Hinweis:</span> {c.extra1}</p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {enrichedCards.length > 20 && (
                    <p className="text-sm text-zinc-500">… und {enrichedCards.length - 20} weitere</p>
                  )}
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  <Button onClick={runSync} disabled={syncLoading}>
                    {syncLoading ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Aktualisiere Karten…</>
                    ) : (
                      <><Download className="h-4 w-4 mr-2" /> In Anki aktualisieren (Sources-Feld)</>
                    )}
                  </Button>
                  <p className="text-xs text-zinc-500">
                    Schreibt die Anreicherung ins "Sources"-Feld der Original-Karten
                  </p>
                </div>
                {syncError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm">{syncError}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 80/20 Priorisierung - Themenliste */}
      {!isHosted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#002F5D]" />
              80/20 Themenliste
            </CardTitle>
            <CardDescription>
              Top {priorityTopN} Themen mit dem größten Lernerfolg. Fokus auf Konzepte, nicht einzelne Fragen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {priorityError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{priorityError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Max. Karten analysieren</label>
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={priorityLimit}
                  onChange={(e) =>
                    setPriorityLimit(Math.max(10, Math.min(1000, parseInt(e.target.value, 10) || 10)))
                  }
                  className="w-28 px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002F5D]"
                  disabled={priorityLoading}
                />
              </div>
              <Button
                onClick={runPrioritize}
                disabled={priorityLoading || !selectedDeck || decks.length === 0}
              >
                {priorityLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analysiere Themen...
                  </>
                ) : (
                  <>Top {priorityTopN} Themen identifizieren</>
                )}
              </Button>
            </div>

            {priorityMeta && (
              <p className="text-sm text-zinc-600">
                {priorityMeta.considered} Karten analysiert. Methode: {priorityMeta.method === 'fallback' ? 'Heuristik (Fallback)' : 'LLM'}.
              </p>
            )}

            {prioritySuggestions.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-zinc-700">Deine Lern-Prioritäten:</h4>
                {prioritySuggestions.map((item) => (
                  <div key={item.id} className="p-3 border border-zinc-200 rounded-lg bg-white">
                    <div className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-200 text-zinc-600 flex items-center justify-center font-medium text-sm">
                        {item.rank}
                      </span>
                      <div className="flex-1 space-y-1">
                        <h5 className="font-medium text-zinc-800">
                          {item.topic || 'Kernthema'}
                        </h5>
                        {item.reason && (
                          <p className="text-sm text-zinc-600">{item.reason}</p>
                        )}
                        {item.learningGoals && item.learningGoals.length > 0 && (
                          <ul className="list-disc list-inside text-sm text-zinc-500 mt-1">
                            {item.learningGoals.map((goal, idx) => (
                              <li key={idx}>{goal}</li>
                            ))}
                          </ul>
                        )}
                        <details className="mt-1">
                          <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600">
                            Beispielfrage
                          </summary>
                          <p className="text-xs text-zinc-500 mt-1 pl-2 border-l border-zinc-200">
                            {item.front}
                          </p>
                        </details>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* PDF Import */}
      {!isHosted && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-[#002F5D]" />
              PDF Klausur importieren
            </CardTitle>
            <CardDescription>
              Lade eine Altklausur-PDF hoch. Das LLM extrahiert Fragen und bestimmt die korrekten Antworten.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {pdfError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{pdfError}</span>
              </div>
            )}

            {pdfProgress && (
              <div className="p-3 bg-[#eef5fb] border border-[#2C94CC]/40 rounded-lg flex items-center gap-2 text-[#002F5D]">
                {pdfStep !== 'preview' && pdfStep !== 'upload' && <Loader2 className="h-4 w-4 animate-spin" />}
                {pdfStep === 'preview' && <CheckCircle className="h-4 w-4" />}
                <span className="text-sm">{pdfProgress}</span>
              </div>
            )}

            {/* Extrahierten Text prüfen / in IDE reviewen */}
            {pdfText.length > 0 && (
              <details className="group border border-[#e2e8f0] rounded-lg overflow-hidden">
                <summary className="px-4 py-3 bg-zinc-50 cursor-pointer list-none flex items-center justify-between gap-2 hover:bg-zinc-100">
                  <span className="font-medium text-zinc-800 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[#002F5D]" />
                    Extrahierten Text prüfen
                  </span>
                  <span className="text-sm text-zinc-500">
                    {pdfText.length.toLocaleString('de-DE')} Zeichen
                    {pdfUsedOcr && <Badge variant="secondary" className="ml-2 text-xs">OCR</Badge>}
                  </span>
                </summary>
                <div className="p-4 pt-0 space-y-3">
                  <div className="max-h-64 overflow-y-auto rounded border border-zinc-200 bg-white">
                    <pre className="p-4 text-xs text-zinc-700 whitespace-pre-wrap font-sans">
                      {pdfText.length <= 32000
                        ? pdfText
                        : pdfText.slice(0, 32000) + `\n\n… und ${(pdfText.length - 32000).toLocaleString('de-DE')} weitere Zeichen`}
                    </pre>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={copyPdfText}>
                      <Copy className="h-4 w-4 mr-2" />
                      {pdfCopySuccess ? 'Kopiert!' : 'Kopieren'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={downloadPdfText}>
                      <Download className="h-4 w-4 mr-2" />
                      Als .txt herunterladen
                    </Button>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Zum Review in der IDE: Text kopieren oder als .txt speichern und in deinem Editor öffnen.
                  </p>
                </div>
              </details>
            )}

            {/* Upload */}
            {pdfStep === 'upload' && (
              <div className="border-2 border-dashed border-zinc-300 rounded-lg p-8 text-center hover:border-[#2C94CC] transition-colors">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handlePdfUpload(file);
                  }}
                  className="hidden"
                  id="pdf-upload"
                />
                <label htmlFor="pdf-upload" className="cursor-pointer">
                  <Upload className="h-10 w-10 mx-auto text-zinc-400 mb-3" />
                  <p className="text-sm text-zinc-600 mb-1">PDF hier ablegen oder klicken</p>
                  <p className="text-xs text-zinc-400">z.B. "Altklausur XYZ.pdf"</p>
                </label>
              </div>
            )}

            {/* Preview */}
            {pdfStep === 'preview' && parsedQuestions.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-zinc-900">
                    {parsedQuestions.length} Fragen aus "{pdfTitle}"
                  </h4>
                  <Button variant="outline" size="sm" onClick={resetPdfImport}>
                    Andere PDF
                  </Button>
                </div>

                {/* Deck-Auswahl */}
                <div className="flex flex-wrap gap-4 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm font-medium text-zinc-700 mb-1">
                      Ziel-Deck (neu oder bestehend)
                    </label>
                    <input
                      type="text"
                      value={importDeckName}
                      onChange={(e) => setImportDeckName(e.target.value)}
                      placeholder="z.B. Fach::Unterordner::Import (:: = Unterdeck)"
                      className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#002F5D]"
                    />
                    <p className="text-xs text-zinc-500 mt-1">
                      Verwende "::" für Unterdecks
                    </p>
                  </div>
                  <Button onClick={handleImportToAnki} disabled={!importDeckName.trim()}>
                    <Download className="h-4 w-4 mr-2" />
                    Nach Anki importieren
                  </Button>
                  <Button variant="outline" onClick={handleExportApkg}>
                    <Download className="h-4 w-4 mr-2" />
                    Als .apkg herunterladen
                  </Button>
                </div>

                {/* Fragen-Vorschau */}
                <div className="max-h-96 overflow-y-auto space-y-3">
                  {parsedQuestions.slice(0, 10).map((q, i) => (
                    <div key={i} className="p-3 border border-zinc-200 rounded-lg bg-zinc-50">
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {q.type} • Frage {q.number}
                        </Badge>
                        {q.correctAnswers && (
                          <span className="text-xs font-mono text-zinc-500">
                            {q.correctAnswers}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-900 mb-2">{q.question}</p>
                      <div className="space-y-1">
                        {q.options.map((opt, j) => {
                          const isCorrect = q.correctAnswers?.[j] === '1';
                          return (
                            <div
                              key={j}
                              className={`text-xs py-1 px-2 rounded ${
                                isCorrect ? 'bg-green-100 text-green-800' : 'text-zinc-600'
                              }`}
                            >
                              {String.fromCharCode(65 + j)}) {opt} {isCorrect && '✓'}
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <p className="text-xs text-zinc-500 mt-2 border-t pt-2">
                          {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                  {parsedQuestions.length > 10 && (
                    <p className="text-sm text-zinc-500 text-center">
                      ... und {parsedQuestions.length - 10} weitere Fragen
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Loading States */}
            {(pdfStep === 'parsing' || pdfStep === 'answering' || pdfStep === 'importing' || pdfStep === 'exporting') && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-[#002F5D] mb-3" />
                <p className="text-sm text-zinc-600">
                  {pdfStep === 'parsing' && 'Extrahiere Fragen aus PDF...'}
                  {pdfStep === 'answering' && 'LLM bestimmt korrekte Antworten...'}
                  {pdfStep === 'importing' && 'Importiere nach Anki...'}
                  {pdfStep === 'exporting' && 'Erstelle .apkg...'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedDeck && cards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-[#002F5D]" />
              Karten aus &quot;{selectedDeck}&quot;
            </CardTitle>
            <CardDescription>
              {cards.length} Karten gefunden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {cards.slice(0, 10).map((card, index) => (
                <div
                  key={index}
                  className="p-4 border-2 border-[#e2e8f0] rounded-lg bg-white"
                >
                  <div className="flex items-start justify-between mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {card.qType === 0 ? 'KPRIM' : card.qType === 1 ? 'MC' : 'SC'}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium text-zinc-900 mb-2">
                    {card.question || card.front}
                  </p>
                  {card.options && card.options.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {card.options.map((option, optIndex) => (
                        <div key={optIndex} className="text-xs text-zinc-600">
                          • {option}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-zinc-500">
                    Antwort: {card.answers}
                  </div>
                </div>
              ))}
              {cards.length > 10 && (
                <div className="text-center text-sm text-zinc-500 py-2">
                  ... und {cards.length - 10} weitere Karten
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
