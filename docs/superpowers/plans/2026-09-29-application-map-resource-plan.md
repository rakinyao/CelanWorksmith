# Application Map Resource Implementation Plan

> **For agentic workers:** Use `executing-plans` for inline execution, or `subagent-driven-development` if explicitly selected by the user. Execute tasks in order with focused review gates and checkbox tracking.

**Goal:** Allow application authors to upload versioned GeoJSON maps, reuse their region options, and publish without changing maps in already-published applications.

**Architecture:** Application-owned immutable map versions are separate from image assets and ontology datasources. A shared Map Chart resource resolver supports bundled and custom maps; published runtime resolution uses committed version pins rather than a latest-version lookup. Establish publication isolation before exposing uploads.

**Tech Stack:** Java/Reactor/Spring WebFlux, MongoDB, Jackson, React/TypeScript, existing Redux/saga APIs, ECharts, JUnit/Reactor Test, Jest, Playwright.

## Global Constraints

- Approved design: `docs/superpowers/specs/2026-09-29-application-map-resource-design.md`.
- Keep `feat/ontology-datasource-plugin` as the main development branch. Do not push, merge, delete worktrees, or include unrelated worktree changes.
- Application-owned resources only; no remote URLs, drawing editor, automatic drilldown, cross-application sharing, or ordinary Map Widget changes.
- Keep native Query/JS/Action and ontology datasource pipelines unchanged. Map pins are not datasource pins.
- Editor resolves latest validated version; viewer resolves the last successfully published version. Failed publication cannot change effective viewer map pins.
- Preserve bundled China map IDs, `adcode` handling, `{ id, value }` data, and existing click payload fields. Custom IDs are case-sensitive strings; `selectedDataPoint.originalId` preserves the exact ID, while `id` preserves the existing lowercase convention.
- New UI copy uses English i18n source strings and corresponding Chinese resources. DSL keys and IDs are never translated.
- Retain immutable versions indefinitely in this increment. Do not add resource deletion or garbage collection.
- Use authorized test applications for publication tests. Existing edit/view functionality has passed user basic tests; full app regression remains required before formal merge.

## Implementation Map

Server resource code belongs in `app/server/appsmith-server/src/main/java/com/celanworksmith/maps/`; tests mirror that package under `src/test/java/`. Proposed units: `MapGeoJsonValidator`, `ApplicationMapVersion`, `ApplicationMapRepository`, `MongoApplicationMapRepository`, `ApplicationMapService`, `ApplicationMapController`, and `ApplicationMapPublicationService`.

Client API belongs in `app/client/src/api/ApplicationMapsApi.ts`; editor management UI in `app/client/src/pages/AppIDE/components/ApplicationMapResources/`. Runtime resolver and region helpers stay in `app/client/src/widgets/MapChartWidget/`. Application-owned metadata must flow through existing editor/viewer initialization and widget evaluation, not a parallel global execution context.

## Task 1: Prove the publication and viewer contract

**Inspect:**
- `app/server/appsmith-server/src/main/java/com/appsmith/server/services/ce/ApplicationPageServiceCEImpl.java`
- `app/server/appsmith-server/src/main/java/com/appsmith/server/controllers/ApplicationController.java`
- `app/server/appsmith-server/src/main/java/com/celanworksmith/release/ApplicationReleasePublishCoordinator.java`
- `app/server/appsmith-server/src/main/java/com/celanworksmith/release/ApplicationReleaseService.java`
- `app/server/appsmith-server/src/main/java/com/appsmith/server/newpages/base/NewPageServiceCEImpl.java`
- `app/client/src/sagas/InitSagas.ts`
- `app/client/src/ce/api/ApplicationApi.tsx`
- `app/client/src/widgets/BaseWidget.tsx`

**Create tests:** `app/server/appsmith-server/src/test/java/com/celanworksmith/maps/ApplicationMapPublicationContractTest.java`.

**Contract to establish:** Viewer lookup is application-scoped and never resolves latest. Stage immutable versions before native publish; commit effective pins only after native publication succeeds. A viewer can never render new custom geometry under an old committed pin. Active Release pointers are not the viewer map selector. If native partial writes prevent this guarantee, stop here and revise the publication design with the user; do not implement an upload feature on an unproven model.

