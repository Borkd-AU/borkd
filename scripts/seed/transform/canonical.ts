/**
 * CanonicalPin — common shape produced by every source (CoS, OSM, manual)
 * before dedup and upsert. Mirrors the subset of `public.pins` columns
 * that seed code actually writes.
 */
export type CanonicalPin = {
  source: 'city_of_sydney' | 'osm' | 'manual';
  /** Unique within (source). E.g. `cos_1234`, `osm_way/567`, `manual_waverley_queens-park`. */
  source_id: string;
  category: 'good_spot' | 'hazard' | 'amenity' | 'wildlife';
  /** Free-text, e.g. 'off_leash_area', 'dog_park', 'park', 'beach', 'cafe', 'fountain'. */
  subcategory: string;
  name: string;
  lat: number;
  lng: number;
  /** Will be stored as `pins.note`, "<name> — <subcategory> (seeded)" by default. */
  note: string;
  /** e.g. '© City of Sydney (CC BY 4.0)' */
  attribution: string;
};

/** Sydney bbox sanity check — catches coordinate-order bugs early. */
export function assertSydneyBbox(p: { lat: number; lng: number }, context: string): void {
  if (p.lat < -34.3 || p.lat > -33.4) {
    throw new Error(`[${context}] lat ${p.lat} outside Sydney bbox (-34.3..-33.4)`);
  }
  if (p.lng < 150.5 || p.lng > 151.6) {
    throw new Error(`[${context}] lng ${p.lng} outside Sydney bbox (150.5..151.6)`);
  }
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function defaultNote(name: string, subcategory: string): string {
  return `${name} — ${subcategory} (seeded)`;
}

// ── OSM tag → category mapping ──────────────────────────────────

export function osmToCanonical(
  tags: Record<string, string>,
): { category: CanonicalPin['category']; subcategory: string } | null {
  if (tags.leisure === 'dog_park') {
    return { category: 'good_spot', subcategory: 'dog_park' };
  }
  if (tags.natural === 'beach') {
    return { category: 'good_spot', subcategory: 'beach' };
  }
  if (tags.amenity === 'cafe') {
    return { category: 'amenity', subcategory: 'cafe' };
  }
  if (tags.amenity === 'restaurant') {
    return { category: 'amenity', subcategory: 'restaurant' };
  }
  if (tags.amenity === 'pub') {
    return { category: 'amenity', subcategory: 'pub' };
  }
  if (tags.amenity === 'drinking_water' && tags.dog === 'yes') {
    return { category: 'amenity', subcategory: 'fountain' };
  }
  if (tags.leisure === 'park' && tags.dog) {
    return { category: 'good_spot', subcategory: 'park' };
  }
  // Fallback for dog=yes / dog=unleashed without specific leisure tag
  if (tags.dog && ['yes', 'unleashed', 'off_leash', 'designated'].includes(tags.dog)) {
    return { category: 'good_spot', subcategory: 'off_leash_area' };
  }
  return null; // caller should skip
}

// ── City of Sydney dataset → category mapping ───────────────────

export type CosDataset = 'off_leash' | 'parks' | 'fountains';

export function cosToCanonical(dataset: CosDataset): {
  category: CanonicalPin['category'];
  subcategory: string;
} {
  switch (dataset) {
    case 'off_leash':
      return { category: 'good_spot', subcategory: 'off_leash_area' };
    case 'parks':
      return { category: 'good_spot', subcategory: 'park' };
    case 'fountains':
      return { category: 'amenity', subcategory: 'fountain' };
  }
}
