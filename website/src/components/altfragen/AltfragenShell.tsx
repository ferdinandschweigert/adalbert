import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { CanonicalHostBanner } from '@/components/CanonicalHostBanner';

export function AltfragenShell({
  children,
  subtitle,
}: {
  children: React.ReactNode;
  /** Optional page context shown next to the brand in the single header */
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <CanonicalHostBanner />
      <SiteHeader active="kreuzen" context={subtitle ? `Kreuzen · ${subtitle}` : 'Kreuzen'} />
      <main className="container mx-auto flex-1 px-6 py-8 md:py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}
