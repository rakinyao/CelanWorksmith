# Task 4 Report: Map Chart regression and offline acceptance

## Scope

- Added widget configuration coverage for the China nationwide option, the 33
  available province child options, removed legacy map IDs, and the unchanged
  `{ id, value }` data contract.
- Added static resource checks for the nationwide GeoJSON, child resources, old
  bundled map removal, and local-only manifest paths.
- Added chart option coverage for zero values and unknown-region fallbacks.
- Added component-level runtime coverage for local resource loading and ECharts
  registration, known-region click payloads, unavailable-resource recovery, and
  ignored special/unknown region clicks.

## Verification

- `yarn g:jest src/widgets/MapChartWidget`: **7 suites, 21 tests passed**.
- `yarn g:jest src/widgets/MapChartWidget/component/index.test.tsx`:
  **1 suite, 4 tests passed** (included in the aggregate above).
- `yarn exec prettier --check src/widgets/MapChartWidget`: **passed**.
- `yarn exec eslint src/widgets/MapChartWidget`: **passed with 12 existing
  warnings, 0 errors**. Warnings are in the existing component/widget code
  (React hook/compiler/performance rules).
- `git diff --check`: **passed**.
- Static asset inspection: `CHINA_PROVINCES.json` contains **34** province
  business features and one synthetic special feature; the local child
  directory contains **33** JSON resources; all manifest paths are under
  `/static/maps`; the nine legacy map files are absent; no runtime map loader
  URL is present.

## Browser acceptance

The component tests exercise the local fetch and ECharts registration boundary,
successful rendering, known-region click payloads, unknown-region click
filtering, and the recoverable unavailable-resource overlay with a mocked
offline fetch. Full browser acceptance with network disabled was not run in this
task because no running frontend browser session was available; the static
bundle and component-level loader checks provide the offline artifact
verification.
