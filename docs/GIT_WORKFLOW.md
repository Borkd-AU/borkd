# Borkd Git Workflow

## Branch Strategy

```
main (production)
 └── staging (pre-production, QA)
      └── develop (integration)
           ├── feat/<scope>         new feature
           ├── feat-exp/<scope>     experimental feature (behind flag)
           ├── fix/<scope>          non-urgent bug fix
           ├── ui/<scope>           UI/UX iteration
           ├── chore/<scope>        housekeeping (deps, config)
           ├── refactor/<scope>     non-behavioural refactor
           ├── perf/<scope>         performance optimisation
           └── docs/<scope>         documentation only

main
 └── hotfix/<description>           production fire, fast-path
```

## Promotion matrix

| Branch type | Fork from | PR target | Approvals | Triggers on merge |
|-------------|-----------|-----------|-----------|-------------------|
| `feat/*`, `fix/*`, `ui/*`, `chore/*`, `refactor/*`, `perf/*`, `docs/*` | `origin/develop` | `develop` | 0 (solo) / 1 (team) | Vercel preview alias rolls to develop branch |
| `feat-exp/*` | `origin/develop` | `develop` | 0–1, **flag required** | Merged with flag OFF — enable via PostHog post-hoc |
| `release/*` | `origin/staging` | `main` | 1 | EAS production build + Supabase production migrations + Admin production deploy |
| `hotfix/*` | `origin/main` | `main` | 1 | EAS production build + Supabase production migrations + back-merge to develop/staging |
| (none) | `origin/develop` | `staging` | — | EAS staging build + Supabase staging migrations |
| (none) | `origin/staging` | `main` | 1 | Production promotion |

**Never** push directly to `main`, `staging`, or `develop`. Branch protection enforces this.

## Daily flow (non-urgent feature)

```bash
# 1. Start
cd ~/Desktop/DEV_Local/borkd
git fetch origin
git worktree add -b feat/<slug> ../borkd-<slug> origin/develop
cd ../borkd-<slug> && pnpm install

# 2. Build + commit using conventional commits
# 3. Open PR to develop, wait for CI green
# 4. Merge (squash)

# 5. Clean up
cd ~/Desktop/DEV_Local/borkd
git worktree remove ../borkd-<slug>
git branch -d feat/<slug>
```

## Release flow (develop → staging → main)

```bash
# Weekly or when enough features have landed:

# 1. Promote develop → staging
#    (open PR from develop to staging in GitHub UI, squash merge)
# 2. CI triggers EAS Staging build + Supabase staging migrations
# 3. QA on staging (TestFlight / Play Internal / admin-staging.borkd.com)
# 4. Once stable, promote staging → main via release/* branch:

cd ~/Desktop/DEV_Local/borkd
git fetch origin
git worktree add -b release/v1.2.0 ../borkd-release-v1.2.0 origin/staging
cd ../borkd-release-v1.2.0
# bump apps/mobile/app.json version to "1.2.0", commit
git push -u origin release/v1.2.0
gh pr create --base main --head release/v1.2.0 --title "release: v1.2.0"

# 5. Merge PR (squash) → main deploys
# 6. Tag the release
cd ~/Desktop/DEV_Local/borkd
git checkout main && git pull
git tag v1.2.0 && git push origin v1.2.0
```

## Hotfix flow (production fire)

```bash
# Production is broken — a regression slipped through or an external
# dependency broke. Time to first fix ≤ 24h.

cd ~/Desktop/DEV_Local/borkd
git fetch origin
git worktree add -b hotfix/<issue-slug> ../borkd-hotfix-<slug> origin/main
cd ../borkd-hotfix-<slug>
pnpm install

# 1. Fix + commit. Keep the diff minimal — no refactors.
# 2. Open PR to main, fast-track CI
gh pr create --base main --head hotfix/<slug> --title "hotfix: <summary>"

# 3. Merge after CI + 1 review.
# 4. Back-merge to staging + develop so the fix isn't lost on next release:
cd ~/Desktop/DEV_Local/borkd
git fetch origin
git checkout staging && git pull
git merge origin/main --no-ff -m "chore(staging): back-merge hotfix/<slug>"
git push origin staging

git checkout develop && git pull
git merge origin/main --no-ff -m "chore(develop): back-merge hotfix/<slug>"
git push origin develop

# 5. Clean up worktree.
```

See `docs/HOTFIX.md` for the full incident-response runbook.

## Experimental features (feat-exp/*)

New feature behind a PostHog flag — lets us merge unfinished work without
exposing it to users, roll out gradually, and kill-switch during incidents.

