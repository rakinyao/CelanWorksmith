# Task 2 Report

## Changes

- Replaced geographic map type defaults/options with `CHINA_PROVINCES` and the 33 manifest-backed child map IDs.
- Added China sample data and kept `mapType` as the saved property.
- Updated the map loader to resolve manifest resources, fetch only local static paths, validate HTTP/GeoJSON responses, retry transient failures, and never register invalid/undefined data.
- Added recoverable unavailable-resource state for saved removed map IDs.
- Added business-region filtering that excludes the `100000_JD` special boundary.
- Preserved bound `data` when the map type update hook runs; unbound updates receive the China sample dataset.

## Verification

Commands:

```text
yarn g:jest src/widgets/MapChartWidget/component/resourceState.test.ts --no-cache
PASS (3 tests)

yarn g:jest src/widgets/MapChartWidget/component/utilities.test.ts --no-cache
PASS (2 tests)

yarn g:jest src/widgets/MapChartWidget --no-cache
PASS: 3 suites, 7 tests

yarn exec eslint src/widgets/MapChartWidget/component/resourceState.ts src/widgets/MapChartWidget/component/utilities.test.ts
PASS (Browserslist freshness warning only)
```

The repository-wide type check was not run because the plan explicitly excludes it and the existing `countryDetails.ts` is scheduled for the Task 3 metadata migration after the enum change.

## Self-review

- Loader paths are sourced from `chinaMapManifest.ts`; no URL construction or remote fallback remains.
- Invalid response status, non-FeatureCollection JSON, and missing business features reject before `echarts.registerMap`.
- Existing old saved map IDs render the recoverable error instead of silently failing or fetching remotely.
- Remaining integration coverage for China labels/click metadata and widget/component rendering belongs to Tasks 3 and 4.
