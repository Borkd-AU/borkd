/**
 * CanonicalPin — common shape produced by every source (CoS, OSM, manual)
 * before dedup and upsert. Mirrors the subset of `public.pins` columns
 * that seed code actually writes.
 */
export type CanonicalPin = {
  source: 'city_of_sydney' | 'osm' | 'manual' | 'foursquare';
  /** Unique within (source). E.g. `cos_1234`, `osm_way/567`, `manual_waverley_queens-park`, `fsq_<id>`. */
  source_id: string;
  category: 'good_spot' | 'hazard' | 'amenity' | 'wildlife';
  /**
   * Free-text, one of (not enforced by DB, kept stable for UI filtering):
   *   'off_leash_area' | 'dog_park' | 'park' | 'beach' | 'fountain'
   *   'cafe' | 'restaurant' | 'pub'
   *   'veterinary' | 'pet_shop' | 'pet_grooming' | 'waste_bin' | 'dog_toilet'
   */
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
  // Highest-specificity matches first (dog_park > park > anything dog=* tagged).
  if (tags.leisure === 'dog_park') {
    return { category: 'good_spot', subcategory: 'dog_park' };
  }
  if (tags.natural === 'beach') {
    return { category: 'good_spot', subcategory: 'beach' };
  }

  // ── Pet services (veterinary, shops, grooming) — no dog=* required
  // because these places are dog-relevant by definition.
  if (tags.amenity === 'veterinary') {
    return { category: 'amenity', subcategory: 'veterinary' };
  }
  if (tags.shop === 'pet') {
    return { category: 'amenity', subcategory: 'pet_shop' };
  }
  if (tags.shop === 'pet_grooming') {
    return { category: 'amenity', subcategory: 'pet_grooming' };
  }
  // Dedicated dog toilets (public WC for dogs — rare but valuable).
  if (tags.amenity === 'dog_toilet') {
    return { category: 'amenity', subcategory: 'dog_toilet' };
  }
  // Waste baskets specifically tagged for dog excrement.
  if (tags.amenity === 'waste_basket' && tags.waste === 'dog_excrement') {
    return { category: 'amenity', subcategory: 'waste_bin' };
  }

  // ── Hospitality venues — require explicit dog=* tag so we don't
  // drag in every cafe in Sydney.
  const dogFriendly = tags.dog && ['yes', 'leashed'].includes(tags.dog);
  if (tags.amenity === 'cafe' && dogFriendly) {
    return { category: 'amenity', subcategory: 'cafe' };
  }
  if (tags.amenity === 'restaurant' && dogFriendly) {
    return { category: 'amenity', subcategory: 'restaurant' };
  }
  if (tags.amenity === 'pub' && dogFriendly) {
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

// ── Foursquare category → canonical mapping ─────────────────────
//
// Foursquare Open Source Places (Apache 2.0) ships ~4000 category codes.
// We only accept pet-relevant ones. Each entry maps the FSQ category id
// to our canonical subcategory. Anything not in this table is dropped.
// See https://opensource.foursquare.com/os-places/
//
// Category IDs come from FSQ's taxonomy (stable integer codes).
//   11197  Pet Store
//   11198  Pet Service
//   11139  Veterinarian
//   11135  Pet Cafe (alias for 'Dog-friendly cafe' in 2024+ datasets)
//   10032  Dog Run (public off-leash)
//   19014  Dog Park
//   13032  Café  (we only keep FSQ cafes when the attribute 'dogs_allowed' is set — handled by the parser)
//
// We intentionally keep this mapping narrow (services the product cares
// about); broad lifestyle categories are better served by OSM + city data.
export const FSQ_CATEGORY_MAP: Record<
  string,
  { category: CanonicalPin['category']; subcategory: string }
> = {
  '11197': { category: 'amenity', subcategory: 'pet_shop' },
  '11198': { category: 'amenity', subcategory: 'pet_grooming' },
  '11139': { category: 'amenity', subcategory: 'veterinary' },
  '11135': { category: 'amenity', subcategory: 'cafe' },
  '10032': { category: 'good_spot', subcategory: 'off_leash_area' },
  '19014': { category: 'good_spot', subcategory: 'dog_park' },
};

export function fsqToCanonical(
  categoryIds: string[],
): { category: CanonicalPin['category']; subcategory: string } | null {
  for (const id of categoryIds) {
    const hit = FSQ_CATEGORY_MAP[id];
    if (hit) return hit;
  }
  return null;
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
