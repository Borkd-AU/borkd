# Supabase Migration Conventions

이 폴더의 모든 `.sql` 마이그레이션이 지켜야 하는 규칙. `migration-lint` CI 잡이 강제.

## 1. 파일명

`NNNNN_snake_case_description.sql` — 5자리 zero-padded, `00001` 부터 순차.

각 migration은 선택적으로 **companion rollback file**을 가짐:
`NNNNN_snake_case_description_rollback.sql`

rollback은 자동 실행되지 않음 — 장애 시 `docs/ROLLBACK.md` 절차에 따라 수동 실행.

## 2. Idempotent DDL (의무)

마이그레이션은 동일 DB에 **두 번 적용해도 에러 없이** 통과해야 함. 이유:
- Supabase branching이 동일 migration을 여러 branch DB에 반복 재생
- CI dry-run과 실제 prod 적용 사이 중복 가능
- 장애 복구 시 부분 적용된 migration 재시도

### 필수 패턴

```sql
-- Tables
CREATE TABLE IF NOT EXISTS public.foo (...);
ALTER TABLE public.foo ADD COLUMN IF NOT EXISTS new_col TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_foo_bar ON public.foo(bar);

-- Functions / triggers — always OR REPLACE
CREATE OR REPLACE FUNCTION public.foo_fn(...) RETURNS ... AS $$ ... $$;
DROP TRIGGER IF EXISTS foo_trigger ON public.foo;
CREATE TRIGGER foo_trigger BEFORE UPDATE ON public.foo ...;

-- Policies — DROP first (ENABLE ROW LEVEL SECURITY는 idempotent)
DROP POLICY IF EXISTS "foo read own" ON public.foo;
CREATE POLICY "foo read own" ON public.foo ...;

-- Seed rows
INSERT INTO public.foo (...) VALUES (...) ON CONFLICT (id) DO NOTHING;
```

### 예외: PostgreSQL에 `IF NOT EXISTS`가 없는 경우

- CHECK constraint, FK constraint, UNIQUE constraint — `ALTER TABLE ADD CONSTRAINT` 에는 없음.
  → `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;` 블록으로 감싸기.

## 3. Backward-compatible schema (의무)

새 migration은 **같은 릴리스 cycle 동안 이전 코드와 호환**되어야 함.

불변식: 배포 순서가
```
(a) DB migration 먼저  →  (b) 새 코드 배포
```
이기 때문에, (a) 시점엔 아직 **old code가 실행 중**. Old code가 new schema에서 크래시하면 다운타임.

### 안전한 변경

- ✅ `ADD COLUMN ... DEFAULT ...` (NOT NULL이면 DEFAULT 필수)
- ✅ `ADD INDEX`
- ✅ `CREATE TABLE`
- ✅ `ADD CHECK constraint` (기존 데이터가 이미 만족)
- ✅ 새 Function / Policy / Trigger

### 위험한 변경 (DANGEROUS — 2-PR 규칙)

- ❌ `DROP COLUMN` — old code가 SELECT 하면 런타임 에러
- ❌ `ALTER COLUMN ... RENAME` — old code가 기존 이름 참조
- ❌ `ALTER COLUMN ... TYPE` (호환 안 되는 캐스트)
- ❌ 기존 CHECK constraint 강화 (기존 데이터 위반 가능)

**2-PR 절차:**

1. **PR A**: 코드에서 해당 컬럼/이름 사용 중단. 프로덕션 배포 + 1주일 모니터링 (에러 0 확인).
2. **PR B**: DROP / RENAME migration. 커밋 메시지에 `[allow-destructive-migration]` 마커 포함.

CI `migration-lint`가 2단계 없이 destructive DDL을 발견하면 차단.

## 4. RLS 항상 활성화 (의무)

**모든 `CREATE TABLE public.X`** 는 같은 PR 내 어떤 migration에든 `ALTER TABLE public.X ENABLE ROW LEVEL SECURITY` 가 있어야 함.

CI `security-scan` 잡의 "Check RLS on new migrations" 스텝이 cross-file 검증.

Policy는 **항상 DROP POLICY IF EXISTS** 먼저, 그다음 CREATE. 정책 rename/update를 idempotent하게.

## 5. Rollback script

각 non-trivial migration은 `_rollback.sql` 형제 파일을 커밋해야 함.

`migration-lint`는 아래 중 하나가 있으면 rollback 요구:
- `CREATE TABLE`
- `ADD COLUMN ... NOT NULL`
- `DROP COLUMN` / `DROP TABLE`
- `CREATE INDEX` (long-running; rollback 시 drop 필요할 수 있음)

Rollback 파일 예:
```sql
-- 00007_permanent_pins_rollback.sql
-- Reverses 00007_permanent_pins.sql. Run manually in production only
-- if the forward migration causes a live incident. Data loss warning:
-- any rows inserted against the new columns after forward migration
-- will have those columns dropped.
BEGIN;

ALTER TABLE public.pins DROP CONSTRAINT IF EXISTS pins_expiry_matches_type;
ALTER TABLE public.pins DROP CONSTRAINT IF EXISTS pins_source_unique;
DROP INDEX IF EXISTS idx_pins_permanent;
ALTER TABLE public.pins
  DROP COLUMN IF EXISTS pin_type,
  DROP COLUMN IF EXISTS subcategory,
  DROP COLUMN IF EXISTS source,
  DROP COLUMN IF EXISTS source_id,
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS attribution;

COMMIT;
```

## 6. Destructive override

꼭 필요한 경우 (e.g. dev DB 클린업, GDPR 삭제) destructive migration 허용:

1. 커밋 메시지 본문에 **`[allow-destructive-migration]`** 마커 포함.
2. PR 설명에 이유 명시.
3. 1명 이상 리뷰 승인 (develop protection).

Override 없이 destructive DDL 발견 시 CI 차단.

## 7. Testing migrations locally

```bash
# 깨끗한 로컬 DB에서 전체 재생
supabase db reset   # 주의: 로컬 데이터 초기화

# 또는 branch 테스트
supabase db diff --local --schema public > /tmp/new.sql
# /tmp/new.sql 검토 후 새 migration 파일 생성
```

Supabase branching 활성화 시 PR마다 자동 branch DB가 생기므로 PR 기반 검증이 표준.

## 8. Checklist (새 migration PR 작성 시)

- [ ] 파일명 `NNNNN_snake_case.sql` (다음 번호)
- [ ] 모든 DDL `IF NOT EXISTS` / `OR REPLACE` / `ON CONFLICT DO NOTHING`
- [ ] `CREATE TABLE`마다 RLS 활성화 존재 (같은 PR 내)
- [ ] Backward-compat 검증 (old code + new schema 시나리오 통과)
- [ ] `_rollback.sql` 작성 (non-trivial 변경 시)
- [ ] Destructive이면 2-PR 절차 따름 + `[allow-destructive-migration]` 마커
- [ ] 로컬 `supabase db reset` 으로 재생 성공
