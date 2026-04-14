import type React from 'react';
import { useCallback, useMemo } from 'react';
import ReactMap, {
  Marker,
  Source,
  Layer,
  type MapLayerMouseEvent,
  type ViewStateChangeEvent,
} from 'react-map-gl';
import type { LineLayer as LineLayerSpec } from 'react-map-gl';
import { View } from 'react-native';

const SYDNEY_CBD = { latitude: -33.8688, longitude: 151.2093 };
const DEFAULT_ZOOM = 13;
const MAPBOX_STYLE = 'mapbox://styles/mapbox/light-v11';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';

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

function getPinColor(category: string): string {
  return pinCategoryColors[category] ?? pinCategoryColors.default;
}

// react-map-gl v7 requires `source` on the LineLayerSpec even when the
// <Layer> is nested inside a <Source>. The parent Source id below is
// 'walk-route-source' — keep them in sync.
const routeLayerStyle: LineLayerSpec = {
  id: 'walk-route-line',
  source: 'walk-route-source',
  type: 'line',
  paint: {
    'line-color': '#7A9E7E',
    'line-width': 4,
    'line-opacity': 0.85,
  },
  layout: {
    'line-cap': 'round',
    'line-join': 'round',
  },
};

export default function MapView({
  initialCenter = SYDNEY_CBD,
  initialZoom = DEFAULT_ZOOM,
  pins = [],
  onPinPress,
  onMapPress,
  walkRoute,
  showUserLocation: _showUserLocation = false,
  children,
}: MapViewProps) {
  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      if (!onMapPress) return;
      const { lng, lat } = event.lngLat;
      onMapPress({ latitude: lat, longitude: lng });
    },
    [onMapPress],
  );

  const routeGeoJSON = useMemo(() => {
    if (!walkRoute || walkRoute.length < 2) return null;
    return {
      type: 'FeatureCollection' as const,
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: walkRoute.map((c) => [c.longitude, c.latitude]),
          },
          properties: {},
        },
      ],
    };
  }, [walkRoute]);

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF6F1' }}>
      <ReactMap
        initialViewState={{
          longitude: initialCenter.longitude,
          latitude: initialCenter.latitude,
          zoom: initialZoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={MAPBOX_STYLE}
        mapboxAccessToken={MAPBOX_TOKEN}
        onClick={handleClick}
        attributionControl={false}
      >
        {pins.map((pin) => (
          <Marker
            key={pin.id}
            longitude={pin.longitude}
            latitude={pin.latitude}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onPinPress?.(pin.id);
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: getPinColor(pin.category),
                border: '2px solid #FAF6F1',
                cursor: 'pointer',
              }}
            />
          </Marker>
        ))}

        {routeGeoJSON && (
          <Source id="walk-route-source" type="geojson" data={routeGeoJSON}>
            <Layer {...routeLayerStyle} />
          </Source>
        )}

        {children}
      </ReactMap>
    </View>
  );
}
