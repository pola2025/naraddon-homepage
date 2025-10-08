'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const AuthErrorContent = dynamic(
  () => import('./AuthErrorContent'),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }
);

export default function AuthError() {
  return <AuthErrorContent />;
}