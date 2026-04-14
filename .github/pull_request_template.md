<!--
PR template. Fill in every section that applies. CI enforces:
  * Conventional commit messages (see docs/GIT_WORKFLOW.md §Naming)
  * Migration safety (see supabase/migrations/_CONVENTIONS.md)
  * Lint + typecheck + tests pass on all workspaces
Full pipeline: .claude/eval/EVAL_RUBRIC.md
-->

## Summary

<!-- 무엇을, 왜. 2-3 sentences. Link the issue or spec. -->

## Branch type

- [ ] `feat` — new feature
- [ ] `feat-exp` — experiment (requires PostHog flag in `packages/shared/src/feature-flags.ts`)
- [ ] `fix` — non-urgent bug
- [ ] `hotfix` — production fire, targets `main` directly
- [ ] `ui` — UI/UX iteration
- [ ] `refactor` — non-behavioural refactor
- [ ] `perf` — performance
- [ ] `chore` — deps / config / housekeeping
- [ ] `docs` — docs only
- [ ] `release` — staging → main promotion

## Test plan

- [ ] `pnpm turbo lint check test` passes locally
- [ ] Vercel preview URL loads at mobile viewport (Chrome DevTools iPhone frame) — no console errors
- [ ] Relevant E2E path manually exercised (describe below)
- [ ] For `feat-exp/*` only: feature flag `<key>` added in `packages/shared/src/feature-flags.ts`, defaulted OFF in PostHog

<!-- Describe the specific flows you tested: -->

## Migration

- [ ] No DB migration
- [ ] Migration added
  - [ ] Follows `supabase/migrations/_CONVENTIONS.md` (idempotent DDL, backward-compatible)
  - [ ] `_rollback.sql` sibling committed
  - [ ] RLS enabled on any new `public.*` table
  - [ ] Destructive ops (DROP/RENAME)? Added `[allow-destructive-migration]` to commit body and followed 2-PR procedure.

## Screenshots / screen recording

<!--
UI / UX PRs: before + after screenshots at mobile viewport.
For Vercel preview links, prefer the deep-linked URL at the affected route.
-->

## Breaking changes

- [ ] No breaking changes
- [ ] Breaking changes (describe below; commit uses `type!:` or `BREAKING CHANGE:` footer)

## Rollback plan

<!--
How do we revert if this PR causes a production incident?
  - Vercel: rollback via dashboard to previous deployment (instant).
  - EAS: ship previous OTA update via `eas update --republish --channel <env>`.
  - Supabase: run `<migration>_rollback.sql` manually if forward migration shipped.
-->

## Related docs / context

<!-- Link to spec, ADR, design doc, issue. -->
