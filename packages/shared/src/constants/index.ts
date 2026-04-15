export const PIN_CATEGORIES = {
  GOOD_SPOT: 'good_spot',
  HAZARD: 'hazard',
  AMENITY: 'amenity',
  WILDLIFE: 'wildlife',
} as const;

/**
 * Fixed UUID for the system-owned account that owns all permanent (pre-seeded) pins.
 * Seeded by migration 00007 into both `auth.users` and `public.users` (via trigger).
 * Never use this ID for real user data.
 */
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000b0b' as const;

/**
 * Sydney bounding box for Overpass / viewport queries.
 * Order: [south_lat, west_lng, north_lat, east_lng]
 * (matches Overpass QL bbox order; note `ST_MakeEnvelope` uses lng-first).
 *
 * Extended 2026-04-15 to cover Palm Beach / Pittwater peninsula
 * (Mackerel Beach at -33.59, Avalon Beach Reserve at -33.63). Previously
 * north was -33.65 which excluded legitimate Northern Beaches off-leash
 * areas from the seed pipeline. New bounds still stay well inside
 * metropolitan Sydney.
 */
export const BBOX_SYDNEY = {
  south: -34.05,
  west: 150.85,
  north: -33.55,
  east: 151.35,
} as const;

export const PIN_CATEGORY_COLORS = {
  good_spot: '#5B9A6B',
  hazard: '#C75D5D',
  amenity: '#5B89A6',
  wildlife: '#C4944A',
} as const;

export const THEME = {
  colors: {
    cream: '#FAF6F1',
    warmSand: '#F0EBE3',
    charcoal: '#1C1C1C',
    stone: '#8C8279',
    sage: '#7A9E7E',
    terracotta: '#C17C5E',
    linen: '#E8E2DA',
  },
} as const;
