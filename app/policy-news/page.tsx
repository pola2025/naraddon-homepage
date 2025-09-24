'use client';

import React, { Suspense } from 'react';
import PolicyNewsSection from '@/components/PolicyNewsSection/PolicyNewsSection';
import dynamic from 'next/dynamic';

const PolicyAnalysis = dynamic(() => import('@/components/policy/PolicyAnalysis'), {
  ssr: false,
  loading: () => <div style={{ padding: '40px', textAlign: 'center' }}>로딩 중...</div>
});

export default function PolicyNewsPage() {
  return (
    <>
      <Suspense fallback={null}>
        <PolicyNewsSection />
      </Suspense>
      <PolicyAnalysis />
    </>
  );
}
