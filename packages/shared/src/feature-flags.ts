/**
 * Feature flag registry.
 *
 * Every `feat-exp/*` branch registers its new flag key here. PostHog
 * serves the actual boolean per user; this file is the **typed
 * inventory** — consumers write `useFeatureFlag(FLAGS.NEW_WALK_UI)`,
 * not bare strings, so TypeScript catches typos and so we can grep
 * for "who reads flag X".
 *
 * Rules:
 *   1. A flag key lives here **before** any code references it.
 *   2. Defaults in PostHog dashboard are OFF. Enable post-hoc.
 *   3. When the flag graduates (100% rollout, no rollback expected),
 *      open a follow-up PR that removes the flag + keeps the code
 *      path unconditionally.
 *   4. Flags are short-lived (weeks, not months). Long-lived toggles
 *      belong in a remote config, not in this file.
 *
 * CI (.github/workflows/pr-checks.yml → Branch Policy → Experimental
 * features) enforces rule 1 — feat-exp/* PRs must add an entry here.
 */

export const FLAGS = {
  // Example — remove once the first real flag lands.
  // The hyphen key is what PostHog uses on the dashboard; the UPPER_SNAKE
  // constant is what code references. Keep the two in sync.
  EXAMPLE_UNUSED: 'example-unused',
} as const;

export type FlagKey = (typeof FLAGS)[keyof typeof FLAGS];

/**
 * Safe default returned when PostHog hasn't loaded yet or the user
 * has no assignment. Every flag defaults OFF.
 *
 * Don't read this directly in product code — use the `useFeatureFlag`
 * hook / `isFeatureEnabled` helper in apps/mobile/lib or apps/admin/lib.
 */
export const FLAG_DEFAULT = false;
