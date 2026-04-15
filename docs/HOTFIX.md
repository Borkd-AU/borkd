# Hotfix Runbook

**목표**: 프로덕션 장애를 **main에 직접 수정 PR**로 빠르게 패치, 일반 개발 흐름(develop → staging → main) 우회.

## 언제 Hotfix 경로를 쓸까

| 상황 | Hotfix? |
|------|--------|
| 로그인 100% 실패 (SEV1) | ✅ |
| 치명 보안 취약점 (공개되면 악용 가능) | ✅ |
| 일부 사용자만 핀 생성 실패 (SEV2) | ⚠️ 일반 fix/* 또는 release 묶음 권장 |
| UI 레이아웃 깨짐 (SEV3) | ❌ 일반 `fix/*` → develop |

**원칙**: hotfix는 **scope 최소**. 여러 문제 묶지 말 것. 리팩터 금지.

## 절차 (12단계, 30-60분 목표)

### 1. Stabilize 먼저 (필요 시)
**완전히 병행 가능**: `docs/ROLLBACK.md`로 일단 사용자 피해 멈추고, 아래 hotfix 절차로 영구 수정.

### 2. Hotfix worktree 생성

```bash
cd ~/Desktop/DEV_Local/borkd
git fetch origin
git worktree add -b hotfix/<issue-slug> ../borkd-hotfix-<slug> origin/main
cd ../borkd-hotfix-<slug>
pnpm install
```

**중요**: origin/main에서 분기 (develop 아님). develop엔 아직 머지 안 된 feature가 있어서 같이 딸려 들어가면 안 됨.

### 3. 재현 테스트 작성

**항상 먼저 테스트**. 재현 못 하면 수정 검증 불가.

### 4. 최소 수정

`supabase/migrations/_CONVENTIONS.md` + 일반 리뷰 규칙 적용. 추가 리팩터 금지.

### 5. 로컬 검증

```bash
pnpm turbo lint check test
cd apps/mobile && pnpm build:web && pnpm serve:web  # 웹 프리뷰 모바일 뷰에서 확인
```

### 6. 커밋 메시지

```
fix: <한 줄 설명>

<detailed 본문>

Hotfix for SEV<1|2> incident <thread-url>.
Rollback plan: <Vercel promote-previous / eas update --republish>

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
```

### 7. Push + PR to main

```bash
git push -u origin hotfix/<slug>
gh pr create --base main --head hotfix/<slug> \
  --title "hotfix: <summary>" \
  --body "$(cat <<'EOF'
## Incident
<Slack thread / Sentry link>

## Root cause
<한 문단>

## Fix
<한 문단>

## Test plan
- [ ] Unit test added (reproduces bug)
- [ ] Staging smoke OK
- [ ] Web preview OK

## Rollback plan
- Vercel: previous deployment \`<url>\`
- EAS OTA: update group \`<id>\`
EOF
)"
```

### 8. CI fast-track

Required checks: `Lint, Type Check & Test`, `Security Scan`, `Migration Lint`, `Branch Policy`, `Validate Commit Messages`.

Branch protection은 **main에 대한 1 approval** 요구 (solo 모드면 admin bypass). 리뷰 담당자: 장애 인지하는 사람 아닌 **다른 팀원** (Joon → Ryan, vice versa).

### 9. Merge (squash)

```bash
gh pr merge <N> --squash
```

머지 즉시 CI가 `main` push 이벤트 → EAS Production build + Supabase prod migration (활성 시).

### 10. 배포 확인

- Vercel: admin.borkd.com → 새 hash의 배포 확인
- Mobile: EAS Build 완료 대기 → `eas update --channel production` (또는 Build 자동 배포 설정 시 자동)
- DB: Supabase migration 적용 확인 (`supabase migration list`)

### 11. Back-merge to develop + staging

**필수**. 안 하면 다음 릴리스에서 hotfix가 **되돌려짐**.

```bash
cd ~/Desktop/DEV_Local/borkd
git fetch origin

# develop으로
git checkout develop && git pull
git merge origin/main --no-ff -m "chore: back-merge hotfix/<slug> from main"
git push origin develop

# staging으로 (staging이 develop보다 앞섰을 수도 있으니 주의)
git checkout staging && git pull
git merge origin/main --no-ff -m "chore: back-merge hotfix/<slug> from main"
git push origin staging
```

**Branch protection 때문에 push 막히면** → PR로 열어서 **fast-forward** 머지:

```bash
# 방법 B: PR로 back-merge
gh pr create --base develop --head main --title "chore: back-merge hotfix/<slug> to develop" --body "Back-merge of main PR #<N>"
gh pr create --base staging --head main --title "chore: back-merge hotfix/<slug> to staging" --body "Back-merge of main PR #<N>"
```

`chore/branch-policy` CI가 `main → develop/staging` back-merge를 허용 (위 PR #5에 추가된 화이트리스트).

### 12. Worktree 정리

```bash
cd ~/Desktop/DEV_Local/borkd
git worktree remove ../borkd-hotfix-<slug>
git branch -d hotfix/<slug>
```

## 타임라인 목표

| 단계 | 목표 시간 | 누적 |
|------|----------|------|
| Hotfix worktree 생성 + 재현 테스트 | 10분 | 10분 |
| Fix | 15분 | 25분 |
| 로컬 검증 + PR open | 5분 | 30분 |
| CI + 리뷰 | 15분 | 45분 |
| Merge + 배포 확인 | 10분 | 55분 |
| Back-merge | 5분 | 60분 |

**목표: 60분 안에 수정 + 배포 + back-merge 완료.**

## Anti-patterns (금지)

- ❌ Hotfix에 리팩터 / 관련 없는 fix 묶기 → scope 커지고 리뷰 지연
- ❌ develop에서 분기 → 아직 머지 안 된 feature가 main에 딸려감
- ❌ Back-merge 생략 → 다음 릴리스에서 hotfix 사라짐
- ❌ 자기 PR 자기 approve (team mode)
- ❌ Force push on main

## Related

- `docs/INCIDENT.md` — detect → communicate → stabilize
- `docs/ROLLBACK.md` — 배포 되돌리기 (hotfix 전 병행)
- `docs/GIT_WORKFLOW.md` §Hotfix flow — 요약판
