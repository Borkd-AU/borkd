# Environments & External Services

Borkd 각 환경(local / staging / production)의 서비스 map. Beta 준비 시 실제 값으로 채움.

## 환경 4개

| Environment | Git branch | Mobile channel | Admin URL | Supabase project | 활성 시점 |
|-------------|-----------|----------------|-----------|------------------|----------|
| **Local** | any | — (dev client) | http://localhost:3001 | http://localhost:54321 | 매일 |
| **Preview** | feat/*, fix/*, … | EAS Preview channel | `borkd-admin-git-<br>.vercel.app` | Supabase branch (PR별) | PR 오픈 시 |
| **Staging** | `staging` | EAS Staging channel | admin-staging.borkd.com | `ubkteksfmzxfhsphroog` | staging 머지 시 |
| **Production** | `main` | EAS Production channel | admin.borkd.com | `<PROD_REF>` (TBD) | main 머지 시 (= 공식 릴리스) |

**Preview DB**: PR마다 Supabase branching ($25/mo)이 자동 branch DB 생성. 실험이 staging 데이터 오염 0.

## 외부 서비스 map

### Supabase

| Env | Project ref | URL | 용도 |
|-----|-------------|-----|------|
| Local | — | http://127.0.0.1:54321 | Docker 스택 (`supabase start`) |
| Staging | `ubkteksfmzxfhsphroog` | https://ubkteksfmzxfhsphroog.supabase.co | 1241 seed pins 적재, 팀 내부 QA |
| Production | `<PROD_REF>` (TBD) | `https://<PROD_REF>.supabase.co` | 실고객 데이터, Beta 진입 시 생성 |

Branching: Supabase Pro 활성 후 PR마다 자동 branch DB. `_CONVENTIONS.md` 규칙대로 idempotent migration + rollback sibling.

### Vercel (웹 배포 2 프로젝트)

| Project | Repo path | Domains |
|---------|-----------|---------|
| `borkd-admin` | `apps/admin` | admin.borkd.com (prod), admin-staging.borkd.com (staging), `borkd-admin-git-<branch>.vercel.app` (preview) |
| `borkd-mobile-dev` | `apps/mobile` | mobile.borkd.com (prod, 웹 전용), mobile-staging.borkd.com (staging), `borkd-mobile-dev-git-<branch>.vercel.app` (preview) |

**Setup 단계** (아직 미수행):
1. Vercel 대시보드에서 프로젝트 2개 생성
2. Root directory 지정 (`apps/admin`, `apps/mobile`)
3. Node 20/22 (Node 24 금지 — Expo 55 비호환)
4. `vars.EAS_ENABLED`, `vars.SUPABASE_CI_ENABLED` 활성 시 GitHub Actions 연동
5. Custom domain 연결

### Mapbox

| Token | Allowed URLs | 용도 |
|-------|--------------|------|
| `pk.borkd-dev.*` | localhost, *.vercel.app | 개발 + preview |
| `pk.borkd-staging.*` | *-staging.borkd.com | staging |
| `pk.borkd-prod.*` | *.borkd.com | production |

URL 제한 필수 — token이 leak되어도 도메인 안 맞으면 거부됨.

### Expo / EAS

| Env | EAS profile | Channel | 트리거 |
|-----|-------------|---------|--------|
| Dev | `development` | — | 로컬 `eas build --profile development` |
| Preview | `preview` | preview | develop push (EAS_ENABLED=true 시) |
| Staging | `staging` | staging | staging push |
| Production | `production` | production | main push |

Setup (Beta 직전):
1. expo.dev 계정
2. Organization `borkd` 생성
3. `eas login`
4. GitHub secret `EXPO_TOKEN` (Settings → Access Tokens)
5. GitHub var `EAS_ENABLED=true` 활성
6. Apple Developer $99/yr + Play Developer $25 one-time

### PostHog (Feature Flags + Analytics)

| Project | 용도 |
|---------|------|
| `borkd-staging` | staging + preview 환경 |
| `borkd-prod` | production |

Setup:
1. posthog.com 계정
2. Projects 2개 생성
3. API keys → Vercel env vars (`EXPO_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_KEY`)
4. FLAGS 레지스트리에 키 등록 (`packages/shared/src/feature-flags.ts`)
5. 대시보드에서 flag 생성 + OFF로 시작

### GitHub

| Asset | 용도 |
|-------|------|
| Repository | `ddalgiwuu/borkd` |
| Actions | CI/CD workflow 2개 (`.github/workflows/ci.yml`, `pr-checks.yml`) |
| Secrets | `EXPO_TOKEN`, `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` (Beta) |
| Variables | `EAS_ENABLED`, `SUPABASE_CI_ENABLED` (on/off toggles) |
| Branch protection | main (1 approval + CI), staging (CI), develop (CI) |

### Sentry (미설정 — Beta 직전)

| Project | 용도 |
|---------|------|
| `borkd-mobile` | iOS + Android React Native errors |
| `borkd-admin` | Next.js server + client errors |

Setup: sentry.io 계정 + DSN 발급 + SDK 설치 + source maps upload hook.

### Slack (Incident 채널)

| Channel | 용도 |
|---------|------|
| `#borkd-incidents` | SEV1/2/3 장애 thread |
| `#borkd-releases` | Release 공지 + staging 배포 알림 |
| `#borkd-dev` | 일반 개발 |

Webhooks → GitHub Actions + Sentry + PostHog → 자동 알림.

## 환경변수 매트릭스

Vercel 프로젝트 각각 환경별 scope:

### Mobile (`borkd-mobile-dev` Vercel)

| Variable | Production scope | Preview scope | Development scope |
|----------|-----------------|---------------|-------------------|
| `EXPO_PUBLIC_SUPABASE_URL` | `https://<PROD_REF>.supabase.co` | Supabase branching (auto) | `http://localhost:54321` |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `<prod anon>` | `<staging anon>` | `<local anon>` |
| `EXPO_PUBLIC_MAPBOX_TOKEN` | `pk.borkd-prod.*` | `pk.borkd-staging.*` | `pk.borkd-dev.*` |
| `EXPO_PUBLIC_POSTHOG_KEY` | `<prod key>` | `<staging key>` | (empty) |
| `EXPO_PUBLIC_POSTHOG_HOST` | https://app.posthog.com | same | same |

### Admin (`borkd-admin` Vercel)

| Variable | Production | Preview | Development |
|----------|-----------|---------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | prod | staging | local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | prod | staging | local |
| `SUPABASE_SERVICE_ROLE_KEY` | **prod (server only!)** | staging | local |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | prod | staging | dev |
| `NEXT_PUBLIC_POSTHOG_KEY` | prod | staging | (empty) |

`SUPABASE_SERVICE_ROLE_KEY`는 절대 클라이언트로 유출 금지. 서버 컴포넌트 + Server Actions 전용.

## 도메인

| Domain | Vercel project | 환경 |
|--------|---------------|------|
| `borkd.com` | — | 마케팅 사이트 (별도, TBD) |
| `admin.borkd.com` | `borkd-admin` (main) | Production admin |
| `admin-staging.borkd.com` | `borkd-admin` (staging alias) | Staging admin |
| `mobile.borkd.com` | `borkd-mobile-dev` (main) | Production mobile web (dev preview) |
| `mobile-staging.borkd.com` | `borkd-mobile-dev` (staging alias) | Staging mobile web |
| `status.borkd.com` | (TBD — statuspage.io 등) | 상태 페이지 |

## Beta 진입 체크리스트 (요약)

- [ ] Supabase production 프로젝트 생성, `<PROD_REF>` 기록
- [ ] Supabase branching $25/mo 활성
- [ ] Mapbox production token 발급, URL 제한
- [ ] Expo 계정 + EXPO_TOKEN GitHub secret
- [ ] Apple Developer $99/yr
- [ ] Google Play Developer $25 one-time
- [ ] Vercel 프로젝트 2개 + custom domain + env vars
- [ ] PostHog 2 projects + keys
- [ ] Sentry 2 projects + DSNs
- [ ] GitHub branch protection 활성
- [ ] `vars.EAS_ENABLED=true`, `vars.SUPABASE_CI_ENABLED=true`
- [ ] Staging에서 전체 release runbook (release.sh, PR to main, EAS build, 스토어 제출) 1회 리허설

## Related

- `docs/RELEASE.md` — 릴리스 절차
- `docs/HOTFIX.md` — 비상 수정
- `docs/ROLLBACK.md` — 복구 절차
- `docs/INCIDENT.md` — 장애 대응
- `apps/mobile/.env.example` + `apps/admin/.env.example` — 변수 레퍼런스
