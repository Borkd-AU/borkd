import { useCallback, useRef, useState } from 'react';

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
    sinLat * sinLat + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * sinLon * sinLon;
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
  const watchIdRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const pauseStartRef = useRef<number>(0);
  const isPausedRef = useRef<boolean>(false);

  const processPosition = useCallback((position: GeolocationPosition) => {
    if (isPausedRef.current) return;

    const point = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
    const altitude = position.coords.altitude ?? undefined;

    setState((prev) => {
      const newRoute = [...prev.routeCoordinates, point];
      let newDistance = prev.distance;

      if (prev.routeCoordinates.length > 0) {
        const last = prev.routeCoordinates[prev.routeCoordinates.length - 1];
        newDistance += haversineDistance(last, point);
      }

      const elapsed = (Date.now() - startTimeRef.current) / 1000 - pausedDurationRef.current;
      const pace = calculatePace(newDistance, elapsed);

      return {
        isTracking: true,
        currentLocation: { latitude: point.latitude, longitude: point.longitude, altitude },
        routeCoordinates: newRoute,
        distance: newDistance,
        duration: elapsed,
        averagePace: pace,
      };
    });
  }, []);

  const startTracking = useCallback(async () => {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser.');
    }

    startTimeRef.current = Date.now();
    pausedDurationRef.current = 0;
    isPausedRef.current = false;

    setState({ ...INITIAL_STATE, isTracking: true });

    watchIdRef.current = navigator.geolocation.watchPosition(
      processPosition,
      (error) => {
        console.warn('[useLocationTracking.web] Geolocation error:', error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000,
      },
    );

    // Duration timer — update every second
    timerRef.current = setInterval(() => {
      if (isPausedRef.current) return;
      setState((prev) => {
        if (!prev.isTracking) return prev;
        const elapsed = (Date.now() - startTimeRef.current) / 1000 - pausedDurationRef.current;
        const pace = calculatePace(prev.distance, elapsed);
        return { ...prev, duration: elapsed, averagePace: pace };
      });
    }, 1000);
  }, [processPosition]);

  const stopTracking = useCallback(async (): Promise<LocationState> => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    let finalState: LocationState = INITIAL_STATE;
    setState((prev) => {
      finalState = { ...prev, isTracking: false };
      return finalState;
    });

    return finalState;
  }, []);

  const pauseTracking = useCallback(() => {
    isPausedRef.current = true;
    pauseStartRef.current = Date.now();
  }, []);

  const resumeTracking = useCallback(() => {
    if (isPausedRef.current) {
      pausedDurationRef.current += (Date.now() - pauseStartRef.current) / 1000;
      isPausedRef.current = false;
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
