import type { Bbox } from '@borkd/shared';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from '../../components/MapView';
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
 * Current state: data layer only — MapView mounts with default Mapbox
 * styling, useMapPins fetches from the staging Supabase and feeds the
 * resulting pins to MapView via props. Marker styling, cluster colours,
 * and bottom sheets wait on the design system pass from Steph.
 *
 * No Mapbox token configured → map tiles render grey. App shell still
 * works so we can exercise the data fetch path end to end.
 */
export default function MapScreen() {
  // TODO: swap for a real `onRegionDidChange` callback from MapView once
  // the underlying Mapbox components expose viewport change events in
  // both .native and .web variants. Using a static bbox is enough to
  // smoke-test the Supabase RPC wiring.
  const [bbox] = useState<Bbox>(DEFAULT_BBOX);

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

  return (
    <SafeAreaView className="flex-1 bg-cream" edges={['top']}>
      <View className="flex-1">
        <MapView pins={markers} />
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
      </View>
    </SafeAreaView>
  );
}
