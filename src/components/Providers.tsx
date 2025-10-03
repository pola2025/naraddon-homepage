'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import LogRocket from 'logrocket';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/contexts/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';

const parseBoolean = (value: string | undefined, defaultValue = false): boolean => {
  if (value === undefined || value.trim() === '') {
    return defaultValue;
  }

  const normalized = value.trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
};

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const logrocketAppId = process.env.NEXT_PUBLIC_LOGROCKET_APP_ID;
    const logrocketEnabled = parseBoolean(
      process.env.NEXT_PUBLIC_LOGROCKET_ENABLED,
      Boolean(logrocketAppId)
    );

    if (logrocketAppId && logrocketEnabled) {
      const release =
        process.env.NEXT_PUBLIC_LOGROCKET_RELEASE ||
        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
        process.env.VERCEL_GIT_COMMIT_SHA;

      const logrocketOptions: Parameters<typeof LogRocket.init>[1] = release
        ? { release }
        : undefined;

      LogRocket.init(logrocketAppId, logrocketOptions);

      if (typeof LogRocket.getSessionURL === 'function') {
        LogRocket.getSessionURL((sessionURL) => {
          Sentry.setTag('logrocket_session_url', sessionURL);
          Sentry.setContext('logrocket', { sessionURL });
        });
      }
    }
  }, []);

  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <AuthProvider>
        <ErrorBoundary>{children}</ErrorBoundary>
      </AuthProvider>
    </SessionProvider>
  );
}