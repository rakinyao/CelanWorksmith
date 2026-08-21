# Ontology Query Result Sizing Design

## Goal

Make an Ontology object Query's result size explicit and independent of a
Table Widget's rendered height. Queries default to a safe, stable result
limit, while users can deliberately request all matching records within a
hard safety boundary.

## Scope

This design applies to Ontology `OBJECT_QUERY` actions in Builder and Advanced
JSON modes, their backend validation and execution, and the Ontology branch of
native Table one-click binding. DB and API datasource behavior is unchanged.

## Result Modes

### Limited

`Limited` is the default result-sizing mode.

- `offset` defaults to `0`.
- `limit` defaults to `100`.
- The Builder permits an explicit integer limit from `1` to `1000`.
- The Query executes exactly the requested page. The limit must not reference
  Table derived state such as `Table1.pageSize`.

### Full

`Full` is an explicit user selection which requests all records matching the
object type, filter, and sort.

- Builder hides the offset and numeric limit inputs and displays an English
  warning that all matching records are loaded into the browser and may take
  significant time or memory.
- Advanced JSON represents the same intent with an explicit pagination mode,
  rather than an arbitrary large numeric limit.
- The backend queries enough data to determine whether the matching total is
  within the hard limit of `5000` records.
- If the total exceeds `5000`, execution fails with a clear error; it does not
  return a silent or partial prefix. The error directs the user to add filters,
  use Limited mode, or use a future server-pagination binding.

The `5000` value is an intentional initial hard limit. Its implementation is
isolated as a named server-side constant so it can be configured later without
changing the Query protocol.

## Query And Table Boundary

Manual Query execution is independent of any consuming Widget's dimensions.
A Query run returns the count selected by its own `Limited` or `Full` mode.

Ontology one-click binding to `TableWidgetV2` uses client-side pagination by
default: the Table receives the Query array and calculates display pages from
its own derived page size. Resizing the Table changes only its display page
size; it never changes the generated Ontology Query's request limit or result
count.

Existing DB/API one-click bindings keep their native server-pagination
behavior. A large-dataset Ontology server-pagination binding is explicitly out
of scope and can be introduced later as a separate, visible mode.

## Data Flow

1. Builder stores either Limited pagination (`offset`, `limit`) or Full mode
   in `formData`; Advanced JSON serializes the same canonical definition.
2. The mode synchronizer preserves the intent while switching between Builder
   and Advanced JSON.
3. Backend validation accepts the allowed mode and numeric bounds, then
   normalizes it into the runtime object-query request.
4. Full mode compares the matching total with `5000` before returning rows and
   fails on overflow.
5. Ontology Table binding supplies `tableData` without `onPageChange`, server
   pagination, or total-record bindings; the existing native client-side Table
   behavior renders and paginates the returned array.

## Error Handling

- Invalid Limited limits fail validation before provider execution.
- Full queries exceeding `5000` fail as a Query error and retain no ambiguous
  partial result.
- Query errors continue through Appsmith's native action error path and are
  not converted into Table rows.

## Verification

Focused tests cover:

1. Builder defaults to Limited with offset `0` and limit `100`.
2. Limited accepts `1` through `1000` and rejects out-of-range values.
3. Builder and Advanced JSON round-trip Full mode without losing intent.
4. Full returns every matching row at or below `5000` and fails above `5000`.
5. Generated Ontology Table bindings use client-side pagination and do not
   bind `Table.pageSize` or `Table.pageOffset` into the Query.
6. Existing DB/API Table generator and pagination tests remain unchanged and
   pass.