- [ ] Trace native page/view-mode serialization, public app read permissions, page publish failures, and all native publish entry points. Record the exact integration hook and selector in this plan.
- [ ] Write a focused contract fixture exercising the real native publication boundary with controlled failing page/action saves. Include editor latest B, viewer pinned A, successful publish B, failed publish B, and unknown resource under old pins.
- [ ] Use assertions equivalent to `assertThat(resolvePublished(appId, mapId).versionId()).isEqualTo(versionA)` after uploading B and after a forced native publish error; assert B only after a successful publish and process restart.
- [ ] Run the new test in isolation and verify the expected missing integration fails, rather than a setup or compilation failure.
- [ ] Prototype the smallest publication adapter under `maps/` using native permission checks. On failure retain A, and reject any newly published custom reference not in committed pins instead of resolving B. If that rejects a previously working viewer map after partial publish, treat it as a failed isolation gate, not an acceptable test pass.
- [ ] Verify concurrent uploads cannot change the frozen candidate; serialize concurrent publications per application or use a compare-and-set token with fail-closed viewer resolution. Test both publishers and process restart recovery.
- [ ] Record activation/rollback semantics: reject a map-bearing Release activation if its map pins differ from effective native viewer pins; allow ordinary non-map releases unchanged. Do not add whole-application restoration from redacted snapshots.
- [ ] Review the proof and commit only contract tests and necessary bounded integration changes. Continue only after the isolation gate passes.

Run from `app/server`:

```bash
mvn -q -pl appsmith-server -am -Dtest=ApplicationMapPublicationContractTest -Dsurefire.failIfNoSpecifiedTests=false test
```

## Task 2: Immutable resource storage, validation, and application ACL

**Create:** The resource server units listed above, excluding `ApplicationMapPublicationService`; `MapGeoJsonValidatorTest`, `ApplicationMapServiceTest`, `ApplicationMapControllerTest` in the matching test package.

**Interfaces:**

```java
record RegionOption(String label, String value) {}
record MapVersionRef(String applicationId, String resourceId, String versionId, String digest) {}
// ApplicationMapVersion carries ref, resourceName, createdAt, validatedGeoJson, regionOptions.
// Service operations return Mono/Flux and check native application permissions first:
// create(applicationId, name, boundedJsonBytes)
// replace(applicationId, resourceId, boundedJsonBytes)
// listLatest(applicationId), getEditorVersion(applicationId, resourceId)
// getPublishedVersion(applicationId, resourceId): committed pin only, never latest
```

Editor endpoints under `/api/v1/celanworksmith/applications/{applicationId}/maps`: `POST` create, `GET` list, `POST /{resourceId}/versions` replace, `GET /{resourceId}/editor` editor metadata/content. Viewer endpoint `GET /{resourceId}/published` checks native viewer access and committed pin. No unauthenticated version-by-ID backdoor. Return JSON, `nosniff`, and private/revalidation-aware cache headers; support ETag by digest without caching permission failures.

- [ ] Add failing validator tests for valid Polygon/MultiPolygon, duplicate IDs, missing names, malformed JSON, null geometry, unclosed rings, nonfinite coordinates, unsupported geometry, excessive bytes, vertices, and features.
- [ ] Start with explicit configurable defaults: 10 MiB UTF-8 input, 10,000 features, 500,000 total coordinate positions, and 64 JSON nesting levels. Enforce bounded streaming input before full decoding; test boundary equality and limit + 1.
- [ ] Accept finite 2D coordinates and closed rings of at least four positions. Geographic and consistent local planar coordinates both work for a standalone campus map; do not reinterpret or reproject them. Reject mixed coordinate dimensions, nonfinite values, and invalid ring topology with an explanatory error.
- [ ] Require every feature to be a Polygon/MultiPolygon with nonblank string `properties.id` and `properties.name`; compare IDs exactly. Retain geometry, extract ordered region options, and render labels as escaped text.
- [ ] Include a validator case with `properties.id = "Building-A"` and local coordinate positions `[0, 0]`, `[10, 0]`, `[10, 10]`, `[0, 0]`; expect `{ label: "North Hall", value: "Building-A" }`, while `"building-a"` remains a distinct ID.
- [ ] Implement repository persistence with application/resource/version lookup indexes, immutable inserts, digest over canonical accepted JSON, and atomic latest-version selection. Replacement identifies resource by ID, not display name. Failed validation does not advance latest.
- [ ] Add service/controller tests for cross-application read/write, non-editor upload, legitimate public-app viewer access to published resources only, and unpublished-version denial.
- [ ] Run the three focused suites, inspect failures, perform bounded formatting check, review, and commit explicit resource paths only.

