import { DuckDBInstance } from '@duckdb/node-api';

const instance = await DuckDBInstance.create();
const conn = await instance.connect();

console.log('Installing extensions...');
await conn.run(`INSTALL httpfs; LOAD httpfs; INSTALL spatial; LOAD spatial;`);
await conn.run(`SET s3_region='us-west-2';`);

// Sydney bbox (same as seed config)
const BBOX = { south: -34.2, west: 150.5, north: -33.5, east: 151.5 };

// Pet-related Overture categories
const PET_CATS = [
  'pet_groomer', 'pet_store', 'veterinarian', 'emergency_pet_hospital',
  'pet_boarding', 'pet_training', 'dog_trainer', 'dog_park', 'dog_walkers',
  'pet_sitting', 'pet_adoption', 'animal_shelter', 'animal_hospital',
  'pet_breeder', 'holistic_animal_care',
].map(c => `'${c}'`).join(',');

// Find the latest release
console.log('Querying Overture Maps for Sydney pet services...');
console.log('(this queries ~1GB of Parquet metadata, may take 30-60s)');

try {
  const result = await conn.runAndReadAll(`
    SELECT
      id,
      names.primary AS name,
      categories.primary AS category,
      ROUND(confidence, 2) AS confidence,
      ST_Y(geometry) AS latitude,
      ST_X(geometry) AS longitude,
      JSON_EXTRACT_STRING(addresses, '$[0].freeform') AS address,
      JSON_EXTRACT_STRING(addresses, '$[0].locality') AS suburb
    FROM read_parquet(
      's3://overturemaps-us-west-2/release/2025-03-01.0/theme=places/type=place/*',
      filename=true, hive_partitioning=1
    )
    WHERE categories.primary IN (${PET_CATS})
      AND bbox.xmin > ${BBOX.west}
      AND bbox.xmax < ${BBOX.east}
      AND bbox.ymin > ${BBOX.south}
      AND bbox.ymax < ${BBOX.north}
    ORDER BY category, name
  `);

  const rows = result.getRowObjects();
  console.log(`\nFound ${rows.length} pet-related places in Sydney!\n`);

  // Group by category
  const byCat = {};
  for (const r of rows) {
    const cat = r.category || 'unknown';
    if (!byCat[cat]) byCat[cat] = [];
    byCat[cat].push(r);
  }

  console.log('Category breakdown:');
  for (const [cat, items] of Object.entries(byCat).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`  ${cat}: ${items.length}`);
    // Show first 3 examples
    for (const item of items.slice(0, 3)) {
      console.log(`    - ${item.name || '(unnamed)'} (${item.suburb || '?'}) [conf=${item.confidence}]`);
    }
  }

  // Write full results to JSON for seed pipeline
  const fs = await import('node:fs');
  fs.writeFileSync('data/seed/raw/overture-pet-sydney.json', JSON.stringify(rows, null, 2));
  console.log(`\nFull results saved to data/seed/raw/overture-pet-sydney.json`);

} catch (e) {
  console.error('Query failed:', e.message);
  // Try older release
  console.log('Trying older release...');
  try {
    const result = await conn.runAndReadAll(`
      SELECT
        id,
        names.primary AS name,
        categories.primary AS category,
        ROUND(confidence, 2) AS confidence,
        ST_Y(geometry) AS latitude,
        ST_X(geometry) AS longitude
      FROM read_parquet(
        's3://overturemaps-us-west-2/release/2024-12-18.0/theme=places/type=place/*',
        filename=true, hive_partitioning=1
      )
      WHERE categories.primary IN (${PET_CATS})
        AND bbox.xmin > ${BBOX.west}
        AND bbox.xmax < ${BBOX.east}
        AND bbox.ymin > ${BBOX.south}
        AND bbox.ymax < ${BBOX.north}
      ORDER BY category, name
    `);
    const rows = result.getRowObjects();
    console.log(`Found ${rows.length} pet-related places (older release)`);
    const byCat = {};
    for (const r of rows) {
      const cat = r.category || 'unknown';
      if (!byCat[cat]) byCat[cat] = [];
      byCat[cat].push(r);
    }
    for (const [cat, items] of Object.entries(byCat).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`  ${cat}: ${items.length}`);
    }
    const fs = await import('node:fs');
    fs.writeFileSync('data/seed/raw/overture-pet-sydney.json', JSON.stringify(rows, null, 2));
    console.log(`Saved to data/seed/raw/overture-pet-sydney.json`);
  } catch (e2) {
    console.error('Older release also failed:', e2.message);
  }
}
