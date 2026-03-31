# Figma → Code Component Map

## Rules

1. **대상 앱 명시 필수**: 모든 Figma 컴포넌트 구현 시 mobile/admin 중 대상 명확히
2. **기존 패턴 우선**: 새 패턴 도입 전 기존 컴포넌트 확인
3. **플랫폼 분기**: 양쪽 앱에서 쓰이는 컴포넌트는 `.native.ts` / `.web.ts` 패턴 사용

## Core Components

### Navigation
| Figma | Mobile | Admin |
|-------|--------|-------|
| Bottom Tab Bar | Expo Router `(tabs)` layout | — |
| Side Navigation | — | Next.js layout sidebar |
| Stack Navigation | Expo Router stack | Next.js page navigation |

### Data Display
| Figma | Mobile | Admin |
|-------|--------|-------|
| List / Feed | `@shopify/flash-list` | `<table>` / `<div>` list |
| Card | NativeWind `View` + `rounded-card` | Tailwind `div` + `rounded-2xl` |
| Map | `@rnmapbox/maps` | `react-map-gl` |
| Avatar / Image | `expo-image` | `next/image` |

### Input
| Figma | Mobile | Admin |
|-------|--------|-------|
| Form | `react-hook-form` + Zod | native `<form>` |
| Text Input | RN `TextInput` + NativeWind | `<input>` + Tailwind |
| Select / Picker | Custom bottom sheet picker | `<select>` |

### Overlay
| Figma | Mobile | Admin |
|-------|--------|-------|
| Bottom Sheet | `@gorhom/bottom-sheet` | — |
| Modal | RN `Modal` | HTML `<dialog>` |
| Toast / Alert | Custom + `expo-haptics` | Browser notification |

### Animation
| Figma | Mobile | Admin |
|-------|--------|-------|
| Micro-interaction | `moti` (Reanimated) | CSS transitions |
| Page transition | Expo Router animation | Next.js page transition |
| Loading | Skeleton via `moti` | CSS animation |

## Implementation Checklist

Figma 디자인을 코드로 변환할 때:

- [ ] 대상 앱 확인 (mobile/admin)
- [ ] TOKEN_MAP.md에서 올바른 색상 토큰 확인
- [ ] 기존 유사 컴포넌트 있는지 확인
- [ ] 반응형/접근성 고려
- [ ] Dark mode 지원 여부 확인
- [ ] 애니메이션 스펙 확인 (있다면)
