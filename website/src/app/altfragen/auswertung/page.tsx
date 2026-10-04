import type { Metadata } from 'next';
import { AltfragenAccessGate } from '@/components/altfragen/AltfragenAccessGate';
import { AltfragenInsights } from '@/components/altfragen/AltfragenInsights';

export const metadata: Metadata = {
  title: 'Meine Kreuz-Auswertung – Adalbert',
  description: 'Eigene Kreuzergebnisse und Lösungen direkt im Browser auswerten.',
  robots: { index: false, follow: false },
};

export default function AuswertungPage() {
  return <AltfragenAccessGate><AltfragenInsights /></AltfragenAccessGate>;
}
