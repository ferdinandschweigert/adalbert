'use client';

import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-[#e2e8f0] bg-white p-8 text-center text-sm text-zinc-500">
      Anki-Dashboard wird geladen…
    </div>
  ),
});

export function AnkiDashboardLazy() {
  return <Dashboard />;
}
