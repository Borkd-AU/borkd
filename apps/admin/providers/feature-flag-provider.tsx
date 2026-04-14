'use client';

import { FLAG_DEFAULT, type FlagKey } from '@borkd/shared';
import posthog from 'posthog-js';
import { PostHogProvider, usePostHog } from 'posthog-js/react';
import { type ReactNode, useEffect } from 'react';

/**
 * Admin-side (Next.js) PostHog provider.
 *
 * Mirrors the mobile provider surface (`useFeatureFlag(key)`) so the
 * same typed `FLAGS` registry works across both apps. Client-only —
 * we never read flags on the server, and PostHog's browser SDK is
 * the right tool for client components.
 *
 * NEXT_PUBLIC_POSTHOG_KEY is required. Missing key = no-op (flags
 * return FLAG_DEFAULT = false).
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;
    if (posthog.__loaded) return;
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: false, // Next.js App Router handles routing manually
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') ph.debug(false);
      },
    });
  }, []);

  if (!POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}

/**
 * Read a boolean feature flag. Returns `FLAG_DEFAULT` until PostHog
 * bootstraps and when the SDK is not configured.
 */
export function useFeatureFlag(key: FlagKey): boolean {
  const client = usePostHog();
  if (!client) return FLAG_DEFAULT;
  const value = client.isFeatureEnabled(key);
  return value === true;
}
