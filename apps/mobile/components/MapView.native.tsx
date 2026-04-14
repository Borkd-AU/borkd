import MapboxGL, { UserLocationRenderMode } from '@rnmapbox/maps';
import type React from 'react';
import { useCallback, useMemo, useRef } from 'react';
import { View } from 'react-native';

const SYDNEY_CBD = { latitude: -33.8688, longitude: 151.2093 };
const DEFAULT_ZOOM = 13;
const MAPBOX_STYLE = 'mapbox://styles/mapbox/light-v11';

export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  category: string;
}

export interface MapViewProps {
  initialCenter?: { latitude: number; longitude: number };
  initialZoom?: number;
  pins?: MapPin[];
  onPinPress?: (pinId: string) => void;
  onMapPress?: (coords: { latitude: number; longitude: number }) => void;
  walkRoute?: Array<{ latitude: number; longitude: number }>;
  showUserLocation?: boolean;
  children?: React.ReactNode;
}

const pinCategoryColors: Record<string, string> = {
  hazard: '#E53E3E',
  park: '#7A9E7E',
  water: '#3B82F6',
  default: '#1C1C1C',
};

function buildPinGeoJSON(pins: MapPin[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: pins.map((pin) => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [pin.longitude, pin.latitude],
      },
      properties: {
        id: pin.id,
        category: pin.category,
        color: pinCategoryColors[pin.category] ?? pinCategoryColors.default,
      },
    })),
  };
}

function buildRouteGeoJSON(
  coords: Array<{ latitude: number; longitude: number }>,
): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: {
          type: 'LineString',
          coordinates: coords.map((c) => [c.longitude, c.latitude]),
        },
        properties: {},
      },
    ],
  };
}

export default function MapView({
  initialCenter = SYDNEY_CBD,
  initialZoom = DEFAULT_ZOOM,
  pins = [],
  onPinPress,
  onMapPress,
  walkRoute,
  showUserLocation = false,
  children,
}: MapViewProps) {
  const cameraRef = useRef<MapboxGL.Camera>(null);

  const handlePress = useCallback(
    (event: GeoJSON.Feature) => {
      if (!onMapPress) return;
      const coords = (event.geometry as GeoJSON.Point).coordinates;
      onMapPress({ latitude: coords[1], longitude: coords[0] });
    },
    [onMapPress],
  );

  const handlePinPress = useCallback(
    (event: GeoJSON.Feature) => {
      const pinId = event.properties?.id as string | undefined;
      if (pinId && onPinPress) {
        onPinPress(pinId);
      }
    },
    [onPinPress],
  );

  // Memoize GeoJSON shape payloads so they stay referentially stable across
  // re-renders that don't change the inputs. Rebuilding these on every render
  // re-uploads the full FeatureCollection to the native Mapbox ShapeSource,
  // which is O(n) in pins / route length and O(1) unnecessary work on idle
  // parent re-renders.
  const pinGeoJSON = useMemo(() => buildPinGeoJSON(pins), [pins]);
  const routeGeoJSON = useMemo(
    () => (walkRoute && walkRoute.length >= 2 ? buildRouteGeoJSON(walkRoute) : null),
    [walkRoute],
  );

  return (
    <View className="flex-1 bg-[#FAF6F1]">
      <MapboxGL.MapView
        style={{ flex: 1 }}
        styleURL={MAPBOX_STYLE}
        onPress={handlePress}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled
      >
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [initialCenter.longitude, initialCenter.latitude],
            zoomLevel: initialZoom,
          }}
        />

        {showUserLocation && (
          <MapboxGL.UserLocation
            visible
            renderMode={UserLocationRenderMode.Native}
            androidRenderMode="compass"
          />
        )}

        {pins.length > 0 && (
          <MapboxGL.ShapeSource
            id="pin-source"
            shape={pinGeoJSON}
            cluster
            clusterRadius={50}
            clusterMaxZoomLevel={14}
            onPress={(e) => {
              const feature = e.features?.[0];
              if (feature) handlePinPress(feature);
            }}
          >
            <MapboxGL.SymbolLayer
              id="pin-cluster-count"
              filter={['has', 'point_count']}
              style={{
                textField: ['get', 'point_count_abbreviated'],
                textSize: 14,
                textColor: '#FAF6F1',
                textFont: ['DIN Pro Medium'],
              }}
            />
            <MapboxGL.CircleLayer
              id="pin-cluster-circle"
              filter={['has', 'point_count']}
              style={{
                circleColor: '#7A9E7E',
                circleRadius: ['step', ['get', 'point_count'], 20, 10, 25, 50, 30],
                circleOpacity: 0.9,
                circleStrokeWidth: 2,
                circleStrokeColor: '#FAF6F1',
              }}
            />
            <MapboxGL.CircleLayer
              id="pin-unclustered"
              filter={['!', ['has', 'point_count']]}
              style={{
                circleColor: ['get', 'color'],
                circleRadius: 8,
                circleStrokeWidth: 2,
                circleStrokeColor: '#FAF6F1',
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {routeGeoJSON && (
          <MapboxGL.ShapeSource id="walk-route-source" shape={routeGeoJSON}>
            <MapboxGL.LineLayer
              id="walk-route-line"
              style={{
                lineColor: '#7A9E7E',
                lineWidth: 4,
                lineCap: 'round',
                lineJoin: 'round',
                lineOpacity: 0.85,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {children}
      </MapboxGL.MapView>
    </View>
  );
}