```bash
mvn -q -pl appsmith-server -am -Dtest=MapGeoJsonValidatorTest,ApplicationMapServiceTest,ApplicationMapControllerTest -Dsurefire.failIfNoSpecifiedTests=false test
```

## Task 3: Publication pinning and diagnostics

**Create:** `ApplicationMapPublicationService.java` and `ApplicationMapPublicationServiceTest.java` in the resource package.
**Modify:** Native hook established in Task 1; `ApplicationReleaseValidationService.java`, `ApplicationReleaseSnapshotBuilder.java`, `ApplicationReleaseService.java`, and `ApplicationReleasePublishCoordinator.java` only as required for scoped validation and evidence.

**Interfaces:** `MapVersionRef` from Task 2; `prepare(applicationId)` freezes eligible versions and returns a candidate/token; `commit(candidate)` uses the proven publication protocol; `resolvePublished(applicationId, resourceId)` returns committed versions. Release snapshots record pins as map-specific evidence, not `ReleaseDatasourcePin` entries.

- [ ] Write tests where a missing/cross-application custom map blocks preflight, a native JS or API action does not produce a map diagnostic, and built-in-only applications keep existing behavior.
- [ ] Assert the resulting diagnostic identifies the widget path and missing resource ID; publish of a built-in-only application produces no `MapVersionRef` and retains its existing response.
- [ ] Implement traversal of all unpublished page/layout widget trees for custom references. Reject dynamic custom resource-ID expressions in this increment so the complete publish dependency set is statically knowable; built-in `mapType` JS binding remains supported.
- [ ] Freeze all application latest resource versions for the publication candidate, with a compact catalog manifest/digest in snapshot evidence. Validate every selected widget reference. Uploaded replacements after preparation are not eligible until the next publish.
- [ ] Integrate commit into the Task 1 proven native publication protocol; do not publish pins from an asynchronous post-publish hook or from pointer activation alone.
- [ ] Add scoped activation/rollback rejection for differing map manifests, with a diagnostic explaining that native content restoration is not supported. Do not modify historical snapshot contents or disable normal ontology gates.
- [ ] Re-run Task 1 failure/concurrency tests and existing release suites. Review resource pin/geometry retention and commit.

```bash
mvn -q -pl appsmith-server -am -Dtest=ApplicationMapPublicationContractTest,ApplicationMapPublicationServiceTest,ApplicationReleaseValidationServiceTest,ApplicationReleaseSnapshotBuilderTest,ApplicationReleasePublishCoordinatorTest,ApplicationReleaseControllerTest -Dsurefire.failIfNoSpecifiedTests=false test
```

## Task 4: Map Chart resolution and reusable region metadata

**Create:** `app/client/src/api/ApplicationMapsApi.ts`, `app/client/src/widgets/MapChartWidget/mapResourceResolver.ts`, `mapResourceResolver.test.ts`, `mapRegionMetadata.ts`, `mapRegionMetadata.test.ts`.
**Modify:** `MapChartWidget/widget/index.tsx`, `widget/index.test.ts`, `component/index.tsx`, `component/utilities.ts`, related component tests, and `chinaRegionDetails.ts` only to delegate the generalized lookup while preserving its public compatibility wrapper.

**Interfaces:**

```ts
type RegionOption = { label: string; value: string };
type ResolvedMap = {
  registrationKey: string;
  regionKey: "adcode" | "id";
  regionOptions: RegionOption[];
  versionId: string;
};
// DSL: mapSource defaults to "builtin"; customMapResourceId is a literal resource ID.
// resolveMapResource receives applicationId, editor/viewer mode and selected reference.
// Custom registration keys include applicationId, resourceId, versionId and digest.
```

