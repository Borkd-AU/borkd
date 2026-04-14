/**
 * Sentry SDK — Next.js server (Server Components, Route Handlers,
 * Server Actions) initialisation.
 *
 * Picked up automatically by @sentry/nextjs. Server-side errors land
 * under the same project as client errors — we distinguish them via
 * the `runtime` tag that Sentry adds for us.
 */

import * as Sentry from '@sentry/nextjs';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment:
      process.env.SENTRY_ENV ??
      (process.env.NODE_ENV === 'development' ? 'development' : 'production'),
    enabled: process.env.NODE_ENV !== 'development',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
  });
}
