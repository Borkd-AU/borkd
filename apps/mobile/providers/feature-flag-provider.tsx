import { FLAG_DEFAULT, type FlagKey } from '@borkd/shared';
import { StatsigProviderRN, useFeatureGate } from '@statsig/react-native-bindings';
import type { ReactNode } from 'react';
import { Text } from 'react-native';

/**
 * Wraps the mobile app in a Statsig provider + exposes a typed
 * `useFeatureFlag` hook against the registry in
 * `packages/shared/src/feature-flags.ts`.
 *
 * Bootstrapping:
 *   * Reads `EXPO_PUBLIC_STATSIG_CLIENT_KEY` at build time.
 *   * If the key is missing (local dev without Statsig configured),
 *     the provider becomes a no-op pass-through — every flag read
 *     resolves to `FLAG_DEFAULT` (false). Product code keeps working
 *     without any conditional imports.
 *   * Statsig attaches an environment tag ("development", "staging",
 *     "production") from EXPO_PUBLIC_STATSIG_TIER so the dashboard can
 *     segment events per build variant without needing separate keys.
 *
 * Usage in a screen:
 *   const newWalkUi = useFeatureFlag(FLAGS.NEW_WALK_UI);
 *   if (newWalkUi) { ... }
 *
 * Why mobile only:
 *   `apps/admin` is an internal operator tool with a closed user list —
 *   flags + analytics there would be noise, so the admin workspace
 *   intentionally has no Statsig provider. Add one back only if we ever
 *   ship admin to outside users.
 */

const STATSIG_KEY = process.env.EXPO_PUBLIC_STATSIG_CLIENT_KEY;
const STATSIG_TIER = process.env.EXPO_PUBLIC_STATSIG_TIER ?? 'development';

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  if (!STATSIG_KEY) {
    // No-op: app functions identically, all flags default off.
    return <>{children}</>;
  }

  return (
    <StatsigProviderRN
      sdkKey={STATSIG_KEY}
      user={{
        // Anonymous user id will be overwritten by the auth provider
        // once a real session exists (see apps/mobile/providers/auth).
        userID: 'anonymous',
        custom: { tier: STATSIG_TIER },
      }}
      loadingComponent={<Text>Loading…</Text>}
    >
      {children}
    </StatsigProviderRN>
  );
}

/**
 * Read a feature flag value. Returns `FLAG_DEFAULT` (false) while
 * Statsig is still bootstrapping, and also when the SDK is not
 * configured (missing env key — usually local dev).
 */
export function useFeatureFlag(key: FlagKey): boolean {
  const gate = useFeatureGate(key);
  // Statsig's hook is stable across renders; during the very first
  // async init it returns `{ value: false }` which matches FLAG_DEFAULT.
  return gate?.value ?? FLAG_DEFAULT;
}
