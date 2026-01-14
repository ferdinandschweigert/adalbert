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
  FileText
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

export default function Dashboard() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<string>('');
  const [cards, setCards] = useState<AnkiCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isHosted, setIsHosted] = useState<boolean | null>(null);

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

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
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
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">
                AnkiConnect funktioniert nur lokal mit Anki Desktop. Diese Funktionen sind auf Vercel deaktiviert.
              </span>
            </div>
          )}
          
          {status && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-blue-700">
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
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <span className="ml-2 text-zinc-600">Lade...</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedDeck && cards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
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
                  className="p-4 border-2 border-blue-200 rounded-lg bg-white"
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
