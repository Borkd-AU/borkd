/**
 * Sentry SDK — Next.js Edge runtime (middleware + edge route handlers).
 * Picked up automatically by @sentry/nextjs.
 */

import * as Sentry from '@sentry/nextjs';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.SENTRY_ENV ?? process.env.NODE_ENV ?? 'production',
    enabled: process.env.NODE_ENV !== 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
