# Raw seed data

This folder holds raw GeoJSON / JSON responses from upstream data providers,
committed to git for reproducibility and license compliance (ODbL §4.4
Collective Database accountability).

## Expected files (download manually)

### City of Sydney (CC BY 4.0)

Download as **GeoJSON** from each page and save here:

| File | Source URL |
|------|------------|
| `cos-off-leash.geojson` | https://data.cityofsydney.nsw.gov.au/datasets/cityofsydney::dog-off-leash-parks/explore |
| `cos-parks.geojson` | https://data.cityofsydney.nsw.gov.au/datasets/cityofsydney::parks-1 |
| `cos-fountains.geojson` | https://data.cityofsydney.nsw.gov.au/datasets/cityofsydney::drinking-fountains-water-bubblers/explore |

Click **"Download"** → choose **GeoJSON** → save with the filename above.

### OpenStreetMap (ODbL)

`osm-response.json` is generated automatically by the seed script on first
run. Committed for reproducibility (re-running `pnpm seed` uses the cached
response unless `--refresh` is passed).

## Coordinate reference system

All files here must be **WGS84 (EPSG:4326)**. City of Sydney GeoJSON exports
are already WGS84. If a raw file ever arrives in MGA Zone 56 (EPSG:28356) —
indicator: latitude values around 6,250,000 — it needs to be reprojected
before use (`gdal_ogr2ogr -t_srs EPSG:4326`).

## License

See `../LICENSES.md` for per-file attribution requirements.