```bash
# 1. Register the flag in packages/shared/src/feature-flags.ts:
#    export const FLAGS = { NEW_WALK_UI: 'new-walk-ui', ... }
# 2. Wrap the new code path: if (useFeatureFlag(FLAGS.NEW_WALK_UI)) { ... }
# 3. Default the flag OFF in PostHog dashboard before merging.
# 4. Merge. Enable for 5% of users → 25% → 100% via PostHog.
# 5. Once 100% stable for 1 week, land a follow-up PR that drops the
#    flag (feat: finalise new-walk-ui) and removes the gate.
```

CI enforces that every `feat-exp/*` PR has a corresponding entry in
`packages/shared/src/feature-flags.ts`.

## Naming

### Branches

| Prefix | Format | Example |
|--------|--------|---------|
| `feat/` | `feat/<scope>-<slug>` | `feat/mobile-walk-tracking` |
| `feat-exp/` | `feat-exp/<slug>` | `feat-exp/new-walk-ui` |
| `fix/` | `fix/<scope>-<slug>` | `fix/admin-pin-filter` |
| `ui/` | `ui/<slug>` | `ui/bottom-sheet-polish` |
| `chore/` | `chore/<slug>` | `chore/biome-bump` |
| `refactor/` | `refactor/<slug>` | `refactor/walk-state-machine` |
| `perf/` | `perf/<slug>` | `perf/pin-query-index` |
| `docs/` | `docs/<slug>` | `docs/onboarding` |
| `hotfix/` | `hotfix/<issue>` | `hotfix/mapbox-token-rotation` |
| `release/` | `release/v<semver>` | `release/v1.2.0` |

### Commits — conventional commits (enforced by CI)

```
<type>(<scope>)?<!>?: <description>
```

| Type | Usage |
|------|-------|
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 리팩토링 |
| `perf` | 성능 |
| `docs` | 문서 |
| `test` | 테스트 |
| `chore` | 잡일 (deps, 설정) |
| `style` | 포매팅 |
| `ci` | CI/CD |
| `build` | 빌드 시스템 |
| `revert` | revert commit |

Scopes: `mobile`, `admin`, `shared`, `supabase`, `db`, `config`, `ci`, `repo`, `seed`, `release`.

Breaking change: `type!(scope): description` 또는 footer `BREAKING CHANGE:`.

Destructive DB migration은 커밋 body에 `[allow-destructive-migration]` 마커 필수 — 자세한 건 `supabase/migrations/_CONVENTIONS.md` §3.

## PR Evaluation Pipeline

```
PR → Tier 1 (CI) → Tier 2 (NanoClaw Rubric) → Tier 3 (Human) → Merge
```

Tier 1 blocking checks:
- `Lint, Type Check & Test`
- `Security Scan`
- `Migration Lint`
- `Validate Commit Messages`
- `PR Size Check` (warning only)

Tier 2 + 3 상세: `.claude/eval/EVAL_RUBRIC.md`

## Worktree layout

병렬 작업 + CI 세팅의 안전을 위해 **worktree per active branch**.

```
~/Desktop/DEV_Local/
├── borkd/                         main reference (수정 금지)
├── borkd-<slug>/                  feat/fix/ui/chore/refactor/perf/docs (from develop)
├── borkd-hotfix-<slug>/           hotfix/* (from main)
└── borkd-release-v<ver>/          release/* (from staging, 단기)
```

`borkd/`는 main에 고정된 참고용 clone. 코드 수정은 반드시 `borkd-<slug>/` worktree에서. 각 worktree는 독립 `node_modules`, `.turbo`, `.next`, `.expo` 캐시 → 브랜치 전환 비용 0.

### 새 feature
```bash
git worktree add -b feat/<name> ../borkd-<name> origin/develop
cd ../borkd-<name> && pnpm install
```

### Hotfix
```bash
git worktree add -b hotfix/<issue> ../borkd-hotfix-<issue> origin/main
cd ../borkd-hotfix-<issue> && pnpm install
```

### 머지 완료 후 정리
```bash
cd ~/Desktop/DEV_Local/borkd
git worktree remove ../borkd-<name>
git branch -d feat/<name>
```

`git worktree list`로 현재 활성 목록 확인.

## 금지 사항

- `main`/`staging`/`develop` 직접 push 금지 (branch protection)
- Force push on `main`/`staging` 금지
- `git rebase -i` 없이 published commit 재작성 금지
- `supabase db reset` 프로덕션 금지 (hook 차단)
- DoD 없이 PR 오픈 금지 (sprint contract)
- 자기 PR 자기 승인 금지 (team mode)
