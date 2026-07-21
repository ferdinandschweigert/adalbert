import { AltfragenBank } from '@/components/altfragen/AltfragenBank';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Altfragen – Adalbert',
  description:
    'Gedächtnisprotokolle vom 2. Staatsexamen hochladen und als anklickbare MC-Fragen kreuzen.',
};

export default function AltfragenPage() {
  return <AltfragenBank />;
}
