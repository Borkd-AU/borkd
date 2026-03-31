# Figma → Code Design Token Map

## Color Tokens

### Background Colors

| Figma Token | Mobile (NativeWind) | Admin (Tailwind) | Hex Mobile | Hex Admin |
|-------------|---------------------|-------------------|------------|-----------|
| Background/Cream | `bg-cream` | `bg-cream` | #FAF6F1 | #FAF7F2 |
| Background/Sand | `bg-warm-sand` | — | #F0EBE3 | — |
| Background/Linen | `bg-linen` | — | #E8E2DA | — |

### Text Colors

| Figma Token | Mobile (NativeWind) | Admin (Tailwind) | Hex Mobile | Hex Admin |
|-------------|---------------------|-------------------|------------|-----------|
| Text/Primary | `text-charcoal` | `text-charcoal` | #1C1C1C | #2D2D2D |
| Text/Secondary | `text-stone` | `text-stone` | #8C8279 | #A69B8D |

### Accent Colors

| Figma Token | Mobile (NativeWind) | Admin (Tailwind) | Hex Mobile | Hex Admin |
|-------------|---------------------|-------------------|------------|-----------|
| Accent/Sage | `text-sage` / `bg-sage` | `text-sage` / `bg-sage` | #7A9E7E | #8FA98B |
| Accent/Sage Light | — | `text-sage-light` / `bg-sage-light` | — | #B5C9B2 |
| Accent/Sage Dark | — | `text-sage-dark` / `bg-sage-dark` | — | #6B8A67 |
| Accent/Terracotta | `text-terracotta` / `bg-terracotta` | `text-terracotta` / `bg-terracotta` | #C17C5E | #C67B5C |
| Accent/Terracotta Light | — | `text-terracotta-light` | — | #D9A08C |
| Accent/Terracotta Dark | — | `text-terracotta-dark` | — | #A85F42 |

### Pin Category Colors (Shared)

| Figma Token | Class | Hex |
|-------------|-------|-----|
| Pin/GoodSpot | `text-pin-green` / `bg-pin-green` | #5B9A6B |
| Pin/Hazard | `text-pin-red` / `bg-pin-red` | #C75D5D |
| Pin/Amenity | `text-pin-blue` / `bg-pin-blue` | #5B89A6 |
| Pin/Wildlife | `text-pin-amber` / `bg-pin-amber` | #C4944A |

## Spacing & Sizing

| Figma Token | Mobile (NativeWind) | Admin (Tailwind) |
|-------------|---------------------|-------------------|
| Radius/Card | `rounded-card` (16px) | `rounded-2xl` (16px) |
| Radius/Button | `rounded-button` (12px) | `rounded-xl` (12px) |
| Radius/Chip | `rounded-chip` (20px) | `rounded-full` (9999px) |

## Typography

| Figma Token | Mobile (NativeWind) | Admin (Tailwind) |
|-------------|---------------------|-------------------|
| Font/Display | `font-display` (Nunito) | system default |
| Font/Body | `font-body` (NunitoSans) | system default |

## Usage Rules

1. **항상 대상 앱 확인**: 같은 토큰 이름이라도 앱에 따라 hex 값이 다름
2. **Mobile 작업 시**: `apps/mobile/tailwind.config.ts` 기준
3. **Admin 작업 시**: `apps/admin/tailwind.config.ts` 기준
4. **Shared constants**: `packages/shared/src/constants/index.ts`의 THEME은 mobile 전용
5. **새 토큰 추가 시**: 양쪽 tailwind config에 각각 추가, 이 문서도 업데이트
