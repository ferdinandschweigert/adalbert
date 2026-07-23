import Link from 'next/link';
import Image from 'next/image';
import { ArcadeLauncher } from '@/components/arcade/ArcadeLauncher';
import { cn } from '@/lib/utils';

const links = [
  { href: '/altfragen', label: 'Kreuzen' },
  { href: '/anki', label: 'Anki' },
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
  const showBrand = active !== 'home';

  return (
    <header className={cn('border-b border-[#e2e8f0] bg-white', className)}>
      <div
        className={cn(
          'container mx-auto flex items-center gap-4 px-6 py-2.5',
          showBrand ? 'justify-between' : 'justify-end'
        )}
      >
        {showBrand ? (
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <Image
              src="/adalbert-header.webp"
              alt="Adalbert"
              width={64}
              height={96}
              className="h-12 w-auto shrink-0 object-contain sm:h-14"
              priority
            />
            <span className="min-w-0">
              <span className="block truncate text-lg font-bold tracking-tight text-[#002F5D]">
                Adalbert
              </span>
              {context ? (
                <span className="block truncate text-xs text-zinc-500">{context}</span>
              ) : null}
            </span>
          </Link>
        ) : null}
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {links.map((link) => {
            const isActive =
              (active === 'kreuzen' && link.href === '/altfragen') ||
              (active === 'anki' && link.href === '/anki');
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
          <ArcadeLauncher />
        </nav>
      </div>
    </header>
  );
}
