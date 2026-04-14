# Release Runbook

`develop` → `staging` → `main` 승격. 고객에게 배포되는 **유일한 경로**. Hotfix는 예외이자 `docs/HOTFIX.md` 참조.

## 주기

- **알파**: on-demand (작업 쌓이면 승격)
- **베타**: 주 1회 수요일
- **GA**: 격주 금요일 + 긴급 hotfix

## 1. develop → staging 승격 (QA)

### 1a. 승격 가능 확인

```bash
cd ~/Desktop/DEV_Local/borkd
git fetch origin
git log --oneline origin/staging..origin/develop
```

develop이 staging보다 앞서 있어야 의미 있음. 역전(staging이 앞) 상태면 다음 릴리스부터 staging을 재시작.

### 1b. PR 오픈

```bash
gh pr create --base staging --head develop \
  --title "release: promote develop → staging" \
  --body "<summary of commits since last staging promotion>"
```

### 1c. CI 통과

- `Lint, Type Check & Test`
- `Security Scan`
- `Migration Lint`
- `Validate Commit Messages`

### 1d. 머지 (squash 아닌 **merge commit**)

Staging은 **linear history 요구 안 함** — merge commit로 "어느 release cycle에 들어간 feature set"을 나중에 추적.

```bash
gh pr merge <n> --merge
```

### 1e. 자동 트리거

`staging` push 이벤트로:
- **EAS Build (Staging)** (`vars.EAS_ENABLED=true` 때)
- **Supabase Migrations (Staging)** (`vars.SUPABASE_CI_ENABLED=true` 때)
- Vercel preview alias: `mobile-staging.borkd.com`, `admin-staging.borkd.com`

### 1f. QA

**48-72h 관찰 기간.** 모바일은 TestFlight / Play Internal 리스트에 자동 배포. 웹은 staging URL.

체크리스트:
- [ ] 주요 user flow (auth, walk tracking, pin creation) 수동 테스트
- [ ] Sentry staging 프로젝트 에러 0
- [ ] PostHog staging 이벤트 흐름 확인
- [ ] Supabase staging 쿼리 지연 정상
- [ ] Mobile 모바일 기기 (iOS + Android) 실기 테스트

문제 발견 시 → `fix/*` 브랜치로 develop 수정 → 다시 staging 승격. 절대 staging에 직접 커밋 금지.

## 2. staging → main 승격 (릴리스)

QA 통과 후.

### 2a. Release branch 생성

```bash
./scripts/ops/release.sh 1.2.0
```

이 스크립트가:
1. `release/v1.2.0` 브랜치 staging에서 분기.
2. `apps/mobile/app.json` `expo.version` → `1.2.0`.
3. Auto commit `chore(release): bump mobile version to v1.2.0`.
4. VS Code 오픈.

### 2b. 변경사항 확인

```bash
cd ~/Desktop/DEV_Local/borkd-release-v1.2.0
git log --oneline origin/main..HEAD
```

### 2c. 릴리스 노트 작성 (선택, 권장)

`docs/releases/v1.2.0.md` 생성:

```markdown
# v1.2.0 — 2026-04-20

## 신규 기능
- Walk multi-dog support (#123)

## 개선
- Pin cluster 성능 2배 빨라짐 (#124)

## 버그 수정
- Android map crash (#125)

## DB Migrations
- 00010_add_multi_dog_columns
```

### 2d. Push + PR

```bash
git push -u origin release/v1.2.0
gh pr create --base main --head release/v1.2.0 --title "release: v1.2.0"
```

### 2e. 머지 (required approval 1)

```bash
gh pr merge <n> --merge
```

### 2f. 자동 트리거 (main push)

- **EAS Build (Production)** → App Store / Play Store 제출용 IPA/AAB 빌드
- **Supabase Migrations (Production)** → `<PROD_REF>` DB에 forward migrate
- Vercel production alias: `mobile.borkd.com`, `admin.borkd.com`

### 2g. Tag

```bash
cd ~/Desktop/DEV_Local/borkd
git checkout main && git pull
git tag v1.2.0 && git push origin v1.2.0
```

### 2h. App Store / Play Store 제출

EAS Submit 설정 완료 시:
```bash
cd apps/mobile
eas submit --platform all --profile production --non-interactive
```

아니면 수동:
- App Store Connect: TestFlight 내부 테스터 → 외부 → App Review → Release
- Play Console: Internal → Closed → Open → Production

Apple Review 1-3일. Release는 수동 publish.

## 3. 사후 (Post-release)

### 3a. 24h 모니터링

- Sentry 프로덕션 에러 확인
- PostHog crash rate / onboarding funnel
- Supabase slow query log
- Vercel analytics

에러 급증 → `docs/INCIDENT.md` 발동.

### 3b. Release branch 정리

```bash
cd ~/Desktop/DEV_Local/borkd
git worktree remove ../borkd-release-v1.2.0
git branch -d release/v1.2.0
git push origin --delete release/v1.2.0
```

Tag는 영구 보존 — rollback 시 참조용.

### 3c. develop 리셋 감지

릴리스 후 develop이 main과 크게 벌어지지 않았는지 확인:
```bash
git log --oneline origin/main..origin/develop | wc -l
```

정기 릴리스 주기 (주 1회 / 격주)를 지키면 자연스럽게 bounded.

## 4. 비상 Release (out-of-band)

정기 주기 외 긴급 feature 릴리스가 필요한 경우:
1. hotfix 경로가 아님 (bug 수정이 아님)
2. 평소보다 짧은 QA (24h 이내)
3. 승인 2명 필수 (solo mode면 admin bypass)
4. Post-release 모니터링 72h

## Checklist (매 릴리스)

- [ ] develop → staging PR 머지, CI pass
- [ ] Staging QA 48-72h 통과, 에러 없음
- [ ] `scripts/ops/release.sh <ver>` 실행
- [ ] `apps/mobile/app.json` version bump 확인
- [ ] Release notes 작성 (권장)
- [ ] release/v<ver> → main PR 머지
- [ ] EAS production build 성공
- [ ] Supabase production migration 적용
- [ ] `v<ver>` tag push
- [ ] App Store / Play Store 제출
- [ ] 24h 모니터링
- [ ] Release worktree 정리

## Related

- `docs/GIT_WORKFLOW.md` — 브랜치 taxonomy
- `docs/HOTFIX.md` — 비상 수정 (release 절차 우회)
- `docs/ROLLBACK.md` — 릴리스 실패 시
- `docs/INCIDENT.md` — 장애 대응
- `docs/ENVIRONMENTS.md` — 각 환경의 서비스 map
- `scripts/ops/release.sh` — version bump 자동화
