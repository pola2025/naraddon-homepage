import * as Sentry from '@sentry/nextjs';
import type { Integration } from '@sentry/types';

const parseRate = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const integrations: Integration[] = [];

if (typeof Sentry.browserTracingIntegration === 'function') {
  integrations.push(Sentry.browserTracingIntegration());
}

if (typeof Sentry.replayIntegration === 'function') {
  integrations.push(
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
    })
  );
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || '',
  environment:
    process.env.NEXT_PUBLIC_VERCEL_ENV ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'development',
  release:
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA,
  integrations,
  tracesSampleRate: parseRate(
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ??
      process.env.SENTRY_TRACES_SAMPLE_RATE,
    0.1
  ),
  replaysSessionSampleRate: parseRate(
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_SESSION_SAMPLE_RATE,
    0
  ),
  replaysOnErrorSampleRate: parseRate(
    process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ERROR_SAMPLE_RATE,
    0
  ),
  debug:
    process.env.NODE_ENV === 'development' &&
    process.env.SENTRY_DEBUG === '1',
});