# Ontology Datasource Plugin Design

> Date: 2026-08-13
> Status: approved discussion baseline
> Scope: replace the development-only ontology Widget/Object-mode path with a standard Appsmith Datasource Plugin path.

## 1. Goal

CelanWorksmith shall expose ontology data as a first-class Appsmith datasource. An ontology query must follow the same lifecycle as a database query:

```text
Ontology Project version + Runtime Provider binding
        -> Ontology Datasource
        -> Object / Function / Action / Link Query
        -> Appsmith Action result and DataTree
        -> Native Widget Query/JS binding
```

Widgets do not receive an ontology-specific mode. A Table, Form, Chart, List, Select, or Button consumes a standard action result such as `{{PurchaseOrdersQuery.data}}` and uses its existing rendering, column configuration, pagination, events, error handling, and DataTree behavior.

## 2. Decisions

### 2.1 Datasource model

- Implement a standard PF4J Appsmith plugin named `celanworksmith-ontology-plugin`; it is a datasource plugin, not a server-controller or Widget extension.
- An `Ontology Project` is a versioned semantic definition. It contains stable Object, Property, Function, Action, and Link identifiers and semantic metadata.
- An `Ontology Datasource` is a workspace-scoped, reusable connection resource. It references exactly one `projectId + version`, an immutable metadata snapshot, and one stable `runtimeProviderId`.
- Multiple Apps may use one datasource. An App may use multiple ontology and ordinary Appsmith datasources.
- A single App must not have active queries against two versions of the same `Ontology Project`. The uniqueness rule is `applicationId + ontologyProjectId`; a version change is an explicit datasource upgrade, never a second active binding.

### 2.2 Metadata and runtime boundaries

- The datasource stores a complete immutable metadata snapshot and digest at import time. Query editing and execution validation use this snapshot, never a live "latest project" request.
- Runtime data is separate from semantic metadata. The plugin resolves `runtimeProviderId` to a Runtime Provider and queries only stable Object/Property IDs.
- Replacing a Runtime Provider must not require editing Apps, Queries, or Widgets. A replacement requires a mapping and health validation against the datasource metadata snapshot before activation.
- For this iteration, the built-in demo project uses a Mongo-backed read-only provider. It is a test implementation, not a production Provider contract.

### 2.3 Import, ownership, and versions

- Workspace administrators import a released project from the future ontology management platform or upload a local YAML project in development/offline environments.
- Import creates a normal workspace datasource visible in Datasources. It shows project name, version, source, snapshot digest, provider identifier, status, and change notes.
- Platform imports preserve the publisher release identifier and change notes. Local YAML imports are marked `local-yaml` but otherwise create the same snapshot and datasource contract.
- Datasources are pinned. Upgrade is admin-only: load a candidate snapshot, produce a compatibility report, let the administrator approve it, then atomically replace the active version while preserving an audit and rollback record.
- Production policy for allowing local YAML is a future deployment feature flag; it is not hard-coded into the domain model.

### 2.4 Queries

The plugin creates normal Appsmith Action entities. It supports four operation types with one normalized action configuration schema:

| Operation | Purpose | Standard result |
| --- | --- | --- |
| `OBJECT_QUERY` | Read a collection or object by stable ID, with projection/filter/sort/page parameters | Array of object records |
| `FUNCTION_QUERY` | Run a read-only ontology function | Function result payload |
| `ACTION_QUERY` | Submit a side-effecting business action to Action Server | Action Server result/status payload |
| `LINK_QUERY` | Resolve related objects from a Link definition | Array of related object records |

- The default Object Query projection contains all displayable properties. The visual editor lets users add, remove, and order fields.
- The visual query editor is the default. It is generated from the datasource metadata snapshot and offers Object/Property, filter, sort, paging, Function/Action parameter, and Link selection controls.
- An advanced JSON view edits the exact same normalized configuration. Save/run validates all referenced IDs and values against the pinned snapshot. It cannot override source version, workspace context, caller identity, or audit fields.
- Query results are normal action results. Object Query returns an array as `.data`; raw paging details are carried as normal action metadata/configuration rather than a Widget-private response shape.
- Native Table search, sort, pagination, and event bindings remain native Appsmith behavior. The plugin accepts ordinary query parameters but does not introduce a Widget-specific interaction protocol.

### 2.5 Action Server

- The workspace has one Action Server configuration. Ontology Datasources inherit it and do not duplicate credentials or routing configuration.
- The plugin submits project/version, datasource identity, Action ID, evaluated parameters, request context, and an idempotency key.
- Action Server owns routing, authorization, audit, confirmation policy, execution, write-back, asynchronous status, and its domain error codes.
- CelanWorksmith maps the reply into the standard Appsmith Action success/error model and records the returned audit/trace identifier. The external Action Server protocol is a required integration contract but is out of scope for this implementation.

### 2.6 Permissions

- Workspaces reuse existing Appsmith membership authorization in this iteration.
- Only workspace administrators can import, configure, upgrade, stop, or delete an Ontology Datasource.
- App developers may create Queries from datasources they can see, but cannot alter provider, pinned version, or Action Server configuration.
- Datasource-level ACL and ontology-domain authorization are deferred to a separate iteration and must align with the ontology platform and Action Server.

## 3. Architecture

### 3.1 Plugin boundary

The plugin lives in `app/server/appsmith-plugins/celanworksmithOntologyPlugin/`, alongside database plugins such as `mongoPlugin`. It supplies standard plugin resources (`plugin.properties`, datasource `form.json`, query editor resources, templates, and dependency metadata) and a PF4J `PluginExecutor` extension.

The executor has four focused collaborators:

