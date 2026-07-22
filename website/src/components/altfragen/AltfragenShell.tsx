import Link from 'next/link';
import Image from 'next/image';
import { SiteHeader } from '@/components/SiteHeader';

export function AltfragenShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eef5fb] via-white to-[#f5f7fa]">
      <SiteHeader active="kreuzen" />
      <div className="border-b border-[#e2e8f0] bg-white">
        <div className="container mx-auto flex items-center gap-3 px-6 py-3">
          <Image
            src="/adalbert-mark.webp"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 object-contain"
          />
          <div className="min-w-0">
            <p className="text-xs font-medium text-[#2C94CC]">Kreuzen</p>
            <h1 className="truncate text-lg font-bold text-zinc-900 sm:text-xl">
              Altfragen
              {subtitle ? (
                <span className="font-normal text-zinc-500"> · {subtitle}</span>
              ) : null}
            </h1>
          </div>
          <Link
            href="/altfragen"
            className="ml-auto hidden text-sm text-zinc-500 hover:text-[#002F5D] sm:inline"
          >
            Alle Klausuren
          </Link>
        </div>
      </div>
      <main className="container mx-auto px-6 py-8 md:py-10">{children}</main>
    </div>
  );
}
