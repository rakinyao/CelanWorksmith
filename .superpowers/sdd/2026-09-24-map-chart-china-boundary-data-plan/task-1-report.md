# Task 1 Report

## Changes

- Added normalized nationwide DataV GeoJSON at `app/client/public/static/maps/CHINA_PROVINCES.json`.
- Added 33 normalized child GeoJSON resources under `app/client/public/static/maps/china-provinces/`.
- Added `chinaMapManifest.ts` with the nationwide resource, 33 child resources, local-only paths, lookup, and ID validation helpers.
- Added `chinaMapManifest.test.ts` covering nationwide/child counts, Taiwan exclusion, local paths, file existence, and Zhejiang/Guangdong metadata.
- Deleted the nine legacy world/continent/USA map files listed in the task brief.

Nationwide normalization preserves 34 `province` features and the `100000_JD` geometry. The special geometry is retained with `level: "special"` and `isBusinessRegion: false`. Province and child administrative IDs are represented as strings; child coordinates and feature membership are unchanged.

## Source acquisition record

All confirmed DataV endpoints below returned HTTP 200 and JSON. The byte count is the downloaded response size; `features` is the response feature count; `levels` is the set of observed `properties.level` values.

| code | bytes | features | levels |
| --- | ---: | ---: | --- |
| 100000 | 582522 | 35 | province (+ 100000_JD special) |
| 110000 | 101117 | 16 | district |
| 120000 | 70970 | 16 | district |
| 130000 | 73454 | 11 | city |
| 140000 | 60906 | 11 | city |
| 150000 | 79281 | 12 | city |
| 210000 | 161469 | 14 | city |
| 220000 | 147299 | 9 | city |
| 230000 | 146797 | 13 | city |
| 310000 | 83280 | 16 | district |
| 320000 | 97545 | 13 | city |
| 330000 | 120401 | 11 | city |
| 340000 | 127323 | 16 | city |
| 350000 | 114243 | 9 | city |
| 360000 | 121694 | 11 | city |
| 370000 | 167872 | 16 | city |
| 410000 | 153774 | 18 | city |
| 420000 | 155792 | 17 | city |
| 430000 | 175676 | 14 | city |
| 440000 | 192961 | 21 | city |
| 450000 | 167980 | 14 | city |
| 460000 | 34123 | 19 | city |
| 500000 | 162145 | 38 | district |
| 510000 | 164814 | 21 | city |
| 520000 | 130185 | 9 | city |
| 530000 | 122596 | 16 | city |
| 540000 | 134516 | 7 | city |
| 610000 | 71735 | 10 | city |
| 620000 | 105622 | 14 | city |
| 630000 | 97941 | 8 | city |
| 640000 | 49533 | 5 | city |
| 650000 | 119226 | 24 | city |
| 810000 | 132725 | 18 | district |
| 820000 | 13423 | 8 | district |

The confirmed `710000_full` endpoint returned HTTP 404 with a non-JSON response and was rejected; no Taiwan child resource is present.

## Verification

- `cd app/client && yarn g:jest src/widgets/MapChartWidget/chinaMapManifest.test.ts`: **PASS**, 1 suite / 2 tests.
- `cd app/client && yarn exec prettier --check src/widgets/MapChartWidget/chinaMapManifest.ts src/widgets/MapChartWidget/chinaMapManifest.test.ts`: **PASS**.
- `cd app/client && yarn exec eslint src/widgets/MapChartWidget/chinaMapManifest.ts src/widgets/MapChartWidget/chinaMapManifest.test.ts`: **PASS** (only the repository Browserslist staleness notice).
- `git diff --check`: **PASS**.
- Repository search for the nine old `/static/maps/<legacy>.json` paths: **no matches**.
- Static directory check: exactly `CHINA_PROVINCES.json` at the map root and 33 child files; all manifest files exist.

## Self-review

- The manifest has no remote URLs and does not expose `710000`.
- The nationwide file contains all 34 province boundaries plus the retained non-business JD geometry.
- The implementation is intentionally limited to Task 1; runtime widget loading and removed map-type handling remain for Task 2.
- The generated GeoJSON files are large static assets and were sourced directly from the confirmed endpoints; no geometry simplification or coordinate transformation was applied.
