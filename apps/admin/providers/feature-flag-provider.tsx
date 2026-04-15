'use client';

import { FLAG_DEFAULT, type FlagKey } from '@borkd/shared';
import type { ReactNode } from 'react';

/**
 * Admin-side feature flag provider — intentional no-op.
 *
 * `apps/admin` is an internal operator tool for a closed user list
 * (team members, ≤ 5 people). We don't run feature gates or analytics
 * here because:
 *   * No meaningful sample size to A/B test against.
 *   * Operators benefit from seeing every feature immediately rather
 *     than gated rollouts.
 *   * Keeping the admin bundle free of analytics SDKs keeps internal
 *     tooling responsive and avoids pulling another vendor key into
 *     staff browsers.
 *
 * The provider + hook stay in place so shared code that imports
 * `useFeatureFlag` from this path still resolves — they just always
 * return `FLAG_DEFAULT`. If admin ever opens up to outside users,
 * swap this stub for a real Statsig provider (match the mobile one in
 * `apps/mobile/providers/feature-flag-provider.tsx`).
 */

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useFeatureFlag(_key: FlagKey): boolean {
  return FLAG_DEFAULT;
}
