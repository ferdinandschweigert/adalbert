import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AnkiDashboardLazy } from '@/components/AnkiDashboardLazy';

export const metadata: Metadata = {
  title: 'Anki – Adalbert',
  description: 'Anki-Decks mit deutschen Erklärungen anreichern und nach Anki Desktop synchen.',
};

export default function AnkiPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader active="anki" context="Anki" />
      <main className="container mx-auto px-6 py-8 md:py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 md:text-3xl">Anki</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 md:text-base">
            Decks anreichern und nach Anki Desktop synchen. Lokal brauchst du AnkiConnect und einen
            LLM-API-Key.
          </p>
        </div>
        <AnkiDashboardLazy />
      </main>
      <SiteFooter />
    </div>
  );
}
