import { AltfragenAdmin } from '@/components/altfragen/AltfragenAdmin';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Altfragen Admin – Adalbert',
  description: 'Klausuren hochladen, prüfen und zum Kreuzen freigeben.',
};

export default function AltfragenAdminPage() {
  return <AltfragenAdmin />;
}
