import type { Bbox } from '@borkd/shared';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from '../../components/MapView';
import { PinDetailSheet } from '../../features/map/components';
import { useMapPins } from '../../features/map/hooks';

// Sydney CBD default viewport (centre + ~5 km radius) used before the
// map emits its first onRegionDidChange / onMove event.
const DEFAULT_BBOX: Bbox = {
  min_lng: 151.15,
  min_lat: -33.92,
  max_lng: 151.25,
  max_lat: -33.82,
};

/**
 * Community Map tab.
 *
 * Data layer: `useMapPins` fetches pins inside the current viewport from
 * the staging Supabase and feeds them to MapView. Tapping a pin opens a
 * minimal `PinDetailSheet` — the detail data is already in the viewport
 * payload, so no extra network call is issued.
 *
 * Marker styling, cluster colours, and the long-form detail screen are
 * still pending Steph's design pass. No Mapbox token configured → map
 * tiles render grey, but the full interaction path (viewport → pin tap
 * → sheet → close) is exercisable.
 */
export default function MapScreen() {
  // TODO: swap for a real `onRegionDidChange` callback from MapView once
  // the underlying Mapbox components expose viewport change events in
  // both .native and .web variants. Using a static bbox is enough to
  // smoke-test the Supabase RPC wiring.
  const [bbox] = useState<Bbox>(DEFAULT_BBOX);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const { data: pins, isLoading, error } = useMapPins({ bbox });

  // Translate canonical MapPin shape to MapView's MapPin prop shape
  // (MapView only needs id/lat/lng/category for rendering).
  const markers = useMemo(
    () =>
      (pins ?? []).map((p) => ({
        id: p.id,
        latitude: p.latitude,
        longitude: p.longitude,
        category: p.category,
      })),
    [pins],
  );

  // Look up the full MapPin (not just the marker projection) whenever
  // the user taps one. The viewport fetch already has every field the
  // detail sheet needs, so there's no extra network call — this will
  // also make it trivial to swap to a future `useMapPinDetail` hook
  // that fetches review counts / photos lazily if that ever matters.
  const selectedPin = useMemo(
    () => pins?.find((p) => p.id === selectedPinId) ?? null,
    [pins, selectedPinId],
  );

  const handlePinPress = useCallback((pinId: string) => {
    setSelectedPinId(pinId);
  }, []);

  const handleSheetClose = useCallback(() => {
    setSelectedPinId(null);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-1">
        <MapView pins={markers} onPinPress={handlePinPress} />
        {/*
          Lightweight status strip. Will move into the shared HUD overlay
          once the map design lands.
        */}
        <View className="absolute top-4 left-4 right-4 rounded-xl bg-cream/90 px-3 py-2">
          {isLoading ? (
            <View className="flex-row items-center gap-2">
              <ActivityIndicator size="small" />
              <Text className="font-body text-sm text-stone">Loading pins…</Text>
            </View>
          ) : error ? (
            <Text className="font-body text-sm text-terracotta">
              Failed to load pins: {error.message}
            </Text>
          ) : (
            <Text className="font-body text-sm text-charcoal">{markers.length} pins nearby</Text>
          )}
        </View>
        <PinDetailSheet pin={selectedPin} onClose={handleSheetClose} />
      </View>
    </SafeAreaView>
  );
}
