import { AltfragenPractice } from '@/components/altfragen/AltfragenPractice';

export default async function AltfragenExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  return <AltfragenPractice examId={examId} />;
}
