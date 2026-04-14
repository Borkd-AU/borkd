import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PATHS } from '../config';
import {
  type CanonicalPin,
  type CosDataset,
  assertSydneyBbox,
  cosToCanonical,
  defaultNote,
} from '../transform/canonical';

type GeoJsonFeature = {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry:
    | { type: 'Point'; coordinates: [number, number] }
    | { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown };
};

type GeoJsonFeatureCollection = {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
};

// GeoJSON filename ↔ our canonical subcategory mapping.
// Name field keys verified 2026-04-14 against live ArcGIS exports.
const DATASETS: Array<{ file: string; dataset: CosDataset; nameField: string[] }> = [
  { file: 'cos-off-leash.geojson', dataset: 'off_leash', nameField: ['ParkName', 'Name', 'NAME'] },
  { file: 'cos-parks.geojson', dataset: 'parks', nameField: ['Name', 'NAME', 'ParkName'] },
  {
    file: 'cos-fountains.geojson',
    dataset: 'fountains',
    nameField: ['site_name', 'Location', 'NAME'],
  },
];

const ATTRIBUTION = '© City of Sydney (CC BY 4.0)';

function pickFirst(properties: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = properties[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

function centroid(feature: GeoJsonFeature): { lat: number; lng: number } | null {
  const g = feature.geometry;
  if (g.type === 'Point') {
    const [lng, lat] = g.coordinates;
    return { lng, lat };
  }
  // Naive centroid for Polygon/MultiPolygon: average of outer ring coords.
  // City of Sydney datasets usually export centroids as Point, so this is a fallback.
  try {
    const coordsFlat: Array<[number, number]> = [];
    const walk = (arr: unknown): void => {
      if (!Array.isArray(arr)) return;
      if (arr.length === 2 && typeof arr[0] === 'number' && typeof arr[1] === 'number') {
        coordsFlat.push(arr as [number, number]);
        return;
      }
      for (const item of arr) walk(item);
    };
    walk(g.coordinates);
    if (coordsFlat.length === 0) return null;
    let sumLng = 0;
    let sumLat = 0;
    for (const [lng, lat] of coordsFlat) {
      sumLng += lng;
      sumLat += lat;
    }
    return { lng: sumLng / coordsFlat.length, lat: sumLat / coordsFlat.length };
  } catch {
    return null;
  }
}

export async function fetchCityOfSydney(): Promise<CanonicalPin[]> {
  const out: CanonicalPin[] = [];

  for (const { file, dataset, nameField } of DATASETS) {
    const path = join(PATHS.dataRaw, file);
    let raw: string;
    try {
      raw = await readFile(path, 'utf8');
    } catch {
      console.warn(
        `[cos] ${file} not found — skipping (download from data.cityofsydney.nsw.gov.au)`,
      );
      continue;
    }

    const fc = JSON.parse(raw) as GeoJsonFeatureCollection;
    if (fc.type !== 'FeatureCollection') {
      throw new Error(`[cos] ${file} is not a GeoJSON FeatureCollection`);
    }

    const { category, subcategory } = cosToCanonical(dataset);
    let kept = 0;
    let skipped = 0;

    for (const feature of fc.features) {
      const centre = centroid(feature);
      if (!centre) {
        skipped += 1;
        continue;
      }
      try {
        assertSydneyBbox(centre, `cos/${file}`);
      } catch (e) {
        console.warn(`[cos] ${file}: ${(e as Error).message} — skipping feature`);
        skipped += 1;
        continue;
      }

      const objectId =
        (feature.properties.OBJECTID as number | undefined) ??
        (feature.properties.objectid as number | undefined) ??
        (feature.properties.id as number | undefined);
      if (objectId === undefined) {
        skipped += 1;
        continue;
      }

      const name = pickFirst(feature.properties, nameField) ?? `Sydney ${subcategory} ${objectId}`;

      out.push({
        source: 'city_of_sydney',
        source_id: `cos_${dataset}_${objectId}`,
        category,
        subcategory,
        name,
        lat: centre.lat,
        lng: centre.lng,
        note: defaultNote(name, subcategory),
        attribution: ATTRIBUTION,
      });
      kept += 1;
    }

    console.log(`[cos] ${file}: kept ${kept}, skipped ${skipped}`);
  }

  return out;
}
