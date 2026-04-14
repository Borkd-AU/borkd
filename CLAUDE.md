# Borkd — Project Instructions

## Architecture

Monorepo: pnpm 10.15 + Turborepo. Details → `docs/ARCHITECTURE.md`

| Workspace | Stack |
|-----------|-------|
| `apps/mobile` | Expo 55, React Native, NativeWind, TanStack Query, Supabase, Mapbox |
| `apps/admin` | Next.js 15, React 19, Tailwind 4, Supabase SSR |
| `packages/shared` | TypeScript types, Zod schemas, constants |
| `packages/config` | Biome config |
| `supabase/` | PostgreSQL, Deno Edge Functions, RLS |

**Dependency direction** (enforced by `check-architecture.sh`):
`packages/shared` → `packages/config` → `apps/*` → `supabase/` (never backward)

## Conventions

Details → `docs/CONVENTIONS.md`

- Files: kebab-case. Components: PascalCase. Hooks: `use` prefix. Constants: UPPER_SNAKE_CASE
- Platform branching: `.native.ts` / `.web.ts`
- Biome: single quotes, 2-space, 100 char, trailing commas, semicolons

## Design System (CRITICAL)

Details → `docs/DESIGN_SYSTEM.md`, `.claude/design/TOKEN_MAP.md`, `.claude/design/COMPONENT_MAP.md`

**Mobile과 Admin은 같은 토큰 이름이지만 다른 hex 값.**
반드시 대상 앱 확인 후 해당 앱의 토큰 사용. 하드코딩된 hex 금지.

## Database

Details → `docs/DATABASE.md`

- Supabase PostgreSQL. **RLS 항상 활성화 (예외 없음)**
- Migrations: `supabase/migrations/NNNNN_description.sql`
- Edge Functions: `supabase/functions/<name>/index.ts` (Deno)

## Git Workflow

Details → `docs/GIT_WORKFLOW.md` (branching + promotion matrix)

- Branches: `main` → `staging` → `develop` → `feat/*`, `feat-exp/*`, `fix/*`, `ui/*`, `chore/*`, `refactor/*`, `perf/*`, `docs/*`
- Commits: `type(scope): description` (conventional)
- **main/staging/develop 직접 push 금지**

### Release + Incident runbooks

| Runbook | 언제 | 목표 시간 |
|---------|------|----------|
| `docs/RELEASE.md` | develop → staging → main 승격 | 정기 주 1회 / 격주 |
| `docs/HOTFIX.md` | 프로덕션 장애 fast-fix | 60분 |
| `docs/ROLLBACK.md` | 배포 되돌리기 (Vercel / OTA / DB) | 5분 |
| `docs/INCIDENT.md` | 5단계 incident response | SEV1: 5분 응답 |
| `docs/WORKTREES.md` | worktree 패턴 + ops 스크립트 | reference |
| `docs/ENVIRONMENTS.md` | local / preview / staging / prod 서비스 map | reference |
| `supabase/migrations/_CONVENTIONS.md` | migration 안전성 규칙 | reference |

### Ops scripts

```bash
./scripts/ops/new-branch.sh <type> <slug>    # from develop
./scripts/ops/hotfix.sh <slug>               # from main
./scripts/ops/release.sh <semver>            # from staging + version bump
./scripts/ops/cleanup.sh                     # remove merged worktrees
./scripts/ops/rollback-web.sh <project>      # Vercel promote-previous
```

### Worktree layout (multi-branch parallel work)

- `~/Desktop/DEV_Local/borkd/` = main 참고용 clone, **수정 금지**
- `~/Desktop/DEV_Local/borkd-<scope>/` = feature 브랜치당 1 디렉토리
- 각 worktree는 자체 `node_modules` + `.turbo` 캐시 → 브랜치 간 충돌 0

**새 feature 시작:**
```bash
cd ~/Desktop/DEV_Local/borkd
git fetch origin
git worktree add -b feat/<name> ../borkd-<name> origin/develop
cd ../borkd-<name> && pnpm install
```

**Feature 완료 (PR 머지 후):**
```bash
cd ~/Desktop/DEV_Local/borkd
git worktree remove ../borkd-<name>
git branch -d feat/<name>
```

**현재 활성 worktree:** `git worktree list`로 확인.

## Security

Details → `docs/SECURITY.md`

- .env 커밋 금지. 코드에 시크릿 하드코딩 금지
- service_role은 Edge Functions에서만. anon key만 클라이언트에서
- RLS policy 없이 테이블 생성 금지

## Evaluation Pipeline

Details → `.claude/eval/EVAL_RUBRIC.md`

모든 PR은 3계층 평가 통과 필수:
1. **Tier 1 (CI)**: 타입 체크, 린트, 테스트, 보안 스캔, 아키텍처 체크
2. **Tier 2 (NanoClaw)**: 4기준 스코어링 — Functionality(7), Code Quality(6), Design Fidelity(7), Security(8)
3. **Tier 3 (사람)**: 전략적 판단

**하드 임계값 미달 시 PR 실패.** 생성자 ≠ 평가자 (self-eval 금지).

## Sprint Contracts

작업 시작 전 `current-task.md`에 **Definition of Done** 작성 필수.
DoD 없이 코드 시작 금지. 평가자가 DoD 기준으로 채점.

## Multi-Environment

Details → `docs/MULTI_ENV.md`, `.claude/guides/NANOCLAW_SETUP.md`

- **MacBook Pro**: Claude Code (주 개발)
- **Mac Mini**: NanoClaw (리뷰, 테스트, 병렬 개발, GC)
- **Discord**: "Borkd Dev" 서버 (`.claude/guides/DISCORD_CHANNELS.md`)
- **Lock**: `current-task.md`의 `Locked by` 확인 후 작업

## Failure Registry

에이전트 실패 시 → `.claude/eval/failures/`에 기록 → 패턴 분석 → 하네스 업데이트.
같은 유형의 실패 2번 반복 금지. 1번이면 수정, 2번이면 하네스 결함.

## Garbage Collection

NanoClaw 주간 스캔: 문서 불일치, 아키텍처 위반, 디자인 드리프트, 보안, 테스트 커버리지.
체크리스트 → `.claude/eval/GC_CHECKLIST.md`

## What NOT to Do

- node_modules 수정 금지
- 테스트 없이 비즈니스 로직 금지 (vitest)
- RLS 비활성화 금지
- main force push 금지
- .env 출력/로깅 금지
- supabase db reset 금지
- DoD 없이 코드 시작 금지
- 자기 코드 자기 평가 금지
