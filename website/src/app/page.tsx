import Image from 'next/image';
import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AnkiDashboardLazy } from '@/components/AnkiDashboardLazy';
import { HomeStats } from '@/components/HomeStats';
import { Button } from '@/components/ui/button';
import { BookOpen, Brain, ChevronRight, PenLine } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white">
      <SiteHeader active="home" />

      {/* Hero — light like before, full Adalbert, brand first */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(0,47,93,0.10),transparent)]" />
        <div className="relative z-10 container mx-auto px-6 py-16 md:py-24">
          <div className="flex flex-col items-center text-center">
            <Image
              src="/adalbert-full.webp"
              alt="Adalbert"
              width={480}
              height={720}
              priority
              className="mb-8 h-auto w-[180px] object-contain drop-shadow-xl sm:w-[220px] md:w-[260px]"
            />
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-[#002F5D] md:text-6xl">
              Adalbert
            </h1>
            <p className="mb-8 max-w-2xl text-lg text-zinc-600 md:text-xl">
              Zwei Wege zum Lernen: freigegebene Altfragen kreuzen — oder deine
              Anki-Decks mit deutschen Erklärungen anreichern.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-[#002F5D] hover:bg-[#003d7a]">
                <Link href="/altfragen">
                  <PenLine className="mr-2 h-4 w-4" />
                  Kreuzen
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-[#002F5D] text-[#002F5D] hover:bg-[#eef5fb]"
              >
                <Link href="/#anki">
                  <Brain className="mr-2 h-4 w-4" />
                  Anki anreichern
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Paths overview */}
      <section className="border-y border-[#e2e8f0] bg-white">
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

      <HomeStats />

      {/* Kreuzen detail */}
      <section id="kreuzen" className="scroll-mt-20 border-b border-[#e2e8f0] bg-zinc-50 py-16 md:py-20">
        <div className="container mx-auto px-6">
          <div className="mx-auto max-w-3xl">
            <p className="text-sm font-semibold text-[#2C94CC]">Kreuzen</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
              Altfragen wie in der Prüfung
            </h2>
            <p className="mt-4 leading-relaxed text-zinc-600">
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
            <p className="mt-4 leading-relaxed text-zinc-600">
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
