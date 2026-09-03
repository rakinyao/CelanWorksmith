# Ontology Release JSON Workspace Import Design

## Goal

Allow a workspace user to import a published `ontology-model` Release JSON as
an ontology datasource without seeing or selecting a runtime provider. The
existing native datasource, metadata-snapshot, and runtime-gateway pipeline
continues to own all query behavior.

The feature is retained after the Demo phase as the local-file counterpart to
a future direct modelling-platform Release import.

## Product Boundary

The Release remains a semantic, immutable contract. It contains logical
`runtime_binding` asset references and mappings, but no host, credentials,
provider implementation, or environment selection.

CelanWorksmith resolves the environment-specific runtime internally. A
workspace user sees only a datasource name and a Release JSON file. They do
not see `Runtime Provider ID`, connection information, credentials, or a
runtime environment selector.

## Import Flow

The existing ontology datasource import form gains a `Release JSON` source
alongside `Demo`, `Local YAML`, and `Platform Release`.

```text
User selects Release JSON and uploads a file
  -> server validates the Release v2 contract and digest
  -> server resolves the workspace/domain runtime binding
  -> server maps Release elements to an immutable metadata snapshot
  -> server validates snapshot/runtime compatibility
  -> server creates the native ontology datasource
  -> queries use OntologySnapshotRuntimeGateway
```

The local JSON importer and future platform Release importer share the same
validation, mapping, runtime-binding resolution, snapshot creation, and
datasource creation path. They differ only in how the Release bytes are
obtained.

No new frontend ontology state, query executor, or direct MongoDB query path
is introduced.

## Release Mapping

The importer accepts only `format: "ontology-model"` and
`format_version: 2`. It validates the Release digest before creating a
snapshot. It rejects unsupported element kinds, invalid field types,
unresolved entity or field references, non-`VERIFIED` entity links, malformed
runtime bindings, and Function/Action elements in this first mapping phase.

Each `entity_set` becomes an existing object type definition. Its fields map
to existing property metadata while preserving field name, normalized type,
localized display text, primary-key designation, and relevant semantic
properties. Each `entity_set_link` becomes the existing relationship metadata.
The imported snapshot records the Release domain, model identifier, version,
digest, import source, importer actor, and resolved managed runtime-binding
identifier.

The first supported Release has no Function or Action elements; capability
mapping is deliberately deferred until their modelling contract is finalized.

## Workspace Domain Runtime Binding

Runtime configuration is managed separately from Release import. The initial
binding granularity is:

```text
workspaceId + domain -> managed runtime environment
```

For example, a test workspace can bind `business` to the local Demo MongoDB
environment. The binding is created and maintained by a workspace administrator
through a restricted management interface or development bootstrap, never by
the Release import form.

Internally, the binding resolves every `runtime_binding.asset_ref` in the
Release to the managed provider/environment. It verifies the provider kind,
access mode, asset availability, and field/primary-key mappings before a
snapshot becomes usable. The initial UI exposes only one domain binding per
workspace; future per-asset overrides can extend the model without changing
the import API.

Resolution rules are strict:

1. Resolve only the binding for the request workspace and Release domain.
2. Do not fall back to a different workspace or an implicit global provider.
3. If no binding exists, reject import with an error naming the domain.
4. If the managed environment cannot serve every Release asset, reject import.
5. Do not leave a datasource or snapshot when resolution or compatibility
   validation fails.

The datasource stores only an opaque managed binding identifier and the
immutable Release/snapshot identity. Connection strings and credentials are
never placed in the datasource configuration, Release JSON, response payload,
or UI.

## User Experience

Selecting `Release JSON` shows a `.json` file picker. The form retains
datasource name and optional change note, hides both the YAML-specific picker
and Runtime Provider ID field, and does not request a remote Release ID.

Success uses the existing import summary. Errors are sanitized and actionable:

- `Release JSON is invalid or its digest does not match.`
- `The workspace has no runtime environment configured for the business domain.`
- `The configured runtime environment cannot serve the Release assets.`

The error never discloses provider IDs, connection values, credentials, or
cross-workspace configuration.

## Demo Bootstrap And Test Path

The development test setup loads the generated `ont_supplier`, `ont_customer`,
`ont_contract`, and `ont_purchase_order` documents into the Demo MongoDB
environment. It provisions a test workspace domain binding for `business`.

Manual acceptance is:

1. Load the synthetic runtime fixtures.
2. Open a workspace and import `ontology-model-release-demo.json`.
3. Select the created ontology datasource in a Query.
4. Query each of the four entity sets and verify Chinese data, relations,
filters, pagination, and aggregate result behavior.

## Testing

Backend tests cover successful snapshot and datasource creation; digest,
reference, and mapping rejection; missing workspace/domain binding; unavailable
asset rejection; and transactional cleanup after failure. They verify no
provider configuration leaks into datasource properties or error payloads.

Frontend tests cover the `Release JSON` option, `.json` upload acceptance,
hidden provider input, request shape, success summary, and sanitized errors.

An integration test uses the Demo workspace binding and generated runtime data
to import the fixture through the datasource API and query the four mapped
assets using the native runtime gateway.

Regression tests preserve `Demo`, `Local YAML`, and `Platform Release` source
behavior.

## Non-Goals

- Modelling platform connectivity, release browsing, or release publication.
- Per-asset runtime-binding configuration UI.
- Global-provider fallback or import-time user provider selection.
- Credentials, connection strings, or runtime infrastructure configuration in
  Release JSON or datasource configuration.
- Function/Action Release mapping or execution.
- Replacement of the native snapshot/runtime-gateway pipeline.
