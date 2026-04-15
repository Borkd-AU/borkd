import type { MapPin } from '@borkd/shared';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * Minimal, design-agnostic bottom sheet that surfaces the metadata we
 * already have on a `MapPin` (no network call — the pin row is already
 * in memory from the viewport query). Styling is intentionally neutral:
 * cream card, charcoal text, stone secondary. The design system pass
 * from Steph will replace the visual shell wholesale; consumers only
 * depend on the `pin`/`onClose` contract.
 *
 * Rendering strategy is "card absolutely positioned at screen bottom"
 * rather than a draggable sheet. That keeps us off a native-only
 * library (`@gorhom/bottom-sheet`, `react-native-bottom-sheet`) so the
 * web build stays behaviorally identical, and avoids pulling in
 * Reanimated gestures the design hasn't asked for.
 */
export interface PinDetailSheetProps {
  pin: MapPin | null;
  onClose: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  hazard: 'Hazard',
  park: 'Park',
  water: 'Water',
  cafe: 'Dog-friendly cafe',
  vet: 'Veterinarian',
  pet_shop: 'Pet shop',
  pet_service: 'Pet service',
  waste: 'Waste bin',
  beach: 'Beach',
  trail: 'Trail',
  off_leash: 'Off-leash area',
};

function formatCategory(pin: MapPin): string {
  const base = CATEGORY_LABELS[pin.category] ?? pin.category;
  return pin.subcategory ? `${base} · ${pin.subcategory}` : base;
}

export function PinDetailSheet({ pin, onClose }: PinDetailSheetProps) {
  if (!pin) return null;

  return (
    <View
      className="absolute bottom-0 left-0 right-0"
      // Tap outside the card (on the transparent overlay) closes the
      // sheet. The card itself stops propagation below.
      pointerEvents="box-none"
    >
      <SafeAreaView edges={['bottom']}>
        <Pressable
          // Accessibility: the whole card is a button so screen readers
          // announce a single focusable region. Keyboard escape / swipe
          // gestures will come with the design pass.
          accessibilityRole="button"
          accessibilityLabel={`Pin detail: ${pin.name ?? formatCategory(pin)}`}
          onPress={() => {
            /* card tap is a no-op for now — design will swap to full detail */
          }}
          className="mx-4 mb-4 rounded-2xl bg-cream px-4 py-4 shadow-lg"
        >
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="font-display text-lg text-charcoal" numberOfLines={2}>
                {pin.name ?? formatCategory(pin)}
              </Text>
              {pin.name && (
                <Text className="mt-0.5 font-body text-xs uppercase tracking-wide text-stone">
                  {formatCategory(pin)}
                </Text>
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close pin detail"
              hitSlop={12}
              onPress={onClose}
              className="-mt-1 -mr-1 rounded-full bg-sand/60 px-2 py-1"
            >
              <Text className="font-body text-sm text-charcoal">✕</Text>
            </Pressable>
          </View>

          {pin.note ? (
            <Text className="mt-3 font-body text-sm leading-5 text-charcoal" numberOfLines={4}>
              {pin.note}
            </Text>
          ) : null}

          <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
            <Text className="font-body text-xs text-stone">
              👍 {pin.upvotes} · 👎 {pin.downvotes}
            </Text>
            <Text className="font-body text-xs text-stone">
              Trust {Math.round(pin.verification_score * 100)}%
            </Text>
            {pin.attribution ? (
              <Text
                className="font-body text-xs text-stone"
                numberOfLines={1}
                // Attribution is legally required for OSM / council sources.
                // Keep visible even when design lands.
              >
                {pin.attribution}
              </Text>
            ) : null}
          </View>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
