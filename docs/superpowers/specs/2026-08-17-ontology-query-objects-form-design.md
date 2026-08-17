# Ontology Query Objects Structured Form Design

**Status:** Approved direction, pending written-spec review  
**Date:** 2026-08-17

## Goal

Replace the ontology `OBJECT_QUERY` script-first editor with a structured query form whose controls are driven by the selected Object Type metadata, while preserving an advanced JSON mode and the existing native Appsmith Query execution path.

This change establishes a usable foundation for future ontology datasource binding, object display, filtering, sorting, and pagination. It does not introduce a separate Object Widget mode or a parallel runtime execution chain.

## Scope

### Included

- A structured form for the ontology `OBJECT_QUERY` operation.
- Object Type-driven Property, Filter, and Sort selectors.
- Projection, filtering, sorting, and offset/limit pagination.
- Conversion between structured controls and the existing ontology query definition.
- Advanced JSON mode for expert users.
- Frontend and backend validation of metadata-dependent fields.
- Table one-click binding compatibility with the same query definition.
- English-only visible UI text.

### Excluded

- Redesign of Function, Action, or Link operation forms.
- New `$objects`, Object Widget, or side-channel execution APIs.
- Action Server implementation or authorization changes.
- Runtime data provider replacement.
- General Table visual redesign, column configuration, or search usability improvements.

## Design Principles

1. The ontology datasource remains a first-class datasource alongside DB and API datasources.
2. Native Appsmith Query mode remains the only primary binding and execution path.
3. Datasource plugins define operation-specific fields, capabilities, metadata, query serialization, and response normalization.
4. Shared Appsmith infrastructure owns query editing, saving, execution, and Widget binding.
5. The frontend may guide users, but the backend is the final authority for validation.
6. A metadata snapshot is the source of truth for Object Types, Properties, Links, and their data types.
7. Changing Object Type must never leave stale Property, Filter, or Sort identifiers in the saved definition.
8. Advanced JSON is an escape hatch, not the default authoring experience, and must use the same validation path.

## User Experience

The default `Query Objects` editor presents these controls in order:

1. `Object Type` - required, loaded from the current ontology metadata snapshot.
2. `Properties` - optional multi-select projection of visible properties; the default is all visible properties when no explicit projection is selected.
3. `Filters` - zero or more rows containing Property, Operator, and Value.
4. `Sort` - optional Property and Direction.
5. `Pagination` - Offset and Limit with safe defaults.
6. `Advanced JSON` - an explicit mode switch that exposes the serialized query definition.

All labels, placeholders, helper text, validation messages, and empty states added by this feature are English. Existing internationalization conventions remain the extension point for future localization.

## Metadata Dependency Rules

After an Object Type is selected, the editor requests metadata for that exact type and snapshot:

- Visible Properties populate the projection, filter, and sort selectors.
- Property data types determine the available operators and value editor.
- Links are not added to the first structured `OBJECT_QUERY` form; they remain available to the existing Link operation and future link expansion work.
- A metadata refresh or Object Type change removes identifiers that are no longer valid.
- A failed metadata request places the form in an explicit error state and prevents execution until the user retries successfully.
- Empty metadata is represented as an empty state, not as an unbounded fallback query.

The frontend may retain valid values while a request is in flight, but it must not silently submit a definition built against an unknown snapshot. The backend verifies the selected Object Type and all referenced Property identifiers against its authoritative snapshot.

## Canonical Query Definition

The structured form serializes to the existing definition shape:

```json
{
  "objectTypeId": "PurchaseOrder",
  "projection": ["id", "delayDays", "supplierId"],
  "filter": {
    "conditions": [
      {
        "propertyId": "delayDays",
        "operator": "gt",
        "value": 0
      }
    ]
  },
  "sort": [
    {
      "propertyId": "delayDays",
      "direction": "DESC"
    }
  ],
  "page": {
    "offset": 0,
    "limit": 50
  }
}
```

The exact existing backend field names remain authoritative. The implementation must preserve compatibility with current `OntologyActionConfiguration` parsing and `OntologyQueryValidator` validation. A form-only rename or a second definition format is not allowed.

### Projection

- Only visible properties from the selected Object Type may be projected.
- Duplicate property identifiers are removed before serialization.
- An empty projection means the provider's existing default projection behavior.

### Filters

- Each condition references a Property identifier, not a display label.
- Operators are selected from the property data type's supported set.
- Values may be literal values or Appsmith expressions when supported by the existing Query editor.
- Invalid, incomplete, or type-incompatible conditions prevent execution.

### Sort

