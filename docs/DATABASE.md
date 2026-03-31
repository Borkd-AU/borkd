# Borkd Database Conventions

## Stack

- **Supabase** PostgreSQL (managed)
- **Local**: Supabase CLI (API 54321, DB 54322, Studio 54323)
- **ORM**: None — Supabase JS client direct queries
- **Validation**: Zod schemas in `packages/shared`

## RLS (Row Level Security)

**RLS 항상 활성화. 예외 없음.**

새 테이블 생성 시 반드시:
1. `ALTER TABLE <name> ENABLE ROW LEVEL SECURITY;`
2. 최소 1개 이상의 RLS policy 포함
3. `supabase/migrations/00005_create_rls_policies.sql` 패턴 참조

## Migrations

- 파일명: `supabase/migrations/NNNNN_description.sql` (5자리 순번)
- 현재 마이그레이션: 00001 ~ 00006
- `supabase db reset` 사용 금지 — 마이그레이션으로 관리

## Edge Functions

- 위치: `supabase/functions/<name>/index.ts`
- Runtime: Deno
- 공유 유틸: `supabase/functions/_shared/`
  - `auth.ts` — 인증 헬퍼
  - `response.ts` — 응답 포맷
  - `validate.ts` — 입력 검증
  - `cors.ts` — CORS 헤더

## Type Patterns

`packages/shared/src/types/`:
```typescript
// Base type (SELECT)
interface User { id: string; name: string; created_at: string; }

// Insert variant (INSERT)
type UserInsert = Omit<User, 'id' | 'created_at'>;

// Update variant (UPDATE)
type UserUpdate = Partial<UserInsert>;
```

## Keys and Authentication

| Key | Usage | Where |
|-----|-------|-------|
| `anon` key | Client-side (public) | `EXPO_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key | Server-side only | Edge Functions only, NEVER in client |

## Current Schema

| Table | Migration |
|-------|-----------|
| users | 00001 |
| dogs | 00002 |
| walks | 00003 |
| pins | 00004 |
| RLS policies | 00005 |
| Backend functions | 00006 |
