import { SiteHeader } from '@/components/SiteHeader';
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
    <div className="min-h-screen bg-white">
      <CanonicalHostBanner />
      <SiteHeader active="kreuzen" context={subtitle ? `Kreuzen · ${subtitle}` : 'Kreuzen'} />
      <main className="container mx-auto px-6 py-8 md:py-10">{children}</main>
    </div>
  );
}
