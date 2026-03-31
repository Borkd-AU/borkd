import { useState, useRef, useCallback } from 'react';
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

function haversineDistance(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sinLat = Math.sin(dLat / 2);
  const sinLon = Math.sin(dLon / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function calculatePace(distanceMeters: number, durationSeconds: number): number {
  if (distanceMeters <= 0 || durationSeconds <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  const durationMin = durationSeconds / 60;
  return durationMin / distanceKm;
}

export function useLocationTracking(): LocationState & LocationActions {
  const [state, setState] = useState<LocationState>(INITIAL_STATE);
  const subscriptionRef = useRef<Subscription | null>(null);
  const heartbeatRef = useRef<Subscription | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);

  const flushToMMKV = useCallback(
    (coords: Array<{ latitude: number; longitude: number }>) => {
      gpsStorage.set(GPS_BUFFER_KEY, JSON.stringify(coords));
    },
    [],
  );

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

        const elapsed =
          (Date.now() - startTimeRef.current) / 1000 - pausedDurationRef.current;
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

    setState({ ...INITIAL_STATE, isTracking: true });

    await BackgroundGeolocation.ready({
      distanceFilter: 10,
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      stopOnTerminate: false,
      startOnBoot: false,
      heartbeatInterval: 60,
      preventSuspend: true,
      logLevel: BackgroundGeolocation.LOG_LEVEL_WARNING,
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