- [ ] Add failing resolver tests for editor B/viewer A, missing resources, cross-app response rejection, cache separation by version/application, and rapid A-to-B selection with late A response.
- [ ] In a widget test, resolve the campus version, expect `MapChart1.regionOptions` to equal `[{ label: "North Hall", value: "Building-A" }]`, and expect it to become `[]` after selecting an invalid resource; test that a late success from the prior request leaves it empty.
- [ ] Implement local-only API calls via the existing API client. Explicitly select editor/published endpoint by actual application mode, not URL guessing. Never send arbitrary resource URLs to `fetch`.
- [ ] Add `mapSource` and `customMapResourceId` without reinterpreting saved built-in `mapType`. Use map-specific `nameProperty` and metadata for labels, escaped tooltip content, and click handling. Guard missing event data.
- [ ] Expose `regionOptions` through existing widget meta/evaluation facilities and autocomplete; reset it and selected click data on a resource/version change or error. Options are independent of `chartData` values. Use stale-request guards so older responses cannot restore cleared metadata.
- [ ] Test SelectBox binding, unknown IDs, uppercase custom IDs, no data, click payload compatibility, built-in maps, and loading failure. Distinguish selectable map catalog entries from region options: the former select maps; the latter select areas inside a map.
- [ ] Run all Map Chart tests, focused lint/format checks, review, and commit runtime paths only. Keep uploads unexposed until Task 3 passes.

From `app/client`:

```bash
./node_modules/.bin/jest src/widgets/MapChartWidget --runInBand --no-cache
```

## Task 5: Editor resource management and end-to-end acceptance

**Create:** `app/client/src/pages/AppIDE/components/ApplicationMapResources/index.tsx`, `index.test.tsx`, and `app/client/playwright/tests/t9/map-chart-resources.spec.ts` following the installed Playwright project conventions.
**Modify:** `app/client/src/pages/AppIDE/components/AppSettings/index.tsx`, `widgets/MapChartWidget/widget/index.tsx`, `api/ApplicationMapsApi.ts`, `i18n/resources/en-US.ts`, and `i18n/resources/zh-CN.ts`.

- [ ] Add failing UI tests for create upload, replacement of a selected resource ID, invalid upload feedback, version/region-count display, and read-only viewer behavior. The upload control is an editor tool, not a FilePicker Widget instance.
- [ ] Implement application-scoped management inside App Settings, and a Map Chart property dropdown backed by validated resource metadata. Preserve built-in grouping. Refresh mounted editor widgets after a replacement through existing application state/saga patterns, not a global event bus.
- [ ] Add English/Chinese i18n keys for controls and errors. Show custom resource provenance separately from the bundled Aliyun source notice; use escaped labels and stable control dimensions.
- [ ] Add a tiny campus GeoJSON fixture with two named building polygons, IDs `Building-A` and `Building-B`, and values 10/20. Exercise selected geometry, region options, tooltips and clicks.
- [ ] In the browser scenario, assert `{{MapChart1.regionOptions}}` feeds the two SelectBox options and that choosing `Building-B` changes the map binding; after a replacement upload, assert edit-mode version changes while the view-mode SVG and pin stay on the previously published version.
- [ ] In an authorized test app publish A, upload B, verify editor B/viewer A, republish to B, and exercise the documented activation rejection. Confirm no internet dependency and that reload preserves resource versions.
- [ ] Use Playwright desktop/mobile screenshots and DOM/SVG checks to verify nonblank map shapes, no resource dialog overflow, and SelectBox binding. Keep any unmet authorization or visual checks explicitly unchecked.
- [ ] Run focused component/Jest and i18n parity tests, server map/release suites, explicit changed-file formatting, and `git diff --check`. Record actual counts and manual evidence; do not claim full regression.
- [ ] Commit changed task paths only and retain the development branch. Full app regression, including existing JS, query, Action and Function editing/viewer workflows, is a formal-merge gate rather than a prerequisite to every task commit.

## Review and execution gates

Task 1 is a deliberate feasibility gate, not authorization to redesign all native publication. If existing partial publication makes strict map isolation impossible with a bounded change, stop and present the evidence and alternatives before continuing. Upload UI is last and cannot ship independently of publication isolation.

Map resource copying/export/import/Git branching must be inspected during Task 1: unsupported operations on map-bearing applications must reject clearly rather than export dangling references or silently reuse the original application's resource IDs. If implementing these workflows requires a separate cross-module project, present that scope decision before enabling resource creation; do not silently disable existing native workflows.

Status at plan creation: no implementation tasks executed. User has approved the design and resource-version behavior. No upload or publication code has changed in this planning turn.
