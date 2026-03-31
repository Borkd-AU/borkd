# Borkd - Phase 1-2: Backend Architecture MVP

## Status: IN PROGRESS (2026-03-20)

### Task 1: Migration 00006 — Auth Trigger + PostgreSQL Functions + Storage
- [x] `handle_new_user()` trigger on `auth.users` → auto-create `public.users`
- [x] `get_pins_in_viewport(min_lng, min_lat, max_lng, max_lat, category_filter)`
- [x] `get_pin_clusters(bounds, zoom_level)` — grid-based clustering
- [x] `calculate_walk_miles(distance_km)` — distance → miles conversion
- [x] `complete_walk(walk_id, distance_km, duration_seconds)` — atomic walk completion + streak
- [x] Storage buckets: avatars, pin-photos, walk-selfies + RLS

### Task 2: Edge Functions — `_shared/` utilities
- [x] `_shared/cors.ts`
- [x] `_shared/auth.ts`
- [x] `_shared/response.ts`
- [x] `_shared/validate.ts`

### Task 3: Edge Function — `complete-walk`
- [x] Miles calculation, user stats update, walk status → 'completed'

### Task 4: Fix auth.ts race condition
- [x] Remove client-side `users` insert from `signUpWithEmail` (DB trigger handles it)

### Task 5: Config fix
- [x] Updated `supabase/config.toml` — `[project]` → `project_id` (CLI v2.82 compat)

### Task 6: Generate DB types
- [ ] `npx supabase gen types typescript --local > packages/shared/src/types/database.ts`
- Blocked: requires Docker + local Supabase running, OR Supabase cloud project linked

---

## Phase 0 (COMPLETE — 2026-03-20)
<details><summary>Completed tasks</summary>

- [x] Monorepo setup (Turborepo + pnpm)
- [x] Expo mobile app (SDK 55, Router, NativeWind, Biome, Vitest)
- [x] Supabase: migrations, auth, RLS, client
- [x] Native modules: Mapbox, bg-geo, MMKV
- [x] Shared packages: types, schemas, constants
- [x] Admin dashboard: Next.js 15
- [x] CI/CD: GitHub Actions, EAS Build

</details>
