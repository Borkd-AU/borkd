/**
 * Sentry SDK — browser/client initialisation for the admin Next.js app.
 *
 * This file is imported by Next.js automatically via the `@sentry/nextjs`
 * convention (no manual `import './sentry.client.config'` needed).
 *
 * Env var rules mirror the mobile provider:
 *   * Missing NEXT_PUBLIC_SENTRY_DSN → SDK not initialised → no events.
 *   * Dev builds use `environment: "development"` to keep prod clean.
 *   * sendDefaultPii: false — enable only after a privacy review.
 */

import * as Sentry from '@sentry/nextjs';

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENV ??
      (process.env.NODE_ENV === 'development' ? 'development' : 'production'),
    enabled:
      process.env.NODE_ENV !== 'development' ||
      Boolean(process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV),
    tracesSampleRate: process.env.NODE_ENV === 'development' ? 1.0 : 0.1,
    sendDefaultPii: false,
    // Session replay for admins — low sample rate to start; tune up when
    // we need to debug specific admin flows.
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
  });
}
