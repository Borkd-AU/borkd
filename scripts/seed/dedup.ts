import { distance as levenshtein } from 'fastest-levenshtein';
import type { CanonicalPin } from './transform/canonical';

/**
 * Haversine distance in meters.
 */
function haversineM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371000;
  const toRad = (deg: number): number => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function nameSimilarity(a: string, b: string): number {
  const norm = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  const dist = levenshtein(x, y);
  return 1 - dist / Math.max(x.length, y.length);
}

// Higher = higher authority when two pins collide on name+location.
// Rationale:
//   * CoS (3)  — official municipal GIS, ground-truth
//   * manual (2)  — curated from council-published lists
//   * osm   (1)  — crowdsourced, can drift
//   * foursquare (1)  — commercial POI dataset, comparable freshness to OSM
const AUTHORITY: Record<CanonicalPin['source'], number> = {
  city_of_sydney: 3,
  manual: 2,
  osm: 1,
  foursquare: 1,
};

export type DroppedPin = CanonicalPin & {
  reason: string;
  conflictWith: string;
};

export type DedupResult = {
  kept: CanonicalPin[];
  dropped: DroppedPin[];
};

/**
 * Greedy dedup: iterate by descending authority, drop anything within
 * 50m + name similarity > 0.7 of an already-kept pin.
 *
 * ODbL discipline: OSM rows are dropped cleanly (not merged into CoS/manual
 * rows). Keeping them as a Collective Database avoids share-alike spread.
 */
export function dedupePins(all: CanonicalPin[]): DedupResult {
  const sorted = [...all].sort((a, b) => AUTHORITY[b.source] - AUTHORITY[a.source]);
  const kept: CanonicalPin[] = [];
  const dropped: DroppedPin[] = [];

  for (const candidate of sorted) {
    const conflict = kept.find(
      (k) => haversineM(candidate, k) < 50 && nameSimilarity(candidate.name, k.name) > 0.7,
    );
    if (conflict) {
      dropped.push({
        ...candidate,
        reason: `within 50m of ${conflict.source}:${conflict.source_id} (name sim ${nameSimilarity(
          candidate.name,
          conflict.name,
        ).toFixed(2)})`,
        conflictWith: `${conflict.source}:${conflict.source_id}`,
      });
    } else {
      kept.push(candidate);
    }
  }

  return { kept, dropped };
}
