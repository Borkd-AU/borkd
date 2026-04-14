import { FLAG_DEFAULT, type FlagKey } from '@borkd/shared';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import type { ReactNode } from 'react';

/**
 * Wraps the app in a PostHog provider + exposes `useFeatureFlag` /
 * `useFeatureFlagPayload` typed against the registry in
 * `packages/shared/src/feature-flags.ts`.
 *
 * Bootstrapping:
 *   * Reads `EXPO_PUBLIC_POSTHOG_KEY` at build time.
 *   * If the key is missing (local dev without PostHog configured), the
 *     provider becomes a no-op pass-through — all flag reads resolve to
 *     `FLAG_DEFAULT` (false). Product code keeps working without any
 *     conditional imports.
 *   * Telemetry is disabled on dev builds so local usage doesn't
 *     contaminate production analytics.
 *
 * Usage in a screen:
 *   const newWalkUi = useFeatureFlag(FLAGS.NEW_WALK_UI);
 *   if (newWalkUi) { ... }
 */

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com';

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  if (!POSTHOG_KEY) {
    // No-op: app functions identically, all flags default off.
    return <>{children}</>;
  }

  return (
    <PostHogProvider
      apiKey={POSTHOG_KEY}
      options={{
        host: POSTHOG_HOST,
        // Disable autocapture — we'll emit explicit events from product code.
        captureAppLifecycleEvents: true,
        disabled: __DEV__,
      }}
    >
      {children}
    </PostHogProvider>
  );
}

/**
 * Read a feature flag value. Returns `FLAG_DEFAULT` (false) until
 * PostHog finishes loading, and also when the SDK is not configured.
 */
export function useFeatureFlag(key: FlagKey): boolean {
  const posthog = usePostHog();
  if (!posthog) return FLAG_DEFAULT;
  const value = posthog.getFeatureFlag(key);
  // PostHog returns boolean | string (multivariate) | undefined.
  // For now we only support boolean flags; anything else collapses to default.
  return value === true;
}
