# Application Map Resource Reference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let application authors upload a GeoJSON map, select it in Map Chart, and retain its immutable resource ID through native page publication.

**Architecture:** Each upload is a new immutable, application-owned Mongo resource with a server-generated ID. The widget DSL stores that ID and native publish copies the DSL as-is; both edit and viewer modes load exactly the referenced ID from a local authorized endpoint. There is no independent map pin, map version alias, publication hook, or external URL.

**Tech Stack:** Spring WebFlux/Reactor/Jackson/MongoDB, React/TypeScript, ECharts, Jest, JUnit, Playwright.

## Global Constraints

- Design: `docs/superpowers/specs/2026-09-29-application-map-resource-design.md` as revised. Prior `2026-09-29-application-map-resource-plan.md` is superseded; its Task 1 found native publication is not atomic.
- Keep `feat/ontology-datasource-plugin` as the main development branch; preserve all unrelated dirty/untracked files and do not push/merge.
- Application-level ownership only; upload creates a new ID and never overwrites or deletes existing content. No external URL, separate map pin, release snapshot, map preflight hook, or native publication modification.
- Widget stores `mapSource: "builtin" | "custom"` (default builtin) and literal `customMapResourceId` for a selected uploaded map. Legacy built-in `mapType` and JS binding remain unchanged; `chartData` and click payload fields remain compatible.
- GeoJSON features use unique nonempty `properties.id` and `properties.name`; bundled China maps retain `properties.adcode`. Region IDs are exact strings, `selectedDataPoint.originalId` preserves case, and `selectedDataPoint.id` retains lowercase behavior.
- New UI copy routes through English and Chinese i18n resources; never translate DSL keys. In-app uploads only, read-only retrieval, offline use on the same deployment. Viewer error when missing/unauthorized; no fallback to another resource.
- Tests proportional to each task, full application regression deferred until formal merge. Native publish may be partially applied; never claim failed publication leaves entire app unchanged.

---

### Task 1: Immutable application resource API

**Files:** Create focused `ApplicationMapResource`, `ApplicationMapRepository`, `ApplicationMapService`, `ApplicationMapController` and `MapGeoJsonValidator` under `app/server/appsmith-server/src/main/java/com/celanworksmith/maps/`, with corresponding JUnit tests in `src/test/java/com/celanworksmith/maps/`. Inspect native `ApplicationPermission`, `ApplicationService`, and existing `AssetServiceCEImpl` for ACL/error conventions; do not modify image-only AssetService.

**Interfaces:** `POST /api/v1/celanworksmith/applications/{applicationId}/maps` accepts name and bounded multipart GeoJSON upload; `GET /api/v1/celanworksmith/applications/{applicationId}/maps` lists `{id,name,regionCount}` for authorized editors; `GET /api/v1/celanworksmith/applications/{applicationId}/maps/{resourceId}` returns validated GeoJSON for authorized editors and viewers of that application. Expose ordered region options either via list detail or a metadata GET; do not send full GeoJSON merely to fill map catalog. Enforce IDs scoped by application, with no URL-derived fetch.

- [ ] Write validator tests first (valid two-building FeatureCollection, malformed JSON, duplicate/missing id or name, unsupported geometry, empty features, excessive file size/feature/vertex count, invalid coordinates). Verify RED from missing behavior, then implement and run GREEN.
- [ ] Require Polygon/MultiPolygon, finite 2D coordinates and closed nondegenerate rings; accept consistent local planar campus coordinates. Apply bounded limits before materializing JSON (proposed 10 MiB, 10,000 features, 500,000 coordinate positions); validate exact string ID uniqueness. Store immutable accepted bytes with content digest, name, application ID and ordered region options, using a server-generated opaque resource ID.
- [ ] Write service/controller tests first for create/list/get, denied cross-application access, unauthorized upload, legitimate view-mode access, and immutable ID semantics; implement the minimal service with native application read/edit permissions and application-scoped repository queries.
- [ ] Set `application/json`, `X-Content-Type-Options: nosniff`, and appropriate private caching; no untrusted HTML interpretation or active content. Test error responses for missing resource and bad input.
- [ ] Run focused Java suites and Spotless on changed files; commit only Task 1 paths.

Run from `app/server`: `mvn -q -pl appsmith-server -am -Dtest=MapGeoJsonValidatorTest,ApplicationMapServiceTest,ApplicationMapControllerTest -Dsurefire.failIfNoSpecifiedTests=false test`.

### Task 2: Map Chart resolver and region options

