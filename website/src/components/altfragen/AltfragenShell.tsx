import Link from 'next/link';
import Image from 'next/image';

export function AltfragenShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef5fb] via-white to-[#f5f7fa]">
      <header className="border-b border-[#e2e8f0] bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-4">
          <Link href="/altfragen" className="flex items-center gap-3 min-w-0">
            <Image
              src="/adalbert-mark.webp"
              alt="Adalbert"
              width={40}
              height={40}
              priority
              className="h-10 w-10 shrink-0 object-contain"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#002F5D] tracking-tight">Adalbert</p>
              <h1 className="truncate text-lg font-bold text-zinc-900 sm:text-xl">
                Altfragen
                {subtitle ? (
                  <span className="font-normal text-zinc-500"> · {subtitle}</span>
                ) : null}
              </h1>
            </div>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <Link
              href="/"
              className="rounded-md px-3 py-2 text-zinc-600 hover:bg-[#eef5fb] hover:text-[#002F5D]"
            >
              Start
            </Link>
            <Link
              href="/altfragen"
              className="rounded-md px-3 py-2 text-[#002F5D] hover:bg-[#eef5fb]"
            >
              Kreuzen
            </Link>
            <Link
              href="/altfragen/admin"
              className="rounded-md px-3 py-2 text-zinc-500 hover:bg-[#eef5fb] hover:text-[#002F5D]"
            >
              Admin
            </Link>
          </nav>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8 md:py-10">{children}</main>
    </div>
  );
}
