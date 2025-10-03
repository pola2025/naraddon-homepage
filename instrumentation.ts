import type { RegisterOptions } from '@sentry/nextjs';

export async function register(options: RegisterOptions = {}) {
  if (options.isServer) {
    await import('./sentry.server.config');
  }

  if (options.isEdgeRuntime) {
    await import('./sentry.edge.config');
  }
}