**Files:** Create `app/client/src/api/ApplicationMapsApi.ts`, `app/client/src/widgets/MapChartWidget/mapResourceResolver.ts` and `mapRegionMetadata.ts` with tests; modify `MapChartWidget/widget/index.tsx`, `component/index.tsx`, `component/utilities.ts`, autocomplete and tests only where required. Native `MapChartWidget/chinaMapManifest.ts` remains the built-in catalog.

**Interfaces:** Client API `list(applicationId)` and `get(applicationId, resourceId)` consume Task 1 endpoints. The resolver takes the literal `mapSource`, `customMapResourceId`, application ID, and current built-in `mapType`; it returns an ECharts registration key, validated GeoJSON, `regionKey: "adcode" | "id"`, and `{ label, value }[]`. The widget exposes read-only `regionOptions` through its existing meta/evaluation path, initially and on failure `[]`, to allow `{{MapChart1.regionOptions}}` in SelectBox. Catalog entries (maps) and region options (features) are distinct.

- [ ] Write failing resolver/widget tests: existing bundled map, custom `Building-A` and `Building-B`, exact case-sensitive IDs, tooltip/click payload, empty/unknown IDs, map switch, late response and missing resource. Show RED before implementation.
- [ ] Implement resource resolution without allowing arbitrary URLs or falling back to latest; ECharts registration key includes application ID and immutable resource ID. Preserve builtin `nameProperty: "adcode"`, use `"id"` only for custom. Clear stale selected data and options on switch/error; guard unmounted/late requests.
- [ ] Expose autocomplete for `regionOptions`, preserving existing selectedDataPoint keys and user-provided HTML escaping. Ensure widget DSL is small: only the resource ID, never the uploaded GeoJSON.
- [ ] Run focused Map Chart Jest, changed-file ESLint/Prettier, and commit only Task 2 paths.

Run from `app/client`: `./node_modules/.bin/jest src/widgets/MapChartWidget --runInBand --no-cache`.

### Task 3: Application editor upload and map selection

**Files:** Create `app/client/src/pages/AppIDE/components/ApplicationMapResources/index.tsx` plus tests; modify App Settings navigation/integration, Map Chart property pane, `app/client/src/i18n/resources/en-US.ts` and `zh-CN.ts` and tests, as needed. Follow existing AppIDE/API/saga patterns rather than a new global store.

- [ ] Write failing UI tests: upload valid GeoJSON, show resource name and region count, reject invalid input, select an uploaded resource, and upload another without modifying prior resource or its selected ID. Assert built-in dropdown selection stays intact.
- [ ] Implement a small application-settings resource view and Map Chart dropdown with built-in and application-owned groups. The control stores only the immutable ID and asks explicitly when the author chooses a new upload. Preserve an existing widget's custom ID when the catalog is transiently loading; display an actionable error for a missing resource. Ensure new copy uses i18n resources.
- [ ] Check English/Chinese resource parity and that the bundled Aliyun provenance callout is not shown for custom uploads.
- [ ] Run UI Jest, resource parity, changed-file ESLint/Prettier; commit only Task 3 paths.

### Task 4: Native publication integration verification and review

**Files:** Add focused client/server tests only where the existing DSL copy/viewer lookup needs characterization; add a short checkpoint to this plan for manual tests.

- [ ] Verify with tests that a Map Chart's `customMapResourceId` survives the native `unpublishedPage` to `publishedPage` copy without any map-specific hook. Uploading B does not change a widget referencing A; selecting B in the editor does not change viewer DSL before publish.
- [ ] In an authorized test app create two tiny local GeoJSON maps, bind SelectBox to `{{MapChart1.regionOptions}}`, confirm edit/view map rendering, then select B and publish; viewer reads B's published ID. Confirm missing-resource state and no outbound map request. If authentication is unavailable, report manual checks unexecuted rather than bypassing it.
- [ ] Check application export/import/fork behavior for dangling application-scoped references; document a concrete limitation, or block the affected operation for custom-map apps within scope before claiming it works. Do not touch native publication or release snapshots.
- [ ] Run focused server/client suites, `git diff --check`, and changed-file format checks; perform task review and final scoped review. Record full app regression as a formal-merge gate, not a claim of this task.

## Execution note

Task 1 of the superseded plan stopped at the native partial-publication finding without code commits; do not re-dispatch that gate. This plan intentionally follows existing native partial-publication semantics while making the Map Chart resource ID immutable and self-contained within each published page DSL.
