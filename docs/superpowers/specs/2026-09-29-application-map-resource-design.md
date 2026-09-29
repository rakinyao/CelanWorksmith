# Application-owned custom map resources

## Purpose and scope

Map Chart currently loads only the bundled China maps. Application authors also need to display non-administrative regions, such as a campus and its buildings, without waiting for a platform release. This design adds application-owned, versioned GeoJSON maps. Bundled China maps remain unchanged and usable offline.

The first increment supports upload, validation, selection, rendering, and reuse of regions as SelectBox options within one application. It does not add a map drawing tool, remote URL loading, automatic multi-level drilldown, cross-application sharing, or changes to the ordinary Map Widget. It does not change the ontology datasource/action pipeline.

## Resource and region contract

- A map resource has an immutable application-scoped resource ID, an author-facing name, and immutable numbered or opaque versions. Replacing its file creates a new version; existing versions are retained while referenced by published applications. Resources from another application cannot be selected or read.
- An uploaded file must be a size-limited GeoJSON `FeatureCollection` containing at least one renderable `Polygon` or `MultiPolygon` feature. Each selectable feature has `properties.id` (nonempty unique string) and `properties.name` (nonempty display string). The upload interface reports validation errors before saving; do not guess IDs from geometry, names, or array positions. No arbitrary properties are interpreted as code or HTML.
- Preserve accepted geometry for ECharts registration; extract a compact ordered `{ label, value }[]` list from validated features, with `value` equal to the exact `properties.id`. The same IDs are used by `chartData` entries `{ id, value }` and by `selectedDataPoint.originalId`. Preserve `selectedDataPoint.id`'s existing normalized-string behavior for compatibility. Unknown IDs do not create clickable business regions.
- Bundled China data continues to use `properties.adcode`, its current map IDs and click payloads. A map-specific region-key accessor handles the two schemas; uploading a custom resource must not rewrite bundled GeoJSON or force campus IDs into `adcode`.
- Validate file size, JSON syntax, feature count/geometry complexity, duplicate IDs, and access rights server-side. The client may show immediate validation feedback but cannot be the authority. Store and serve accepted JSON with a JSON media type and no executable content; do not use the existing image-only AssetService as a GeoJSON store.

## Editing and runtime behavior

The application editor exposes a small map-resource management surface: upload and name a resource, inspect its version and region count, upload a replacement version, and select that resource in Map Chart's Map Type control. Built-in maps remain in their existing group. Existing Map Chart configurations continue to resolve unchanged. This workflow is for builders, not for end-user file uploads.

The widget stores a stable application resource ID as its custom map reference, separate from the legacy built-in `mapType` IDs. Editing always resolves that resource's latest validated version. A built-in map or custom map loads only from local application/platform endpoints; no network API fallback. ECharts registration uses a key that includes the resource ID and resolved version so updating one map cannot reuse stale registered geometry. Changing map resource invalidates prior region options and clears stale click metadata; a missing or unauthorized resource displays a recoverable error rather than silently showing another map.

After the map metadata loads, Map Chart exposes read-only `regionOptions` in its normal evaluated widget data, so a SelectBox can bind `{{MapChart1.regionOptions}}`. Options include all selectable regions in source order, even if `chartData` has no value for them. Before load, on failure, or when the selected resource is unavailable, the property is an empty array. It is not a second application-wide data store or a special JS execution path. Built-in China maps use the same property to remove hand-maintained SelectBox dictionaries.

The editor preview should make version and loading/error status visible. All new application UI copy must use existing i18n resources with English source strings; IDs and DSL fields are not translated. The existing bundled-map source notice must not be presented as the provenance of a custom upload.

## Publishing, activation, and retention

The editor follows the latest uploaded version, while the published application continues to use the version pinned at its last successful native publish. Publishing resolves every referenced custom resource to an immutable `(applicationId, resourceId, versionId, digest)`; preflight rejects missing, invalid, or cross-application references. The publish operation must make the pin available to the actual published widget/runtime lookup, not only to the redacted CelanWorksmith release snapshot. A failed native publish must not change the active map pins. The existing native application publication remains the source of published widget content.

Before implementation, trace the native editor-versus-viewer data path and existing activation/rollback behavior. The implementation must either restore the correct map pin when switching to a previously published application revision, or explicitly prevent activation/rollback from claiming to restore a map revision that native content cannot restore. A release pointer or snapshot digest alone is not sufficient proof of runtime rollback. Keep a resource version as long as any published revision that can be displayed or reactivated refers to it; do not garbage-collect it on replacement. If retention cannot be proven, keep versions indefinitely in the first increment.

The existing ontology release gates remain responsible for ontology dependencies. Map-resource preflight is scoped to custom map references and does not introduce a second action execution or datasource pinning path. Map data remains available offline on the same deployment after publish.

## Verification

- Upload valid campus/building GeoJSON, reject malformed, oversized, duplicate-ID, missing-name and unsupported-geometry files; enforce cross-application read/write denial.
- Select a custom map and use its region IDs in `chartData`; check labels, tooltip, click payload, empty data, unknown IDs, and no remote request. Check built-in China maps and previously saved Map Charts for regression.
- Bind SelectBox to `{{MapChart1.regionOptions}}`; confirm it updates when the map changes or a replacement version is uploaded, and becomes empty on a failed load.
- Publish version A, upload version B, verify editor shows B while the running published app still renders A, then republish and verify B. Exercise native publish failure, reactivation/rollback behavior, missing resources and retained versions with an authorized test application. Complete full app regression before formal merge, consistent with the current testing checkpoint.

## Implementation sequencing

First map the actual native publish/viewer data flow and resource storage capabilities. Then implement application-scoped immutable resource APIs and server-side validation, followed by Map Chart resolution and metadata exposure, then publication pinning and targeted tests. Do not expose an upload action until published-version isolation has an implementable, tested path.
