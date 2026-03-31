# Borkd Coding Conventions

## Naming

| Element | Convention | Example |
|---------|-----------|---------|
| 파일명 | kebab-case | `walk-tracker.tsx` |
| 컴포넌트 | PascalCase | `WalkTracker` |
| Hooks | camelCase + `use` | `useWalkState` |
| 상수 | UPPER_SNAKE_CASE | `PIN_CATEGORIES` |
| 타입 | PascalCase | `WalkSession` |
| 스키마 | camelCase + Schema | `walkSessionSchema` |

## Platform Branching

양쪽 플랫폼에서 다르게 동작해야 할 때:
```
component.native.ts   # React Native
component.web.ts      # Web
component.ts          # Re-export (barrel)
```

## Formatting (Biome)

| Rule | Value |
|------|-------|
| Indent | 2 spaces |
| Quote style | Single quotes |
| Line width | 100 chars |
| Trailing commas | All |
| Semicolons | Always |

설정: `packages/config/biome.json`

## File Structure Patterns

### Mobile Feature Module
```
features/<domain>/
├── hooks/
│   ├── use-<domain>-state.ts
│   └── use-<domain>-query.ts
├── components/
│   ├── <Domain>List.tsx
│   └── <Domain>Card.tsx
└── index.ts              # Barrel export
```

### Mobile App Routes
```
app/
├── (tabs)/               # Tab navigation layout
│   ├── index.tsx          # Home tab
│   ├── explore.tsx        # Explore tab
│   └── profile.tsx        # Profile tab
├── (auth)/               # Auth flow (modal group)
│   ├── login.tsx
│   └── register.tsx
├── onboarding/           # Onboarding flow
└── _layout.tsx           # Root layout
```

### Admin Pages
```
app/
├── dashboard/page.tsx    # Server component (default)
├── users/page.tsx
├── pins/page.tsx
└── layout.tsx            # Shared layout with sidebar
```

## Import Patterns

```typescript
// 1. External packages
import { View, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';

// 2. Internal packages
import { type User, userSchema } from '@borkd/shared';

// 3. Local modules
import { useWalkState } from '../hooks/use-walk-state';
import { WalkCard } from '../components/WalkCard';
```

## Component Patterns

### Mobile Component
```typescript
import { View, Text } from 'react-native';

interface WalkCardProps {
  walk: Walk;
  onPress?: () => void;
}

export function WalkCard({ walk, onPress }: WalkCardProps) {
  return (
    <View className="bg-cream rounded-card p-4">
      <Text className="font-display text-charcoal">{walk.title}</Text>
    </View>
  );
}
```

### Admin Component (Server)
```typescript
// Default: server component
export default async function DashboardPage() {
  const supabase = createServerClient();
  const { data } = await supabase.from('users').select();
  return <div>...</div>;
}
```

### Admin Component (Client)
```typescript
'use client';

export function InteractiveMap() {
  // Client-side only logic
}
```
