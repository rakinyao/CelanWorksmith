# Table V2 Native Query Usability Design

## Goal

Make the active Appsmith `TableWidgetV2` consume Ontology Query results with
the same native rendering behavior as DB and API Query results. The first
scope covers stable column configuration, search, pagination, and pagination
changes caused by Widget size changes.

## Context

The editor registers `TABLE_WIDGET_V2` as the active Table implementation.
The existing widget already exposes the native Query generation contract:
`tableData`, `onPageChange`, `onSearchTextChanged`, `onSort`, and
`totalRecordsCount`. The observed defects are at the Widget boundary:

- runtime rows may not produce stable visible column configuration;
- search must select either client-side filtering or a server-side Query run;
- an unset or transient page size can produce `NaN` page output;
- height changes can make the current page invalid for the new page size.

## Design Principles

1. Ontology remains a first-class Datasource beside DB and API Datasources.
2. Table behavior uses the existing Query, DataTree, Widget, and event paths.
3. No `$objects`, `$functions`, `$actions`, `$variables`, Object Widget mode,
   ontology-specific reducer, refresh coordinator, or second execution path is
   introduced.
4. Existing DB/API Query behavior remains unchanged.
5. New visible copy is English and uses existing i18n conventions.
6. Widget size changes affect derived pagination state only; they do not create
   a new request mechanism.

## Data Flow

1. A native Query evaluates to an array assigned to `tableData`.
2. `TableWidgetV2` derives the current schema from row keys and synchronizes
   missing primary columns through its existing property update mechanism.
3. Existing column properties are authoritative for labels, aliases, order,
   visibility, width, type, sorting, and custom cell expressions.
4. A successful empty array does not delete persisted column configuration.
5. Query-generated server-side bindings continue to use the existing mapping:
   - `pageSize` -> Query `limit`
   - `pageOffset` -> Query `offset`
   - `searchText` -> Query `where` when a searchable server field is selected
   - `sortOrder.column` and `sortOrder.order` -> Query ordering
   - Query total-record response -> `totalRecordsCount`
6. No Widget-specific transformation of Ontology response envelopes is
   allowed. The Datasource/Query path must provide the same array boundary
   expected by DB/API-backed Widgets.

## Column Synchronization

Column synchronization is idempotent and schema-aware:

- The first non-empty array adds one primary column for each discovered key.
- Existing columns keep their user configuration when rows change values but
  retain the same keys.
- Newly discovered keys receive the existing Table default column settings.
- Removed keys are removed only when they are non-derived runtime columns;
  derived/user-created columns remain intact according to current Table rules.
- Empty, loading, and error values never cause destructive schema updates.
- Repeated evaluation of an equivalent array must not dispatch equivalent
  column updates, preventing flicker and repeated render cycles.

## Search Semantics

The Widget chooses exactly one search strategy for a binding:

- **Client-side search:** when no searchable server field is configured,
  `searchText` filters the loaded array through the existing derived-property
  path. Clearing search restores the unfiltered loaded rows.
- **Server-side search:** when the Query binding declares a searchable field,
  `searchText` triggers the existing Query run callback. The Query receives the
  current search value through its generated binding.

Both strategies reset to page one through the existing metadata update path.
Neither strategy may invoke the other or issue a duplicate Query request.

## Pagination Semantics

Pagination uses a validated page size and a bounded page number:

- The derived page size is always a finite integer of at least `1` before it
  reaches the table component or page-count calculation.
- For client-side pagination, page count derives from loaded row count.
- For server-side pagination, page count derives from
  `totalRecordsCount / pageSize` when the total is a valid non-negative number.
- The page number is reset to `1` when search, page size, or pagination mode
  changes.
- When total count, page size, or Widget height changes, the current page is
  clamped to the new maximum page. A zero-row result remains on page `1`.
- Previous and next controls cannot produce a page below `1` or beyond the
  computed maximum.
- A Widget height change may change the number of visible rows and trigger the
  already-bound native page event when the current page must be reloaded; it
  must not create an independent refresh coordinator or unconditional Query
  execution.

## Loading, Empty, and Error States

- Loading uses the existing `tableData` loading property and keeps the last
  valid Widget metadata until the new result is available.
- A successful empty result renders the native empty Table state with a
  finite page indicator and preserved column configuration.
- Query errors remain in Appsmith's native debugger/error surface. Error
  objects and error strings are not treated as row arrays.
- A failed run does not erase the last valid column configuration or cause a
  pagination request loop.

## Implementation Boundary

Implementation is limited to the active V2 Table and focused tests:

- existing V2 widget utilities and derived-property logic for pure schema and
  pagination helpers;
- V2 lifecycle/event code only where it is required to apply bounded state;
- V2 Query-generation regression tests;
- V2 component/widget tests for columns, search, pagination, and size changes;
- a verification record describing the focused test and low-memory browser
  checks.

The implementation does not modify the old Table widget, DB/API datasource
contracts, Ontology server behavior, Action Server behavior, or unrelated
Widgets.

## Verification Criteria

The design is accepted when focused tests demonstrate:

1. Ontology Query rows generate stable Table columns.
2. Empty, loading, and error values do not produce invalid columns or `NaN`.
3. Existing column settings survive equivalent and value-only data updates.
4. Client-side and server-side search are mutually exclusive and return to
   page one.
5. Client-side and server-side pagination compute finite page counts.
6. Widget height changes recalculate a valid page size and clamp the current
   page without duplicate execution.
7. Native DB/API Table Query tests remain green.
8. A single-worker browser smoke test confirms native Ontology Query to Table
   binding, search, pagination, and a Widget height change.

