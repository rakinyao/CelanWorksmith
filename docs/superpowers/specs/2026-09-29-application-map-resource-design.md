# Application-owned custom map resources

## Purpose and scope

Map Chart currently loads only the bundled China maps. Application authors also need to display non-administrative regions, such as a campus and its buildings, without waiting for a platform release. This design adds application-owned, immutable uploaded GeoJSON maps. Bundled China maps remain unchanged and usable offline. This revision supersedes the separate map-version pinning design: native page publication copies the widget's resource reference as part of its normal DSL.

The first increment supports upload, validation, selection, rendering, and reuse of regions as SelectBox options within one application. It does not add a map drawing tool, remote URL loading, automatic multi-level drilldown, cross-application sharing, or changes to the ordinary Map Widget. It does not change the ontology datasource/action pipeline.

## Resource and region contract

- Each upload creates an immutable application-scoped resource ID, an author-facing name, and read-only file content. Updating a map means uploading a new resource and explicitly selecting it in the widget; never overwrite an existing resource ID. Existing resources remain available for published pages. Resources from another application cannot be selected or read.
- An uploaded file must be a size-limited GeoJSON `FeatureCollection` containing at least one renderable `Polygon` or `MultiPolygon` feature. Each selectable feature has `properties.id` (nonempty unique string) and `properties.name` (nonempty display string). The upload interface reports validation errors before saving; do not guess IDs from geometry, names, or array positions. No arbitrary properties are interpreted as code or HTML.
- Preserve accepted geometry for ECharts registration; extract a compact ordered `{ label, value }[]` list from validated features, with `value` equal to the exact `properties.id`. The same IDs are used by `chartData` entries `{ id, value }` and by `selectedDataPoint.originalId`. Preserve `selectedDataPoint.id`'s existing normalized-string behavior for compatibility. Unknown IDs do not create clickable business regions.
- Bundled China data continues to use `properties.adcode`, its current map IDs and click payloads. A map-specific region-key accessor handles the two schemas; uploading a custom resource must not rewrite bundled GeoJSON or force campus IDs into `adcode`.
- Validate file size, JSON syntax, feature count/geometry complexity, duplicate IDs, and access rights server-side. The client may show immediate validation feedback but cannot be the authority. Store and serve accepted JSON with a JSON media type and no executable content; do not use the existing image-only AssetService as a GeoJSON store.

## Editing and runtime behavior

The application editor exposes a small map-resource management surface: upload and name a resource, inspect its region count, and select that resource in Map Chart's Map Type control. Uploading a replacement creates a new entry; the author selects it explicitly. Built-in maps remain in their existing group. Existing Map Chart configurations continue to resolve unchanged. This workflow is for builders, not for end-user file uploads.

The widget stores the immutable application resource ID as its custom map reference, separate from the legacy built-in `mapType` IDs. Both editor and viewer resolve exactly the resource ID in their respective page DSL. A built-in map or custom map loads only from local application/platform endpoints; no external URL fallback. ECharts registration uses a key that includes application ID and resource ID so switching maps cannot reuse stale registered geometry. Changing map resource invalidates prior region options and clears stale click metadata; a missing or unauthorized resource displays a recoverable error rather than silently showing another map.

After the map metadata loads, Map Chart exposes read-only `regionOptions` in its normal evaluated widget data, so a SelectBox can bind `{{MapChart1.regionOptions}}`. Options include all selectable regions in source order, even if `chartData` has no value for them. Before load, on failure, or when the selected resource is unavailable, the property is an empty array. It is not a second application-wide data store or a special JS execution path. Built-in China maps use the same property to remove hand-maintained SelectBox dictionaries.

The editor preview should make the uploaded-file provenance and loading/error status visible. All new application UI copy must use existing i18n resources with English source strings; IDs and DSL fields are not translated. The existing bundled-map source notice must not be presented as the provenance of a custom upload.

## Publishing and retention

The editor uses the uploaded resource ID selected in its widget DSL. Native publication copies this ID to published page DSL together with other widget configuration. The viewer loads exactly the ID in the published DSL; it never resolves by map name or "latest" and never needs a separate map pin, release snapshot field, or map-specific publish commit. A new upload is invisible to the published map until the author selects its new ID and publishes that page. The existing native application publication remains the source of published widget content.

Do not alter native publication, activation, rollback, or the existing release preflight for maps. Native publication is not atomic across pages/actions/themes; a failed publish can leave some published pages updated. A Map Chart on such a page must still resolve its own published DSL resource ID, with no extra map-specific guarantee that a failed publication leaves the entire application unchanged. Keep uploaded files indefinitely in the first increment; do not remove or overwrite a resource referenced by existing pages.

The existing ontology release gates remain responsible for ontology dependencies. Do not introduce a map preflight gate, second action execution path, or datasource pinning path. Map data remains available offline on the same deployment after publish. If a referenced resource is unavailable, show an explicit loading error; the platform does not attest to the business accuracy of author-supplied boundaries or silently substitute another map.

## Verification

- Upload valid campus/building GeoJSON, reject malformed, oversized, duplicate-ID, missing-name and unsupported-geometry files; enforce cross-application read/write denial.
- Select a custom map and use its region IDs in `chartData`; check labels, tooltip, click payload, empty data, unknown IDs, and no remote request. Check built-in China maps and previously saved Map Charts for regression.
- Bind SelectBox to `{{MapChart1.regionOptions}}`; confirm it updates when the selected resource ID changes and becomes empty on a failed load.
- Publish resource A, upload resource B, verify editor and viewer still show A until the author selects B; confirm viewer still shows A until native publish copies B's reference, then shows B. Check missing resources and retained files with an authorized test application. Do not claim the native publish is atomic. Complete full app regression before formal merge, consistent with the current testing checkpoint.

## Implementation sequencing

Implement application-scoped immutable resource APIs and server-side validation, followed by Map Chart resolution and region metadata exposure, then editor upload/selection and targeted edit/view tests. Confirm the existing native page publication copies the custom resource ID without adding map-specific publish infrastructure.
