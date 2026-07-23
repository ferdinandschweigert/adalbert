import { AltfragenPublicList } from '@/components/altfragen/AltfragenPublicList';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Altfragen – Adalbert',
  description: 'Freigegebene Altfragen kreuzen – SC/MC/KPRIM im Übungsmodus.',
  robots: { index: false, follow: false },
};

export default function AltfragenPage() {
  return <AltfragenPublicList />;
}
