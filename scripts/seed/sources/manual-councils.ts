import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';
import { PATHS } from '../config';
import { type CanonicalPin, assertSydneyBbox, defaultNote, slugify } from '../transform/canonical';
import { geocode } from '../transform/nominatim';

// Schema mirrors Pin PART 2 Block 5 doc; see plan for council list + rationale.
// Council names are tracked here so new sources get compile-time errors if
// they forget to add the council or its attribution string.
const manualEntrySchema = z.object({
  name: z.string().trim().min(1),
  council: z.enum([
    'Waverley',
    'Randwick',
    'Woollahra',
    'Inner West',
    'Centennial Parklands',
    'Northern Beaches',
    'Bayside',
  ]),
  category: z.enum(['good_spot', 'amenity']),
  subcategory: z.enum(['off_leash_area', 'dog_park', 'park', 'beach', 'cafe', 'fountain']),
  lat: z.number().min(-34.3).max(-33.4).optional(),
  lng: z.number().min(150.5).max(151.6).optional(),
  address: z.string().trim().min(1).optional(),
  notes: z.string().trim().optional(),
});

export type ManualEntry = z.infer<typeof manualEntrySchema>;

const FILES = [
  'waverley.json',
  'randwick.json',
  'woollahra.json',
  'inner-west.json',
  'centennial.json',
  'northern-beaches.json',
  'bayside.json',
] as const;

function attributionFor(council: ManualEntry['council']): string {
  if (council === 'Centennial Parklands') {
    return '© Centennial Park and Moore Park Trust';
  }
  return `© ${council} Council`;
}

export async function fetchManualCouncils(): Promise<CanonicalPin[]> {
  const out: CanonicalPin[] = [];

  for (const file of FILES) {
    const path = join(PATHS.dataManual, file);
    let raw: string;
    try {
      raw = await readFile(path, 'utf8');
    } catch {
      console.warn(`[manual] ${file} not found — skipping`);
      continue;
    }

    const parsed = JSON.parse(raw) as unknown;
    const entries = z.array(manualEntrySchema).parse(parsed);
    let kept = 0;
    let geocoded = 0;
    let failed = 0;

    for (const entry of entries) {
      let lat = entry.lat;
      let lng = entry.lng;

      if ((lat === undefined || lng === undefined) && entry.address) {
        const geo = await geocode(entry.address);
        if (!geo) {
          console.warn(`[manual] ${file}: geocode failed for "${entry.address}"`);
          failed += 1;
          continue;
        }
        lat = geo.lat;
        lng = geo.lng;
        geocoded += 1;
      }

      if (lat === undefined || lng === undefined) {
        console.warn(`[manual] ${file}: no lat/lng or address for "${entry.name}"`);
        failed += 1;
        continue;
      }

      try {
        assertSydneyBbox({ lat, lng }, `manual/${file}:${entry.name}`);
      } catch (e) {
        console.warn(`[manual] ${(e as Error).message}`);
        failed += 1;
        continue;
      }

      const source_id = `manual_${slugify(entry.council)}_${slugify(entry.name)}`;
      const note = entry.notes?.trim()
        ? `${entry.name} — ${entry.subcategory} · ${entry.notes.trim()}`
        : defaultNote(entry.name, entry.subcategory);

      out.push({
        source: 'manual',
        source_id,
        category: entry.category,
        subcategory: entry.subcategory,
        name: entry.name,
        lat,
        lng,
        note,
        attribution: attributionFor(entry.council),
      });
      kept += 1;
    }

    console.log(`[manual] ${file}: kept ${kept} (${geocoded} geocoded), failed ${failed}`);
  }

  return out;
}
