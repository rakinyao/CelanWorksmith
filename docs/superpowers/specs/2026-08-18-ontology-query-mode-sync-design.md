# Ontology Query Builder and Advanced JSON Synchronization Design

**Status:** Approved
**Date:** 2026-08-18
**Related design:** `docs/superpowers/specs/2026-08-17-ontology-query-objects-form-design.md`

## Goal

Make the ontology `OBJECT_QUERY` Builder and Advanced JSON modes two editing
views of one canonical query definition. A generated native Query must show its
actual definition in Advanced mode, and a valid Advanced definition must be
recoverable in Builder mode without silently executing stale fields.

## Scope

### Included

- Canonical `OBJECT_QUERY` definition serialization from Builder controls.
- Seeding Advanced JSON with the current Builder definition.
- Parsing, validating, and hydrating Builder controls from Advanced JSON.
- Mode-switch validation and actionable English error states.
- Read-only Builder previews for structured Filter and Sort JSON views.
- Preservation of Appsmith dynamic bindings such as `{{Table1.pageSize}}`.
- Frontend, plugin-resource, and backend regression coverage.

### Excluded

- A new ontology-specific execution path or DataTree root.
- Changes to Datasource, Runtime Provider, Action Server, or Widget rendering.
- Structured Function, Action, or Link operation editors.
- General Table visual, search, column, or pagination redesign.
- Automatic migration of unrelated legacy Query formats.

## Design Principles

1. The ontology datasource continues to use the native Appsmith Query path.
2. `OBJECT_QUERY.definition` is the canonical semantic representation.
3. Builder controls are a structured projection of that representation, not a
   second execution model.
4. Advanced JSON is an expert editor for the same representation, not an
   example or independent payload.
5. The backend remains the final authority for metadata and value validation.
6. Stable ontology IDs are persisted; display labels are presentation only.
7. Invalid mode transitions never discard the last valid definition.
8. All new visible UI text is English and uses existing i18n extension points.

## Canonical Definition

The supported definition remains the existing backend shape:

```json
{
  "objectTypeId": "PurchaseOrder",
  "projection": ["id", "delayDays", "supplierId"],
  "filter": {
    "conditions": [
      { "propertyId": "delayDays", "operator": "gt", "value": 0 }
    ]
  },
  "sort": [
    { "propertyId": "delayDays", "direction": "DESC" }
  ],
  "page": { "offset": 0, "limit": 50 }
}
```

The serializer may omit optional `projection`, `filter`, and `sort` fields when
they are empty, preserving the current backend defaults. It must preserve
dynamic binding strings in `page`, Filter values, and Sort values without
evaluating or rewriting them during a mode transition.

## Mode Contract

### Builder mode

- `queryMode` is `BUILDER`.
- Object Type, Properties, Filters, Sort, and Pagination controls edit the
  canonical definition.
- The full Advanced JSON editor is hidden.
- Filter and Sort alternate JSON views are read-only previews of their current
  structured values. They are not separate write targets.
- A Builder change updates the canonical serialized definition before save or
  execution.

### Advanced mode

- `queryMode` is `ADVANCED`.
- The Advanced JSON editor displays the current canonical definition, seeded
  from Builder when entering this mode.
- JSON edits remain local to the editor until the JSON parses and passes the
  ontology metadata validation boundary.
- Invalid JSON, unknown Object/Property IDs, unsupported operators, invalid
  values, and invalid pagination prevent execution and show an English error.
- Builder fields are not silently updated from invalid JSON.

### Builder to Advanced

1. Read the current Builder fields.
2. Normalize optional empty values according to the canonical definition.
3. Serialize the normalized definition as JSON.
4. Store/display that JSON in the Advanced editor.
5. Preserve dynamic binding expressions as source text.

### Advanced to Builder

1. Parse the Advanced JSON text.
2. Validate its shape and metadata references against the selected pinned
   snapshot.
3. Normalize defaults and remove invalid dependent values.
4. Hydrate Object Type, Properties, Filter rows, Sort, and Pagination controls.
5. Switch to Builder only after all steps succeed.

If the definition contains valid backend fields that the first Builder cannot
represent, the editor remains in Advanced mode and explains the unsupported
shape in English. It must not truncate or reinterpret the definition.

## State Ownership and Persistence

The editor may use transient UI state while the user is typing, but it must not
create a second persisted query definition. Persisted action form data contains
the existing `queryMode` and canonical `definition` contract. Builder-specific
fields may remain as compatibility inputs during the transition, but the mode
synchronizer must keep them and `definition` consistent at save/run boundaries.

The backend parser keeps the current compatibility behavior for existing
actions. New synchronized actions must resolve to the same definition whether
they were authored in Builder or Advanced mode. Stale fields from the inactive
mode must never override the active canonical definition.

## Error and Loading Behavior

- Advanced JSON syntax errors identify the JSON editor as the source.
- Metadata validation errors identify the Object Type or Property ID.
- A failed conversion keeps the current mode and last valid values intact.
- Switching Object Type clears dependent Builder values that are no longer
  valid, and the canonical definition reflects that clearing.
- No request is sent solely because the user changes editor mode.

## Architecture and Data Flow

```text
Builder controls <-> Query Definition Synchronizer <-> Advanced JSON editor
                                    |
                                    v
                         Appsmith ActionConfiguration
                                    |
                                    v
                  OntologyActionConfiguration / QueryValidator
                                    |
                                    v
                         native Query execution path
```

The implementation should first use plugin resource configuration and existing
`QUERY_DYNAMIC_INPUT_TEXT` behavior. A focused native editor control or shared
mode synchronizer is allowed only where declarative resource JSON cannot
perform the required parse/serialize/hydrate transition. No ontology-specific
Redux/Saga execution state may be introduced.

## Testing Strategy

### Frontend/editor

- Builder-generated actions contain the expected canonical definition.
- Entering Advanced displays the generated definition, not placeholder text.
- Builder edits update serialized Object Type, projection, Filter, Sort, and
  Pagination fields.
- Valid Advanced JSON hydrates all Builder controls.
- Invalid JSON keeps Advanced mode selected and blocks execution.
- Unknown metadata IDs and unsupported operators block switching to Builder.
- Dynamic bindings survive both directions unchanged.
- Builder Filter/Sort JSON views are read-only previews.
- Changing Object Type clears invalid dependent fields.

### Backend/plugin

- Builder and Advanced representations produce equivalent validated queries.
- Inactive-mode stale fields cannot override the active definition.
- Existing advanced JSON parsing and legacy action compatibility remain intact.
- Null optional fields, empty filters, empty sorts, and default pagination retain
  current semantics.

### Integration/manual

1. Generate a `PurchaseOrder` Query from Table one-click binding.
2. Confirm Builder controls show the selected Object Type and fields.
3. Switch to Advanced and confirm the exact generated JSON is shown.
4. Change the JSON to filter `delayDays > 0` and sort descending.
5. Switch back to Builder and verify controls reflect those changes.
6. Execute and bind the result to a native Table.
7. Enter malformed JSON and confirm the mode switch/execution is blocked.

## Acceptance Criteria

- Builder and Advanced are visibly and behaviorally linked views of one query.
- Generated Advanced content is never a placeholder example.
- Valid Advanced edits can be represented and edited in Builder.
- Invalid or unsupported Advanced definitions are not silently discarded.
- Dynamic bindings continue to work with native Table pagination and search.
- The existing ontology plugin execution contract and non-ontology datasources
  remain regression-free.
