# Task 3 Report: China Region Metadata and Click Events

## Changes

- Added `getChinaRegionDetail` to derive region labels, IDs, and levels from the registered local GeoJSON properties.
- Updated MapChart tooltip and label formatters to use GeoJSON metadata and preserve numeric zero values.
- Updated click handling to keep the existing `selectedDataPoint` shape while ignoring unknown and synthetic `100000_JD` boundaries.
- Removed the obsolete `countryDetails.ts` metadata table and its references.

## Verification

- `yarn g:jest src/widgets/MapChartWidget --watch=false --runInBand=false`
  - 5 suites passed, 11 tests passed.
- Prettier and staged ESLint checks passed during commit.
- Commit: `92f5ef69e1a8337f5a7748ad312a60b0402fc29c`