1. `OntologyDatasourceConfiguration` decodes and validates the immutable datasource fields.
2. `OntologyActionConfiguration` decodes and validates normalized operation configurations against the snapshot.
3. `OntologyRuntimeGateway` resolves a stable Provider identifier and dispatches read operations through the existing runtime port.
4. `OntologyActionServerClient` maps `ACTION_QUERY` to the workspace Action Server protocol.

The existing application-server ontology services may be reused behind these collaborators, but no Widget, Redux, Saga, DataTree, or AppIDE loader is permitted in the new primary path.

### 3.2 Workspace services

The appsmith server owns import and upgrade orchestration because a plugin executor receives only persisted datasource/action configuration. New workspace services own:

- platform/YAML import normalization;
- snapshot persistence and digesting;
- demo project bootstrap as a mock datasource candidate;
- provider registry resolution and validation;
- version uniqueness, compatibility analysis, upgrade audit, and rollback;
- administrator-only APIs used by the Datasource management UI.

The plugin consumes snapshot identifiers from its persisted datasource configuration and never mutates a snapshot while executing an Action.

### 3.3 Native user flow

1. An administrator opens Datasources and chooses **Import Ontology Project**.
2. They choose a platform release or local YAML file, inspect its version/provider/change notes, and create a workspace datasource.
3. An App developer opens the native Query panel, chooses the ontology datasource, picks an operation, and uses the metadata-driven editor or advanced JSON.
4. The developer runs/saves a normal query and binds Widgets to `{{QueryName.data}}` or invokes `{{ActionName.run()}}` using native Appsmith rules.
5. An administrator later selects datasource upgrade, reviews impact analysis, and explicitly changes the pinned version.

## 4. Data contracts

### 4.1 Datasource configuration

The persisted configuration must contain only stable references and snapshot identity:

```json
{
  "projectId": "supply-chain",
  "projectVersion": "1.0.0",
  "metadataSnapshotId": "ontology-snapshot-id",
  "metadataDigest": "sha256:...",
  "source": { "kind": "platform-release", "releaseId": "release-id" },
  "runtimeProviderId": "demo-mongo-readonly"
}
```

The actual Provider endpoint, table/collection mapping, and Action Server credential are not stored in App Query configurations.

### 4.2 Query configuration

All query types use `operation` and a `definition` payload. The plugin validates the payload before dispatch.

```json
{
  "operation": "OBJECT_QUERY",
  "definition": {
    "objectTypeId": "PurchaseOrder",
    "projection": ["id", "supplierId", "delayDays"],
    "filter": { "conditions": [{ "propertyId": "delayDays", "operator": "gt", "value": 0 }] },
    "sort": [{ "propertyId": "delayDays", "direction": "DESC" }],
    "page": { "offset": "{{Table1.pageOffset}}", "limit": "{{Table1.pageSize}}" }
  }
}
```

`FUNCTION_QUERY`, `ACTION_QUERY`, and `LINK_QUERY` use stable `functionId`, `actionId`, or `linkId` plus typed parameter values. Values may retain Appsmith mustache bindings; ID-bearing metadata fields may not.

## 5. Removal policy

There are no production applications to migrate. Therefore this is a clean replacement, not a compatibility project.

1. Build and verify the native datasource/plugin path with the demo Mongo provider.
2. Remove the former `$objects`, `$functions`, `$actions`, `$variables` DataTree nodes, AppIDE ontology loaders, Widget Object modes, object-specific Redux/Saga state, and Widget-specific runtime adapters from executable code.
3. Move readable superseded code and verification notes to the existing ignored archive area with a removal ledger; delete generated build output only.
4. Do not allow both paths to remain active after the replacement checkpoint. The only remaining ontology integration is the datasource plugin path.

## 6. Explicit non-goals

- No new Widget presentation, Table/Chart binding wizard, Query-to-Widget shortcut, or general usability redesign in this iteration.
- No Action Server implementation, datasource-level ACL, semantic LLM UI, or production ontology-platform client protocol beyond a well-defined adapter interface.
- No automatic upgrade, auto-migration, or support for two active versions of one project in an App.
- No Widget-private pagination/search/sort/filter implementation.

## 7. User-facing copy and internationalization

- All user-facing copy introduced by this implementation is English only. Do not render bilingual labels, helper text, placeholders, errors, status names, or buttons.
- Frontend copy must use the existing `react-i18next` integration and semantic keys in `app/client/src/i18n/resources/en-US.ts`; components use `useTranslation()`/`t(key)` rather than hard-coded copy.
- Add matching key locations to `zh-CN.ts` only when the future localization iteration supplies reviewed translations. Until then, English is the fallback and the only rendered text.
- Plugin resource JSON and backend error mapping use stable message keys/error codes where the existing plugin system permits; frontend presentation resolves them through the English resource. Do not embed Chinese text in Java, plugin JSON, or tests.
- Ontology metadata `displayName` and semantic content are data, not UI chrome. They are rendered as authored by the pinned ontology project and are not translated by this iteration.

## 8. Acceptance criteria

1. A workspace administrator imports the built-in demo project or local YAML and sees a normal reusable Ontology Datasource.
2. Two Apps can create native Object Queries against that datasource and bind native Tables to `{{Query.data}}` without Object mode.
3. Function, Action, and Link Queries are native Action entities with normal DataTree/run/error behavior.
4. The pinned snapshot rejects unknown IDs and type-invalid configurations, even if a newer project version is available.
5. A second active datasource/version of the same project cannot be added to one App.
6. Provider validation prevents an incompatible provider switch from affecting existing Apps.
7. After the replacement checkpoint, the executable path contains no ontology-specific Widget modes or `$objects/$functions/$actions/$variables` primary nodes.
8. All new plugin/import/query UI copy resolves through English i18n keys and no new bilingual UI text is introduced.
