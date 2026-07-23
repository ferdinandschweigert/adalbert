import Link from 'next/link';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { HomeStats } from '@/components/HomeStats';
import { CanonicalHostBanner } from '@/components/CanonicalHostBanner';
import {
  AdalbertMascot,
  AdalbertThemeEndPlayer,
  AdalbertThemeProvider,
} from '@/components/AdalbertMascot';
import { Brain, ChevronRight, PenLine } from 'lucide-react';

export default function Home() {
  return (
    <AdalbertThemeProvider>
      <div className="min-h-screen bg-white">
        <CanonicalHostBanner />
        <SiteHeader active="home" />

        <section className="border-b border-[#e2e8f0] bg-white">
          <div className="container mx-auto px-6 py-10 md:py-12">
            <AdalbertMascot />

            <div className="mx-auto mt-7 grid max-w-3xl gap-3 sm:grid-cols-2 sm:gap-4">
              <Link
                href="/altfragen"
                className="group flex items-center gap-4 rounded-xl border border-[#e2e8f0] bg-white px-5 py-5 shadow-sm transition hover:border-[#002F5D]/30 hover:bg-[#eef5fb]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eef5fb] text-[#002F5D]">
                  <PenLine className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-1 text-lg font-semibold text-[#002F5D]">
                    Altklausuren
                    <ChevronRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-0.5 block text-sm text-zinc-500">Kreuzen · Fachschafts-Code</span>
                </span>
              </Link>

              <Link
                href="/anki"
                className="group flex items-center gap-4 rounded-xl border border-[#e2e8f0] bg-white px-5 py-5 shadow-sm transition hover:border-[#002F5D]/30 hover:bg-[#eef5fb]"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#eef5fb] text-[#002F5D]">
                  <Brain className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="flex items-center gap-1 text-lg font-semibold text-[#002F5D]">
                    Anki
                    <ChevronRight className="h-4 w-4 opacity-60 transition group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-0.5 block text-sm text-zinc-500">Nur lokal · Anki Desktop</span>
                </span>
              </Link>
            </div>
          </div>
        </section>

        <HomeStats />

        <SiteFooter />
        <AdalbertThemeEndPlayer />
      </div>
    </AdalbertThemeProvider>
  );
}
