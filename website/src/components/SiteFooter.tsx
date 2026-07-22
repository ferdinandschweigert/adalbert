import Link from 'next/link';
import Image from 'next/image';

export function SiteFooter() {
  return (
    <footer className="border-t border-[#e2e8f0] bg-white py-10">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6 px-6 md:flex-row">
        <div className="flex items-center gap-3">
          <Image
            src="/adalbert-header.webp"
            alt="Adalbert"
            width={64}
            height={96}
            className="h-12 w-auto object-contain"
          />
          <div>
            <p className="font-semibold text-[#002F5D]">Adalbert</p>
            <p className="text-xs text-zinc-500">Kreuzen · Anki-Anreicherung</p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center justify-center gap-4 text-sm text-zinc-600">
          <Link href="/altfragen" className="hover:text-[#002F5D]">
            Kreuzen
          </Link>
          <Link href="/anki" className="hover:text-[#002F5D]">
            Anki
          </Link>
          <a
            href="https://github.com/ferdinandschweigert/adalbert"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#002F5D]"
          >
            GitHub
          </a>
          <a
            href="https://github.com/ferdinandschweigert/adalbert/blob/main/README.md"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#002F5D]"
          >
            Doku
          </a>
        </nav>
        <p className="max-w-xs text-center text-xs text-zinc-500 md:text-right">
          Persönliches Lernprojekt — kein kommerzieller Anspruch auf den Namen.
        </p>
      </div>
    </footer>
  );
}
