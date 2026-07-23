import { AltfragenPractice } from '@/components/altfragen/AltfragenPractice';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Altfragen üben – Adalbert',
  robots: { index: false, follow: false },
};

export default async function AltfragenExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  return <AltfragenPractice examId={examId} />;
}
