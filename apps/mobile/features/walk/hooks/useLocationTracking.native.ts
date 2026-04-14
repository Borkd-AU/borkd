import { useCallback, useRef, useState } from 'react';
import BackgroundGeolocation, {
  type Location,
  type Subscription,
} from 'react-native-background-geolocation';
import { gpsStorage } from '../../../lib/storage';

const GPS_BUFFER_KEY = 'gps-route-buffer';

export interface LocationState {
  isTracking: boolean;
  currentLocation: { latitude: number; longitude: number; altitude?: number } | null;
  routeCoordinates: Array<{ latitude: number; longitude: number }>;
  distance: number;
  duration: number;
  averagePace: number;
}

export interface LocationActions {
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<LocationState>;
  pauseTracking: () => void;
  resumeTracking: () => void;
}

const INITIAL_STATE: LocationState = {
  isTracking: false,
  currentLocation: null,
  routeCoordinates: [],
  distance: 0,
  duration: 0,
  averagePace: 0,
};

// Earth radius in metres + degree-to-radian factor hoisted to module scope so
// they aren't rebuilt on every haversine call. Over a 30-min walk at 1 Hz we
// call this ~1800 times — the savings are small per-call but add up, and
// inlining `toRad` avoids the repeated arrow-function allocation.
const EARTH_RADIUS_M = 6371000;
const DEG_TO_RAD = Math.PI / 180;

function haversineDistance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = (b.latitude - a.latitude) * DEG_TO_RAD;
  const dLon = (b.longitude - a.longitude) * DEG_TO_RAD;
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const cosLatA = Math.cos(a.latitude * DEG_TO_RAD);
  const cosLatB = Math.cos(b.latitude * DEG_TO_RAD);
  const h = sinLat * sinLat + cosLatA * cosLatB * sinLon * sinLon;
  return EARTH_RADIUS_M * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function calculatePace(distanceMeters: number, durationSeconds: number): number {
  if (distanceMeters <= 0 || durationSeconds <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  const durationMin = durationSeconds / 60;
  return durationMin / distanceKm;
}

// Write the in-memory route buffer back to MMKV at most this often.
// GPS fires at ~1 Hz and `JSON.stringify` over the full buffer is O(n); a
// 30-minute walk ends at ~1800 points, so unthrottled writes get expensive
// toward the end. Crash-recovery only needs coarse granularity — the last
// few seconds of route can be re-interpolated on resume.
const FLUSH_INTERVAL_MS = 1000;

export function useLocationTracking(): LocationState & LocationActions {
  const [state, setState] = useState<LocationState>(INITIAL_STATE);
  const subscriptionRef = useRef<Subscription | null>(null);
  const heartbeatRef = useRef<Subscription | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);
  const lastFlushAtRef = useRef<number>(0);

  const flushToMMKV = useCallback((coords: Array<{ latitude: number; longitude: number }>) => {
    const now = Date.now();
    if (now - lastFlushAtRef.current < FLUSH_INTERVAL_MS) return;
    lastFlushAtRef.current = now;
    gpsStorage.set(GPS_BUFFER_KEY, JSON.stringify(coords));
  }, []);

  const processLocation = useCallback(
    (location: Location) => {
      if (isPausedRef.current) return;

      const point = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
      const altitude = location.coords.altitude ?? undefined;

      setState((prev) => {
        const newRoute = [...prev.routeCoordinates, point];
        let newDistance = prev.distance;

        if (prev.routeCoordinates.length > 0) {
          const last = prev.routeCoordinates[prev.routeCoordinates.length - 1];
          newDistance += haversineDistance(last, point);
        }

        const elapsed = (Date.now() - startTimeRef.current) / 1000 - pausedDurationRef.current;
        const pace = calculatePace(newDistance, elapsed);

        flushToMMKV(newRoute);

        return {
          isTracking: true,
          currentLocation: { latitude: point.latitude, longitude: point.longitude, altitude },
          routeCoordinates: newRoute,
          distance: newDistance,
          duration: elapsed,
          averagePace: pace,
        };
      });
    },
    [flushToMMKV],
  );

  const startTracking = useCallback(async () => {
    gpsStorage.delete(GPS_BUFFER_KEY);
    startTimeRef.current = Date.now();
    pausedDurationRef.current = 0;
    isPausedRef.current = false;
    lastFlushAtRef.current = 0;

    setState({ ...INITIAL_STATE, isTracking: true });

    // v5 API: flat options were replaced by nested config groups —
    // `geolocation` (distanceFilter, desiredAccuracy), `app`
    // (stopOnTerminate, startOnBoot, heartbeatInterval, preventSuspend),
    // `logger` (logLevel). Constants moved from UPPER_SNAKE (DESIRED_ACCURACY_HIGH,
    // LOG_LEVEL_WARNING) to camelCase enum members (DesiredAccuracy.High,
    // LogLevel.Warning).
    await BackgroundGeolocation.ready({
      geolocation: {
        distanceFilter: 10,
        desiredAccuracy: BackgroundGeolocation.DesiredAccuracy.High,
      },
      app: {
        stopOnTerminate: false,
        startOnBoot: false,
        heartbeatInterval: 60,
        preventSuspend: true,
      },
      logger: {
        logLevel: BackgroundGeolocation.LogLevel.Warning,
      },
    });

    subscriptionRef.current = BackgroundGeolocation.onLocation(processLocation);
    heartbeatRef.current = BackgroundGeolocation.onHeartbeat(() => {
      BackgroundGeolocation.getCurrentPosition({
        samples: 1,
        persist: false,
      }).then(processLocation);
    });

    await BackgroundGeolocation.start();
  }, [processLocation]);

  const stopTracking = useCallback(async (): Promise<LocationState> => {
    subscriptionRef.current?.remove();
    heartbeatRef.current?.remove();
    subscriptionRef.current = null;
    heartbeatRef.current = null;

    await BackgroundGeolocation.stop();

    let finalState: LocationState = INITIAL_STATE;
    setState((prev) => {
      finalState = { ...prev, isTracking: false };
      return finalState;
    });

    gpsStorage.delete(GPS_BUFFER_KEY);
    return finalState;
  }, []);

  const pauseTracking = useCallback(() => {
    isPausedRef.current = true;
    pauseStartRef.current = Date.now();
    BackgroundGeolocation.changePace(false);
  }, []);

  const resumeTracking = useCallback(() => {
    if (isPausedRef.current) {
      pausedDurationRef.current += (Date.now() - pauseStartRef.current) / 1000;
      isPausedRef.current = false;
      BackgroundGeolocation.changePace(true);
    }
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
    pauseTracking,
    resumeTracking,
  };
}
