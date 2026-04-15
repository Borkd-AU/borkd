# Worktree Conventions

BORKD는 여러 작업을 동시에 진행하므로 **worktree per branch** 패턴을 씀. 각 active 브랜치가 자체 디렉토리 + 자체 `node_modules` + 자체 `.turbo`/`.next`/`.expo` 캐시 → 브랜치 전환 cost 0, 빌드 충돌 0.

## 디렉토리 레이아웃

모든 borkd worktree는 `~/Desktop/DEV_Local/borkd/` 하나의 grouping 폴더 안에 모여 있음. `DEV_Local/` 최상위는 프로젝트당 폴더 하나만 보여서 시각적으로 깔끔.

```
~/Desktop/DEV_Local/
├── blanq/                      (다른 프로젝트)
├── n3rve-onboarding-platform/  (다른 프로젝트)
└── borkd/                      Borkd grouping
    ├── main/                   main reference (수정 금지)
    ├── <slug>/                 feat | fix | ui | chore | refactor | perf | docs (from develop)
    ├── hotfix-<slug>/          hotfix/* (from main)
    └── release-v<ver>/         release/* (from staging, 단기)
```

**명명 규칙**:
- **Main reference**: `borkd/main/` — 항상 `main` branch, 수정 금지
- **Default feature**: `borkd/<slug>/` → 브랜치 `<type>/<slug>`
- **Hotfix**: `borkd/hotfix-<slug>/` → 브랜치 `hotfix/<slug>` (prefix 있으니 tab-completion에서 urgency 보임)
- **Release**: `borkd/release-v<semver>/` → 브랜치 `release/v<semver>`

## 자동화 스크립트

모두 `scripts/ops/` 에 있음.

### `new-branch.sh <type> <slug>`
develop에서 분기 + worktree + `pnpm install` + VS Code 오픈.

```bash
./scripts/ops/new-branch.sh feat walk-multi-dog
```

Allowed types: `feat`, `feat-exp`, `fix`, `ui`, `chore`, `refactor`, `perf`, `docs`, `test`, `style`, `build`, `ci`.

### `hotfix.sh <slug>`
main에서 분기, hotfix 전용.

```bash
./scripts/ops/hotfix.sh mapbox-token-rotation
```

머지 후 `docs/HOTFIX.md` §11 back-merge 절차 필수.

### `release.sh <semver>`
staging에서 release candidate 생성 + `app.json` version bump 자동.

```bash
./scripts/ops/release.sh 1.2.0
```

### `cleanup.sh`
머지된 브랜치의 worktree 일괄 정리. Dirty/unmerged는 자동 skip.

```bash
./scripts/ops/cleanup.sh        # interactive
./scripts/ops/cleanup.sh --yes  # auto-confirm
```

### `rollback-web.sh <project> [n]`
Vercel 이전 배포 promote. `docs/ROLLBACK.md` §1 참조.

## 수동 명령 (스크립트 없이)

```bash
# 새 feature
cd ~/Desktop/DEV_Local/borkd/main
git fetch origin
git worktree add -b feat/<slug> ../<slug> origin/develop
cd ../<slug> && pnpm install

# 정리
cd ~/Desktop/DEV_Local/borkd/main
git worktree remove ../<slug>
git branch -d feat/<slug>
git push origin --delete feat/<slug>
```

## 트러블슈팅

- **"already exists"**: `git worktree list`로 확인 후 remove.
- **"can't delete branch, used by worktree"**: 먼저 `git worktree remove <path>`.
- **Dirty worktree 강제 삭제**: 권장 안 함. 작업 유실 가능. 대신 stash/commit 후 정상 remove.
- **디스크**: pnpm은 `~/.pnpm-store/`로 실제 파일 한 번만 저장. Worktree별 `node_modules`는 symlink라 거의 무료.

## Related

- `docs/GIT_WORKFLOW.md` — 브랜치 taxonomy + promotion matrix
- `docs/HOTFIX.md` — hotfix worktree 후속 절차
- `docs/ROLLBACK.md` — rollback-web.sh 사용처
- `scripts/ops/_lib.sh` — 스크립트 공통 helpers
