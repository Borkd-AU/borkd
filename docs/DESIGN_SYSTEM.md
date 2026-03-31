# Borkd Design System

## CRITICAL: Mobile ≠ Admin Tokens

같은 토큰 이름이지만 **다른 hex 값**을 사용합니다.

| Token | Mobile | Admin | Delta |
|-------|--------|-------|-------|
| cream | `#FAF6F1` | `#FAF7F2` | 미세 차이 |
| charcoal | `#1C1C1C` | `#2D2D2D` | Admin이 밝음 |
| sage | `#7A9E7E` | `#8FA98B` | Admin이 밝음 |
| terracotta | `#C17C5E` | `#C67B5C` | 미세 차이 |
| stone | `#8C8279` | `#A69B8D` | Admin이 밝음 |

**규칙**: 코드 작성 시 반드시 대상 앱 확인 후 해당 앱의 tailwind.config.ts 토큰 사용.

상세 매핑: `.claude/design/TOKEN_MAP.md`
컴포넌트 매핑: `.claude/design/COMPONENT_MAP.md`

## Admin-Only Extended Tokens

| Token | Hex |
|-------|-----|
| sage-light | `#B5C9B2` |
| sage-dark | `#6B8A67` |
| terracotta-light | `#D9A08C` |
| terracotta-dark | `#A85F42` |
| stone-light | `#C4BAB0` |
| stone-dark | `#8A7F72` |

## Pin Category Colors (Shared)

| Category | Token | Hex |
|----------|-------|-----|
| good_spot | `pin-green` | `#5B9A6B` |
| hazard | `pin-red` | `#C75D5D` |
| amenity | `pin-blue` | `#5B89A6` |
| wildlife | `pin-amber` | `#C4944A` |

Source: `packages/shared/src/constants/index.ts`

## Typography (Mobile Only)

| Role | Font | Class |
|------|------|-------|
| Display | Nunito | `font-display` |
| Body | NunitoSans | `font-body` |

Admin은 시스템 폰트 사용.

## Border Radius (Mobile)

| Element | Size | Class |
|---------|------|-------|
| Card | 16px | `rounded-card` |
| Button | 12px | `rounded-button` |
| Chip | 20px | `rounded-chip` |

Admin은 Tailwind 기본 클래스 사용 (`rounded-2xl`, `rounded-xl`, `rounded-full`).

## Hardcoded Hex 금지

컴포넌트 파일 (`.tsx`)에서 직접 `#XXXXXX` 사용 금지.
반드시 tailwind/NativeWind 토큰 클래스 사용.

`check-architecture.sh` hook이 하드코딩된 hex를 경고합니다.