- Sort properties must belong to the selected Object Type and be visible.
- Direction is `ASC` or `DESC`.
- The first implementation supports the existing backend sort contract. Multiple sort rows may be represented only if the backend contract already supports them; otherwise the UI exposes one row and does not invent a new protocol.

### Pagination

- Offset defaults to `0`.
- Limit defaults to the existing safe default of `50`.
- Limit is bounded by the backend maximum of `1,000`.
- Negative offset and non-positive limit values are rejected before execution.
- Table one-click binding may update pagination values through its native query bindings without changing the form contract.

## Advanced JSON Mode

Advanced mode displays the canonical definition, seeded from the structured form. Editing JSON does not update structured controls until it parses and validates successfully. Invalid JSON or metadata references show an actionable error and prevent execution.

Switching back to structured mode must not discard a valid advanced definition. If the definition cannot be represented by the structured controls, the editor keeps advanced mode selected and explains the incompatibility in English.

The implementation should prefer the existing `QUERY_DYNAMIC_INPUT_TEXT` integration if it can support the mode boundary without creating a second editor state. A parallel hidden definition and visible definition must not drift.

## Architecture and Data Flow

```text
Ontology Datasource
    -> current metadata snapshot
    -> Object Type / Property metadata
    -> operation editor controls
    -> canonical OBJECT_QUERY definition
    -> Appsmith Query action
    -> Ontology plugin validator
    -> runtime provider queryObjects
    -> normalized Query response
    -> native Widget binding
```

### Existing components to reuse

- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/object-query.json`
  defines the operation editor controls.
- `OntologyActionConfiguration` parses the Appsmith action configuration and merges selector fields.
- `OntologyQueryValidator` validates Object Type, projection, filters, sort, and pagination against the snapshot.
- `OntologyPlugin` provides metadata, execution, and response normalization.
- `OneClickBindingSaga` and `WidgetQueryGenerators` provide native Widget query creation and property mapping.

The implementation must extend these seams rather than add an ontology-only frontend query executor.

## Validation and Error Handling

### Frontend

- Disable dependent controls until Object Type metadata is available.
- Show loading state while metadata is requested.
- Show retryable error state when metadata loading fails.
- Remove stale dependent values after Object Type changes.
- Block run/save when required fields, filter values, or pagination values are invalid.

### Backend

The existing validator remains authoritative and must reject:

- Unknown Object Type identifiers.
- Hidden or unknown Property identifiers.
- Unsupported operators for the Property data type.
- Invalid filter value types.
- Invalid sort properties or directions.
- Invalid pagination values.
- Definitions that target a different or unavailable metadata snapshot according to the existing datasource contract.

Error messages should identify the operation and field without exposing internal stack traces.

## Test Strategy

### Backend unit tests

- Accept a valid structured query definition.
- Reject an unknown Object Type.
- Reject a Property from another Object Type.
- Reject a hidden Property.
- Accept and reject operators based on property data type.
- Reject invalid filter values.
- Accept valid sort and pagination values.
- Reject negative offset, non-positive limit, and limit above the configured maximum.
- Preserve existing advanced JSON parsing behavior.

### Frontend/editor tests

- Render Object Type options from metadata.
- Load Property options after Object Type selection.
- Reset stale Property, Filter, and Sort values after Object Type changes.
- Render type-appropriate operators.
- Serialize structured controls to the canonical definition.
- Seed Advanced JSON from structured values.
- Keep invalid Advanced JSON from executing.
- Display loading, empty, error, and retry states.

### Integration/regression tests

- Run a generated PurchaseOrder query through the ontology plugin.
- Verify the normalized result remains consumable by a native Table Widget.
- Verify Table one-click binding continues to provide pagination parameters.
- Verify existing Function, Action, Link, DB, and API query paths are unchanged.

## Acceptance Criteria

1. A user can create a PurchaseOrder Query Objects query without writing JSON.
2. Selecting PurchaseOrder dynamically exposes its valid Properties and operators.
3. Changing Object Type cannot leave invalid dependent identifiers in the definition.
4. Filters, sorting, projection, and pagination execute through the existing ontology Query path.
5. The same result can be bound to a native Table Widget.
6. Advanced JSON remains available and uses the same backend validator.
7. Metadata and validation failures are visible, retryable where appropriate, and do not silently execute empty queries.
8. No `$objects` path, Object Widget mode, or parallel execution chain is added.
9. Existing native Datasource and Widget behavior remains regression-free.

## Non-Goals and Follow-Up

The following remain separate work:

- Widget-specific visual improvements for Table, Select, and MultiSelect.
- Native Search and pagination usability refinements.
- Structured Function and Action parameter forms.
- Link expansion controls inside `Query Objects`.
- Object display names, field grouping, semantic descriptions, and localization.
- Action Server authorization and audit policy.
