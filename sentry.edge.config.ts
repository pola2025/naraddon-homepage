import * as Sentry from '@sentry/nextjs';

const parseRate = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment:
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'development',
  tracesSampleRate: parseRate(
    process.env.SENTRY_TRACES_SAMPLE_RATE ??
      process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
    0.1
  ),
  debug: process.env.NODE_ENV === 'development' && process.env.SENTRY_DEBUG === '1',
});