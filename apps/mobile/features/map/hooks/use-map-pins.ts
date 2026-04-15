import type { Bbox, MapPin } from '@borkd/shared';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabase';

/**
 * Fetches permanent + active temporary pins whose location falls inside
 * the given viewport bounding box.
 *
 * Backed by the `get_pins_in_viewport(min_lng, min_lat, max_lng, max_lat,
 * category_filter)` Postgres RPC (see `supabase/migrations/00007`).
 * RLS is enforced server-side — anon role sees only permanent pins,
 * authenticated sees permanent + own active temporary.
 *
 * Caching strategy:
 *   * `queryKey` rounds the bbox to 3 decimal places (~100 m) so small
 *     panning jitters reuse the same cached result instead of refetching.
 *   * Global `staleTime: 5 min` from `_layout.tsx` applies — pins are
 *     slow-changing data.
 *   * Disabled (`enabled: false`) when the caller passes a null/invalid
 *     bbox, e.g. before the map has a layout.
 */

type RawRpcRow = {
  id: string;
  user_id: string;
  category: string;
  subcategory: string | null;
  pin_type: string;
  name: string | null;
  note: string;
  photo_url: string | null;
  attribution: string | null;
  upvotes: number;
  downvotes: number;
  verification_score: number | string;
  longitude: number;
  latitude: number;
  created_at: string;
};

function roundBbox(bbox: Bbox): Bbox {
  return {
    min_lng: Math.round(bbox.min_lng * 1000) / 1000,
    min_lat: Math.round(bbox.min_lat * 1000) / 1000,
    max_lng: Math.round(bbox.max_lng * 1000) / 1000,
    max_lat: Math.round(bbox.max_lat * 1000) / 1000,
  };
}

function normalize(row: RawRpcRow): MapPin {
  return {
    id: row.id,
    user_id: row.user_id,
    category: row.category as MapPin['category'],
    subcategory: row.subcategory,
    pin_type: row.pin_type as MapPin['pin_type'],
    name: row.name,
    note: row.note,
    photo_url: row.photo_url,
    attribution: row.attribution,
    upvotes: row.upvotes,
    downvotes: row.downvotes,
    // Supabase returns numeric columns as strings for JSON safety at
    // higher precisions; coerce to number for React Native rendering.
    verification_score:
      typeof row.verification_score === 'string'
        ? Number(row.verification_score)
        : row.verification_score,
    longitude: row.longitude,
    latitude: row.latitude,
    created_at: row.created_at,
  };
}

export type UseMapPinsOptions = {
  bbox: Bbox | null;
  categoryFilter?: string | null;
};

export function useMapPins({ bbox, categoryFilter = null }: UseMapPinsOptions) {
  return useQuery<MapPin[], Error>({
    queryKey: ['map-pins', bbox ? roundBbox(bbox) : null, categoryFilter],
    queryFn: async () => {
      if (!bbox) return [];
      const { data, error } = await supabase.rpc('get_pins_in_viewport', {
        min_lng: bbox.min_lng,
        min_lat: bbox.min_lat,
        max_lng: bbox.max_lng,
        max_lat: bbox.max_lat,
        category_filter: categoryFilter,
      });
      if (error) throw new Error(`get_pins_in_viewport failed: ${error.message}`);
      return (data as RawRpcRow[]).map(normalize);
    },
    enabled: bbox !== null,
    // Pins are effectively static for the viewport duration; skip refetch
    // on window focus, which would hammer Supabase when users tab back.
    refetchOnWindowFocus: false,
  });
}
