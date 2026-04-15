/**
 * Feature flag registry.
 *
 * Every `feat-exp/*` branch registers its new flag key here. Statsig
 * serves the actual boolean per user via its mobile client SDK; this
 * file is the **typed inventory** — consumers write
 * `useFeatureFlag(FLAGS.NEW_WALK_UI)`, not bare strings, so TypeScript
 * catches typos and so we can grep for "who reads flag X".
 *
 * Rules:
 *   1. A flag key lives here **before** any code references it.
 *   2. Defaults in the Statsig dashboard are OFF. Enable post-hoc.
 *   3. When the flag graduates (100% rollout, no rollback expected),
 *      open a follow-up PR that removes the flag + keeps the code
 *      path unconditionally.
 *   4. Flags are short-lived (weeks, not months). Long-lived toggles
 *      belong in a remote config, not in this file.
 *
 * CI (.github/workflows/pr-checks.yml → Branch Policy → Experimental
 * features) enforces rule 1 — feat-exp/* PRs must add an entry here.
 *
 * Note: only the consumer-facing mobile app reads flags today. Admin is
 * an internal tool for ≤5 operators, so it intentionally has no flag
 * plumbing — add it back only if we ever expose admin to outside users.
 */

export const FLAGS = {
  // Example — remove once the first real flag lands.
  // The hyphen key is what Statsig uses on the dashboard; the UPPER_SNAKE
  // constant is what code references. Keep the two in sync.
  EXAMPLE_UNUSED: 'example-unused',
} as const;

export type FlagKey = (typeof FLAGS)[keyof typeof FLAGS];

/**
 * Safe default returned when Statsig hasn't loaded yet or the user
 * has no assignment. Every flag defaults OFF.
 *
 * Don't read this directly in product code — use the `useFeatureFlag`
 * hook in apps/mobile/providers/feature-flag-provider.tsx.
 */
export const FLAG_DEFAULT = false;
