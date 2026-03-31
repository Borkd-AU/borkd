# Borkd Architecture

## Monorepo Structure

```
borkd/
├── apps/
│   ├── mobile/          Expo 55 + React Native + NativeWind
│   └── admin/           Next.js 15 + React 19 + Tailwind 4
├── packages/
│   ├── shared/          TypeScript types, Zod schemas, constants
│   └── config/          Biome linter/formatter config
├── supabase/
│   ├── migrations/      PostgreSQL DDL (5-digit numbered)
│   └── functions/       Deno Edge Functions
└── .claude/             Harness engineering
```

## Dependency Direction (ENFORCED)

```
packages/shared (Types + Schemas + Constants)
         ↓
packages/config (Biome config)
         ↓
apps/mobile    apps/admin     (App layer — independent)
         ↓           ↓
supabase/                      (Backend — independent, uses shared types)
```

### Rules

| Rule | Enforced By |
|------|------------|
| `apps/mobile` cannot import from `apps/admin` | `check-architecture.sh` hook |
| `apps/admin` cannot import from `apps/mobile` | `check-architecture.sh` hook |
| `packages/shared` cannot import from `apps/*` | `check-architecture.sh` hook |
| `apps/*` cannot import from `supabase/functions/` | `check-architecture.sh` hook |
| Cross-cutting concerns go through `packages/shared` | Convention |

### Violation Error Messages

린트/hook 에러 시 교정적 메시지 제공:

```
VIOLATION: apps/mobile cannot import from apps/admin in <file>.
→ 공용 코드는 packages/shared/로 이동하세요.
→ See docs/ARCHITECTURE.md for dependency rules.
```

## Tech Stack Versions

| Component | Version | Updated |
|-----------|---------|---------|
| Node.js | >= 20 | — |
| pnpm | 10.15.0 | — |
| Turborepo | ^2.5.0 | — |
| Expo | ~55.0.0 | — |
| React Native | 0.83.x | — |
| React | ^19.0.0 | — |
| Next.js | ^15.1.0 | — |
| Tailwind (admin) | ^4.0.0 | — |
| NativeWind (mobile) | preset | — |
| Supabase JS | ^2.99.3 | — |
| TanStack Query | ~5.75.0 | — |
| Biome | 1.9.4 | — |
| TypeScript | ~5.7.0 | — |

## Workspace Details

### apps/mobile
- **Router**: Expo Router (file-based)
- **State**: TanStack Query (server) + Context API (auth) + MMKV (persistence)
- **Maps**: @rnmapbox/maps
- **Forms**: react-hook-form + Zod
- **Animation**: moti (Reanimated)
- **Auth**: Email/password + OAuth (Google, Apple)

### apps/admin
- **Router**: Next.js App Router (server components default)
- **Maps**: react-map-gl (Mapbox GL)
- **Auth**: Supabase SSR adapter

### packages/shared
- **Types**: User, Dog, Walk, Pin (with Insert/Update variants)
- **Schemas**: Zod validation (GPS coords, strings, datetimes, UUIDs)
- **Constants**: THEME colors, PIN_CATEGORIES, PIN_CATEGORY_COLORS

### supabase/
- **PostgreSQL 15** (local via Supabase CLI)
- **RLS**: Always enabled (no exceptions)
- **Edge Functions**: Deno runtime, shared utils in `_shared/`
- **Ports**: API 54321, DB 54322, Studio 54323
