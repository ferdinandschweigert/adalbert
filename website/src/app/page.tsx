import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AnkiDashboardLazy } from '@/components/AnkiDashboardLazy';
import { Button } from '@/components/ui/button';
import { BookOpen, Brain, ChevronRight, PenLine } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#f5f7fa]">
      <SiteHeader active="home" />

      {/* Hero — one composition: brand, headline, sentence, CTAs */}
      <section className="relative overflow-hidden border-b border-[#e2e8f0] bg-gradient-to-br from-[#002F5D] via-[#003d7a] to-[#2C94CC]">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.18), transparent 45%), radial-gradient(circle at 80% 0%, rgba(44,148,204,0.45), transparent 40%)',
          }}
        />
        <div className="relative container mx-auto grid items-center gap-10 px-6 py-16 md:grid-cols-[1.1fr_0.9fr] md:py-24">
          <div className="text-white">
            <p className="mb-3 text-sm font-semibold tracking-[0.18em] text-white/70 uppercase">
              Adalbert
            </p>
            <h1 className="max-w-xl text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              Staatsexamen üben.
              <span className="block text-white/90">Anki verstehen.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/80 md:text-lg">
              Zwei Wege zum Lernen: freigegebene Altfragen kreuzen — oder deine
              Anki-Decks mit deutschen Erklärungen anreichern.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="bg-white text-[#002F5D] hover:bg-[#eef5fb]">
                <Link href="/altfragen">
                  <PenLine className="mr-2 h-4 w-4" />
                  Kreuzen
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link href="/#anki">
                  <Brain className="mr-2 h-4 w-4" />
                  Anki anreichern
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex justify-center md:justify-end">
            <Image
              src="/adalbert-mark.webp"
              alt="Adalbert"
              width={280}
              height={280}
              priority
              className="h-48 w-48 object-contain drop-shadow-2xl md:h-64 md:w-64"
            />
          </div>
        </div>
      </section>

      {/* Paths overview */}
      <section className="border-b border-[#e2e8f0] bg-white">
        <div className="container mx-auto grid gap-0 px-6 md:grid-cols-2">
          <Link
            href="/altfragen"
            className="group border-b border-[#e2e8f0] px-2 py-12 transition hover:bg-[#eef5fb]/60 md:border-b-0 md:border-r md:px-8"
          >
            <p className="text-xs font-semibold tracking-wide text-[#2C94CC] uppercase">
              Modul 1
            </p>
            <h2 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#002F5D]">
              Kreuzen
              <ChevronRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600">
              Gedächtnisprotokolle und Staatsexamen-Fragen online üben — mit
              Lösung, Übersicht und Auswertung. Ohne Login.
            </p>
          </Link>
          <Link
            href="/#anki"
            className="group px-2 py-12 transition hover:bg-[#eef5fb]/60 md:px-8"
          >
            <p className="text-xs font-semibold tracking-wide text-[#2C94CC] uppercase">
              Modul 2
            </p>
            <h2 className="mt-2 flex items-center gap-2 text-2xl font-bold text-[#002F5D]">
              Anki
              <ChevronRight className="h-5 w-5 transition group-hover:translate-x-0.5" />
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-zinc-600">
              Decks lesen, Karten mit Lösung / Erklärung / Eselsbrücke anreichern
              und zurück nach Anki Desktop synchen.
            </p>
          </Link>
        </div>
      </section>

      {/* Kreuzen detail */}
      <section id="kreuzen" className="scroll-mt-20 border-b border-[#e2e8f0] bg-[#f5f7fa] py-16 md:py-20">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold text-[#2C94CC]">Kreuzen</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
              Altfragen wie in der Prüfung
            </h2>
            <p className="mt-4 text-zinc-600 leading-relaxed">
              Freigegebene Klausuren (z. B. M2 SS26 und 2025-A) tippen, sofort
              Feedback bekommen, Fragen überspringen und am Ende die Auswertung
              mit Richtig/Falsch und Zeit sehen.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-zinc-700">
              <li className="flex gap-2">
                <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-[#002F5D]" />
                SC-Fragen: Antwort tippen → Lösung sofort
              </li>
              <li className="flex gap-2">
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[#002F5D]" />
                Amboss-Style Übersicht + Community-Prozente
              </li>
              <li className="flex gap-2">
                <Brain className="mt-0.5 h-4 w-4 shrink-0 text-[#002F5D]" />
                Optionaler Fachschafts-Code, Admin-Upload für neue Protokolle
              </li>
            </ul>
            <Button asChild className="mt-8 bg-[#002F5D] hover:bg-[#003d7a]">
              <Link href="/altfragen">
                Zur Klausur-Übersicht
                <ChevronRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Anki detail + dashboard */}
      <section id="anki" className="scroll-mt-20 bg-white py-16 md:py-20">
        <div className="container mx-auto px-6">
          <div className="mx-auto mb-10 max-w-3xl">
            <p className="text-sm font-semibold text-[#2C94CC]">Anki</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
              Decks anreichern
            </h2>
            <p className="mt-4 text-zinc-600 leading-relaxed">
              Adalbert liest deine Decks (Website oder MCP in Cursor), schreibt
              deutsche Erklärungen und synct zurück nach Anki Desktop — ohne
              manuelles Import/Export.
            </p>
            <p className="mt-3 text-sm text-zinc-500">
              Pro Karte: Lösung · Erklärung · Eselsbrücke · Referenz. Lokal brauchst
              du AnkiConnect und einen LLM-API-Key — siehe SETUP.md.
            </p>
          </div>
          <AnkiDashboardLazy />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
