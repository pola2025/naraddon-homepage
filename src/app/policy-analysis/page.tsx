'use client';

import nextDynamic from 'next/dynamic';

// Force dynamic rendering and disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PolicyAnalysis = nextDynamic(() => import('@/components/policy/PolicyAnalysis'), {
  ssr: true,  // SSR 활성화로 변경
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-gray-500">로딩 중...</div>
    </div>
  ),
});

export default function PolicyAnalysisPage() {
  return <PolicyAnalysis />;
}
