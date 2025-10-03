import * as Sentry from '@sentry/nextjs';
import { ExtraErrorData } from '@sentry/integrations';
import type { Integration } from '@sentry/types';

const parseRate = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const integrations: Integration[] = [];

if (typeof ExtraErrorData === 'function') {
  integrations.push(new ExtraErrorData({ depth: 8 }));
}

if (typeof Sentry.prismaIntegration === 'function') {
  integrations.push(Sentry.prismaIntegration());
}

Sentry.init({
  dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN || '',
  environment:
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'development',
  release:
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  integrations,
  tracesSampleRate: parseRate(
    process.env.SENTRY_TRACES_SAMPLE_RATE ??
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    0.1
  ),
  profilesSampleRate: parseRate(
    process.env.SENTRY_PROFILES_SAMPLE_RATE,
    0.1
  ),
  debug:
    process.env.NODE_ENV === 'development' &&
    process.env.SENTRY_DEBUG === '1',
  sendDefaultPii: false,
});