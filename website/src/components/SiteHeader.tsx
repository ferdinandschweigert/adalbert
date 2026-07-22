import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';

const links = [
  { href: '/altfragen', label: 'Kreuzen' },
  { href: '/#anki', label: 'Anki' },
] as const;

export function SiteHeader({
  active,
  className,
}: {
  active?: 'kreuzen' | 'anki' | 'home';
  className?: string;
}) {
  return (
    <header
      className={cn(
        'border-b border-[#e2e8f0] bg-white/90 backdrop-blur-sm',
        className
      )}
    >
      <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2.5 min-w-0">
          <Image
            src="/adalbert-mark.webp"
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 object-contain"
            priority
          />
          <span className="truncate text-lg font-bold tracking-tight text-[#002F5D]">
            Adalbert
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {links.map((link) => {
            const isActive =
              (active === 'kreuzen' && link.href === '/altfragen') ||
              (active === 'anki' && link.href === '/#anki');
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-md px-3 py-2 transition',
                  isActive
                    ? 'bg-[#eef5fb] font-medium text-[#002F5D]'
                    : 'text-zinc-600 hover:bg-[#eef5fb] hover:text-[#002F5D]'
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href="/altfragen/admin"
            className="hidden rounded-md px-3 py-2 text-zinc-500 transition hover:bg-[#eef5fb] hover:text-[#002F5D] sm:inline"
          >
            Admin
          </Link>
        </nav>
      </div>
    </header>
  );
}
