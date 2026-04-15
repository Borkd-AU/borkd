# Rollback Runbook

**목표**: 최근 배포가 프로덕션을 깨뜨렸을 때 **5분 이내**에 이전 상태로 복구.

3개 레이어 각각 롤백 절차:
1. **Web (Vercel)** — 즉시, 안전, 자주 씀
2. **Mobile OTA (EAS Update)** — 빠름, JS 변경만 해당
3. **DB (Supabase)** — 복잡, 신중, 마지막 수단

## 전제

- `docs/INCIDENT.md`에서 **Stabilize** 단계. 롤백 = 일단 피해 멈추기.
- 근본 원인 파악 전에 롤백. 분석은 나중.
- 각 레이어 롤백 시 **Slack thread에 동시 기록**.

---

## 1. Vercel Web Rollback (Admin / Mobile-web preview)

**가장 안전. 가장 빠름 (30초).**

Vercel은 모든 배포를 영구 URL로 보존 — 이전 배포를 "현재"로 승격만 하면 됨.

### 1a. 대시보드에서 (권장)

1. https://vercel.com/<team>/<project>/deployments
2. 직전 **프로덕션** 배포 (green) 찾기
3. `⋯` → **Promote to Production**
4. 1분 내 반영 확인

### 1b. CLI에서

```bash
# 리스트 보기
vercel ls borkd-admin --scope=<team> --limit 5

# 특정 배포를 현재 도메인에 alias
vercel alias set <deployment-url>.vercel.app admin.borkd.com --scope=<team>

# 또는 자동화 스크립트 (Phase 8)
./scripts/ops/rollback-web.sh borkd-admin
```

### 1c. 검증

- 브라우저 cache 무시하고 reload (Cmd+Shift+R)
- `curl -I https://admin.borkd.com` → X-Vercel-Id에서 이전 deployment 확인
- 증상 재현 시도 → 사라졌는지 확인

**주의**: 롤백은 **코드**만 되돌림. Migration이 같이 깨졌으면 3번도 필요.

---

## 2. Mobile OTA Rollback (EAS Update)

**JS/TS/assets 변경**만 되돌림. Native 코드/deps 변경은 리빌드 필요.

### 2a. `eas update --republish`

```bash
cd apps/mobile

# 현재 channel에 배포된 업데이트 목록
eas update:list --channel production --limit 5

# 직전 업데이트 ID 찾기 (가장 최근 '성공한' 것 = 범인 직전)
# 예: update group id abcd-1234

# 재배포
eas update --republish --group <update-group-id> --channel production
```

재배포 의미: 그 update manifest를 다시 "최신"으로 마킹. 사용자가 앱 다음에 열면 자동 fetch.

### 2b. 커버리지

OTA로 롤백 가능:
- ✅ JS/TS 코드 변경
- ✅ React Native 컴포넌트 수정
- ✅ 이미지 / 폰트 / JSON 자산

OTA로 **롤백 불가** (앱 스토어 제출 필요):
- ❌ `apps/mobile/app.json` 네이티브 설정 (`plugins`, `ios.infoPlist`)
- ❌ 새 네이티브 모듈 추가 (npm package)
- ❌ 기존 네이티브 모듈 버전 업
- ❌ `runtimeVersion` 변경

**runtimeVersion 매칭** 필수: OTA update는 앱이 빌드된 runtimeVersion과 같아야 적용됨. 우리는 `policy: "appVersion"` 사용 → app.json version 같으면 OK.

### 2c. OTA 불가 시 대안

- **EAS Build + Submit** (Apple 리뷰 1-3일 대기)
- **긴급 서비스 차단**: Supabase Edge Function에서 특정 버전 reject (feature flag 있으면 더 쉬움 — Phase 5)

---

## 3. Supabase DB Rollback

**가장 위험. 신중. 마지막 수단.**

Migration은 forward-only라 자동 롤백 없음. 수동으로 `_rollback.sql` 실행.

### 3a. 어떤 migration을 되돌릴까

1. 가장 최근 `supabase db push` 이후 적용된 migration 파일 확인
   ```bash
   # staging
   SUPABASE_ACCESS_TOKEN=<token> \
   supabase migration list --project-ref ubkteksfmzxfhsphroog
   ```
2. 해당 파일의 sibling `<name>_rollback.sql` 파일 열기
3. 헤더의 **데이터 손실 경고** 읽기

### 3b. 실행 (production은 극도로 신중)

**Supabase Studio → SQL editor**:

```sql
-- 예: 00007_permanent_pins가 문제
-- 00007_permanent_pins_rollback.sql 내용 복사해 실행

BEGIN;
-- (rollback SQL 내용)
COMMIT;
```

**TIP**: 프로덕션에서 항상 `BEGIN` → 실행 → `COMMIT` (로컬 테스트 후에만). 또는 먼저 `ROLLBACK` 시험.

### 3c. 검증

- 앱에서 해당 기능 다시 실행 → 에러 없는지
- `public.<table>` 컬럼 구조 확인:
  ```sql
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema='public' AND table_name='<affected>';
  ```

### 3d. 주의사항

- Supabase Pro **point-in-time recovery** (별도 기능) 가능 — 최후 수단
- Rollback 후 **코드도 같이 되돌려야** (forward migration에 의존하는 코드는 새 schema 기대함)
- 1, 2, 3을 **역순**으로: DB 롤백 (3) → 앱 OTA 롤백 (2) → 웹 롤백 (1)

---

## 복합 롤백 순서 (다층 장애)

배포 파이프라인:
```
Code PR → Migration → Admin Vercel → Mobile EAS Build → EAS Update (OTA)
```

문제가 어디서 터졌는지 따라 역순:

| 장애 위치 | 롤백 순서 |
|----------|----------|
| 앱에서만 (UI 버그) | OTA (2) |
| 웹에서만 (admin 버그) | Vercel (1) |
| 앱 + 웹 (공통 코드) | 1 + 2 |
| DB migration 직후 모두 깨짐 | **3 → 2 → 1** (역순) |
| DB 깨졌는데 rollback 파일 없음 | Supabase support 티켓 + point-in-time recovery |

---

## Rollback 리허설 (월 1회)

프로덕션 장애 전에 **staging에서 실제로 돌려봄**:

1. Staging Supabase에 가짜 bad migration push
2. `_rollback.sql` 실행 → 복구 확인
3. 소요 시간 기록

리허설 기록: `docs/postmortems/rollback-drills/<date>.md`

---

## 자동화 스크립트 (Phase 8)

- `scripts/ops/rollback-web.sh <project>` — Vercel alias swap 래퍼
- `scripts/ops/rollback-ota.sh <channel>` — `eas update --republish` 래퍼
- (DB는 자동화 안 함 — 리뷰 필수)

## Related

- `docs/INCIDENT.md` — 장애 대응 전체 플로우
- `docs/HOTFIX.md` — 롤백 후 영구 수정 PR 절차
- `supabase/migrations/_CONVENTIONS.md` — rollback sibling 규칙
