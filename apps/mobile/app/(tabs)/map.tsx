import type { Bbox } from '@borkd/shared';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from '../../components/MapView';
import { PinDetailSheet } from '../../features/map/components';
import { useMapPins } from '../../features/map/hooks';

// Sydney CBD default viewport (centre + ~5 km radius) used before the
// map emits its first viewport-change event.
const DEFAULT_BBOX: Bbox = {
  min_lng: 151.15,
  min_lat: -33.92,
  max_lng: 151.25,
  max_lat: -33.82,
};

// Delay between the user releasing a pan/zoom gesture and the next
// Supabase refetch. 300 ms is long enough to swallow the burst of
// callbacks that @rnmapbox emits while a camera animation settles, but
// short enough that the pin list feels responsive after the gesture
// ends. Keep in sync with the comment in MapView.{native,web}.tsx.
const VIEWPORT_DEBOUNCE_MS = 300;

/**
 * Community Map tab.
 *
 * Interaction wiring:
 *   MapView.onViewportChange  → debounce 300 ms → setBbox → refetch pins
 *   MapView.onPinPress        → setSelectedPinId → PinDetailSheet
 *
 * The detail sheet reads from the already-fetched pins list (same query
 * that populated the markers), so tapping a pin issues no extra network
 * request. Marker styling, cluster colours, and the long-form detail
 * screen are still pending Steph's design pass — the functional wiring
 * is complete and exercisable once a Mapbox token is configured.
 */
export default function MapScreen() {
  const [bbox, setBbox] = useState<Bbox>(DEFAULT_BBOX);
  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce: hold the incoming bbox in a ref-backed timer and only
  // commit it to React state (which is what triggers the Supabase
  // refetch via useMapPins' queryKey) once the gesture has settled.
  const handleViewportChange = useCallback((nextBbox: Bbox) => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setBbox(nextBbox);
      debounceTimer.current = null;
    }, VIEWPORT_DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

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
        <MapView
          pins={markers}
          onPinPress={handlePinPress}
          onViewportChange={handleViewportChange}
        />
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
