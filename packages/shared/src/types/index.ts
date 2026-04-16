import type { PIN_CATEGORIES } from '../constants';

// ── Utility types ──────────────────────────────────────────────

export type GpsCoordinate = {
  latitude: number;
  longitude: number;
};

export type GpsLineString = GpsCoordinate[];

// ── Pin categories ─────────────────────────────────────────────

export type PinCategory = (typeof PIN_CATEGORIES)[keyof typeof PIN_CATEGORIES];

// ── User ───────────────────────────────────────────────────────

export type User = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  suburb: string | null;
  bio: string | null;
  total_walks: number;
  total_distance_km: number;
  total_miles_earned: number;
  current_streak: number;
  longest_streak: number;
  is_supporter: boolean;
  supporter_since: string | null;
  created_at: string;
  updated_at: string;
};

export type UserInsert = Pick<User, 'id' | 'display_name'> &
  Partial<Pick<User, 'username' | 'avatar_url' | 'suburb' | 'bio'>>;

export type UserUpdate = Partial<
  Pick<User, 'display_name' | 'username' | 'avatar_url' | 'suburb' | 'bio'>
>;

// ── Dog ────────────────────────────────────────────────────────

export type Dog = {
  id: string;
  user_id: string;
  name: string;
  breed: string | null;
  age_years: number | null;
  weight_kg: number | null;
  personality_tags: string[];
  avatar_url: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
};

export type DogInsert = Pick<Dog, 'name'> &
  Partial<
    Pick<
      Dog,
      'breed' | 'age_years' | 'weight_kg' | 'personality_tags' | 'avatar_url' | 'is_primary'
    >
  >;

export type DogUpdate = Partial<
  Pick<
    Dog,
    'name' | 'breed' | 'age_years' | 'weight_kg' | 'personality_tags' | 'avatar_url' | 'is_primary'
  >
>;

// ── Walk ───────────────────────────────────────────────────────

export type Walk = {
  id: string;
  user_id: string;
  dog_id: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  distance_km: number | null;
  route_geometry: GpsLineString | null;
  average_pace: number | null;
  calories_estimated: number | null;
  miles_earned: number;
  weather_condition: string | null;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type WalkInsert = Pick<Walk, 'started_at'> &
  Partial<Pick<Walk, 'dog_id' | 'note' | 'weather_condition'>>;

export type WalkUpdate = Partial<
  Pick<
    Walk,
    | 'ended_at'
    | 'duration_seconds'
    | 'distance_km'
    | 'route_geometry'
    | 'average_pace'
    | 'calories_estimated'
    | 'miles_earned'
    | 'weather_condition'
    | 'note'
    | 'is_active'
  >
>;

// ── Pin ────────────────────────────────────────────────────────

export type PinType = 'temporary' | 'permanent';
export type PinSource = 'city_of_sydney' | 'osm' | 'manual' | 'foursquare' | 'overture';

/**
 * Shape returned by the `get_pins_in_viewport` Postgres RPC.
 * Flatter than `Pin` — the RPC projects ST_X/ST_Y to separate lng/lat
 * float columns for mobile consumers that don't want to parse PostGIS
 * geometry text.
 */
export type MapPin = {
  id: string;
  user_id: string;
  category: PinCategory;
  subcategory: string | null;
  pin_type: PinType;
  name: string | null;
  note: string;
  photo_url: string | null;
  attribution: string | null;
  upvotes: number;
  downvotes: number;
  verification_score: number;
  longitude: number;
  latitude: number;
  created_at: string;
};

/** Bounding box for viewport queries. Mirrors Supabase RPC param order. */
export type Bbox = {
  min_lng: number;
  min_lat: number;
  max_lng: number;
  max_lat: number;
};

export type Pin = {
  id: string;
  user_id: string;
  walk_id: string | null;
  category: PinCategory;
  /** Free-text subcategory (e.g. 'off_leash_area', 'dog_park', 'park', 'beach', 'cafe', 'fountain'). Null for legacy user pins. */
  subcategory: string | null;
  /** `temporary` = user-reported hazard, `permanent` = pre-seeded location. Default 'temporary'. */
  pin_type: PinType;
  /** Data origin for permanent pins. Null for user-created temporary pins. */
  source: PinSource | null;
  /** External stable id within the source (e.g. 'cos_1234', 'osm_way/567', 'manual_waverley_queens-park'). */
  source_id: string | null;
  /** Display name for permanent pins (CoS park name, OSM tags.name, etc.). Null for temporary. */
  name: string | null;
  /** License attribution string per pin, e.g. '© City of Sydney (CC BY 4.0)'. */
  attribution: string | null;
  note: string;
  photo_url: string | null;
  location: GpsCoordinate;
  upvotes: number;
  downvotes: number;
  verification_score: number;
  /** NULL for permanent pins (enforced by pins_expiry_matches_type CHECK). */
  expires_at: string | null;
  is_expired: boolean;
  created_at: string;
  updated_at: string;
};

export type PinInsert = Pick<Pin, 'category' | 'note' | 'location'> &
  Partial<Pick<Pin, 'walk_id' | 'photo_url'>>;

export type PinUpdate = Partial<Pick<Pin, 'note' | 'photo_url' | 'category'>>;
