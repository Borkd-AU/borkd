import * as Sentry from '@sentry/react-native';
import type { ReactNode } from 'react';

/**
 * Wraps the app with Sentry error monitoring.
 *
 * Bootstrapping rules:
 *   * `EXPO_PUBLIC_SENTRY_DSN` missing (local dev, or any env where
 *     Sentry isn't provisioned) → SDK is never initialised → provider
 *     is a pass-through. No crashes, no console noise, no data sent.
 *   * Dev builds (`__DEV__`) → SDK initialised but events go to a
 *     separate `development` environment so the prod project isn't
 *     polluted with local error traffic. Can also be turned off by
 *     omitting the DSN in `.env.local`.
 *   * Tracing + replay are enabled at low sample rates suitable for
 *     alpha/beta. Tune via the `tracesSampleRate` / `replaysSession...`
 *     values at the top of this file when traffic scales.
 *
 * Usage: wrap `app/_layout.tsx`'s root with <SentryProvider>. Sentry
 * automatically captures unhandled promise rejections, JS errors, and
 * native crashes; manual capture with Sentry.captureException(err).
 */

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const ENV = process.env.EXPO_PUBLIC_SENTRY_ENV ?? (__DEV__ ? 'development' : 'production');

// Sentry must be initialised at module scope (before any other import
// triggers a JS error) — but only when we have a DSN. The guard here
// means apps without Sentry configured skip the whole SDK boot path.
if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: ENV,
    // Keep dev noise out of prod analytics.
    enabled: !__DEV__ || Boolean(process.env.EXPO_PUBLIC_SENTRY_ENABLE_DEV),
    // Conservative sample rates for alpha. Dial up post-beta.
    tracesSampleRate: __DEV__ ? 1.0 : 0.1,
    // Don't auto-capture console.log — we only want real errors.
    integrations: [],
    // Respect user privacy by default; individual walks shouldn't appear
    // in error context without explicit opt-in.
    sendDefaultPii: false,
  });
}

export function SentryProvider({ children }: { children: ReactNode }) {
  // `Sentry.wrap` is a HOC alternative; using a plain wrapper keeps the
  // signature consistent with FeatureFlagProvider (both take `children`).
  // Error boundaries are handled by Sentry's global handlers — no extra
  // component needed for the alpha MVP.
  return <>{children}</>;
}

// Re-export the most common SDK helpers so consumers don't need a
// second import ('@sentry/react-native' + this provider).
export const captureException = (err: unknown, context?: Record<string, unknown>) => {
  if (!DSN) return;
  Sentry.captureException(err, { extra: context });
};

export const setUser = (user: { id: string; email?: string } | null) => {
  if (!DSN) return;
  Sentry.setUser(user);
};
