'use client';

import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <AuthProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
      </AuthProvider>
    </SessionProvider>
  );
}
