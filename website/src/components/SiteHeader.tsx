import Link from 'next/link';
import { cn } from '@/lib/utils';

const links = [
  { href: '/altfragen', label: 'Kreuzen' },
  { href: '/#anki', label: 'Anki' },
] as const;

export function SiteHeader({
  active,
  context,
  className,
}: {
  active?: 'kreuzen' | 'anki' | 'home';
  /** Optional secondary label under the brand (avoids a second header bar). */
  context?: string;
  className?: string;
}) {
  return (
    <header className={cn('border-b border-[#e2e8f0] bg-white', className)}>
      <div className="container mx-auto flex items-center justify-between gap-4 px-6 py-3">
        <Link href="/" className="min-w-0">
          <span className="block truncate text-lg font-bold tracking-tight text-[#002F5D]">
            Adalbert
          </span>
          {context ? (
            <span className="block truncate text-xs text-zinc-500">{context}</span>
          ) : null}
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
        </nav>
      </div>
    </header>
  );
}
