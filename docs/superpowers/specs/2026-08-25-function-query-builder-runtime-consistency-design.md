# Function Query Builder and Runtime Consistency Design

## Goal

Make Ontology Function Queries straightforward to configure and ensure that a
Function Query reads the same Runtime Provider data as the Object and Link
Queries bound to the same datasource.

The first supported flow must let a Button run `CalculateDelayDays` for the
currently selected `PurchaseOrder`:

```json
{
  "functionId": "CalculateDelayDays",
  "parameters": {
    "poId": "{{Table1.selectedRow.id}}"
  }
}
```

The result remains the native Appsmith `Query.data` value.

## Scope and Constraints

This design changes the Ontology `FUNCTION_QUERY` editor, metadata selector
contract, mode synchronization, and the Mongo Runtime Provider function path.
It does not add a Function Widget, `$functions` state, an output schema editor,
or a parallel query/action execution path.

The existing Demo Action Server branch remains separate and unmerged while
manual validation is in progress. The Function Query behavior in this design
does not depend on an Action Server: Functions remain read-only Runtime
Provider operations.

No Demo business data is added or normalized in this phase. The correction is
to use the selected datasource's provider consistently, not to copy Mongo data
into a mock store.

## Runtime Provider Boundary

`RuntimeProviderRegistry` already selects one `RuntimeProvider` by the
datasource's `providerId`. The snapshot runtime gateway must use that same
provider for object, link, and function operations. A provider can support
multiple object types and functions; it is not selected per Function.

`MockRuntimeProvider` remains an independent provider for explicit mock/test
use. It must not be made responsible for synchronizing with Mongo data.
`MongoRuntimeDataProvider` retains its legacy fallback only for legacy runtime
calls, but must explicitly implement the snapshot-based
`executeFunction(OntologyProjectDefinition, String, FunctionExecutionRequest)`
path. That implementation reads the target `PurchaseOrder` from the object
type's configured Mongo runtime collection and calculates `delayDays` from
that document.

Consequently, `Table1.selectedRow.id` resolves against the same Mongo data
seen by `Table1`. An absent record remains a normal native Query error with the
object type and ID. An unsupported Function fails explicitly at the selected
provider boundary; it must not silently fall back to a different provider.

Future providers implement the same `RuntimeProvider` interface and receive a
new `providerId`. Explicit function capability discovery is deferred until it
is needed for a provider that cannot describe its functions through the
project metadata.

## Function Query Definition

`FUNCTION_QUERY` gains a `queryMode` with two views of one canonical
definition:

- `BUILDER` is the default for new Function Queries.
- `ADVANCED` exposes the complete JSON definition.

The canonical definition consists solely of `functionId` and `parameters`.
`queryMode` is editor state and does not alter runtime semantics. Switching
modes must preserve the same function and parameter values without generating
a second query representation.

Changing the selected Function clears parameter values belonging to the prior
Function. Switching mode does not clear values. A Builder form with a selected
Function but missing required parameters must not execute successfully.

## Builder Interaction

The Builder first displays a Function selector populated from the existing
Function metadata trigger. Once selected, it requests that Function's ordered
parameter metadata through a new dynamic selector trigger scoped by
`functionId`.

For the first release, every writable input is a dynamic text field that
accepts literal values or Appsmith bindings such as
`{{Table1.selectedRow.id}}`. This keeps values composable with native Widget,
Query, and Form state without a new custom expression language. Each field
uses the metadata `displayName`, parameter ID, data type, and required state.
For `CalculateDelayDays`, the label makes the intended value explicit:
`Purchase Order ID (STRING)`.

Read-only or derived parameters are not editable. Required metadata is shown
in the Builder and remains authoritatively validated by the backend.
`REFERENCE` parameters are expression-only in this first phase. Type-specific
controls for enum choices, dates, and object pickers are deferred until the
metadata contract supplies the required choices and target-type information.

The Builder contains no output controls. A successful Function Query exposes
its value through the existing native `Query.data` path; errors remain in the
native Query error path.

## Metadata and Validation Flow

1. The user selects a Function in Builder mode.
2. The client requests typed parameter metadata for that selected `functionId`.
3. The Builder stores each editable value under
   `definition.parameters.<parameterId>` and stores the Function ID in the
   canonical definition.
4. Advanced mode serializes and edits that same `{ functionId, parameters }`
   object.
5. The plugin validates required parameters and snapshot Function metadata.
6. `OntologySnapshotRuntimeGateway` resolves the datasource's configured
   provider and calls its snapshot-aware Function implementation.
7. The provider returns the scalar/object result to the native Query pipeline,
   which exposes it as `Query.data`.

The selector response must be metadata only. It does not expose runtime object
rows or run the Function while the editor is being configured.

## Error Handling

- Missing or unknown `functionId` and unknown parameter IDs fail validation
  before runtime execution.
- Missing required values fail validation with the parameter identifier.
- The Builder does not hide a selected Function's required parameter fields.
- Runtime object absence, for example `PurchaseOrder/PO002`, is surfaced as a
  native Query error from the selected provider.
- An unsupported function has a provider-specific, explicit error; no fallback
  to Mock or another provider occurs.
- Invalid evaluated parameter types remain backend validation errors. Builder
  type text is guidance, not a second type system.

## Verification

Focused automated coverage must prove:

1. Function Builder defaults to `BUILDER`, renders ordered metadata-derived
   fields, and round-trips with Advanced JSON without losing parameters.
2. Selecting a different Function clears only stale parameter values; mode
   changes preserve values.
3. The Function parameter selector receives the selected Function ID and
   returns required/read-only/derived/type metadata.
4. Validation rejects missing required parameters and unknown parameters.
5. A snapshot-backed `CalculateDelayDays` execution through the Mongo provider
   reads the Mongo `PurchaseOrder` document, including `PO002`, rather than
   the inherited Mock data store.
6. A missing Mongo object and an unsupported Function return explicit native
   Query errors.

Manual acceptance uses a Mongo-backed Demo datasource, a `PurchaseOrder`
Table, a Button event that runs the Function Query, and a Text Widget bound to
`{{Table1.selectedRow.id}} delayed {{Query1.data}}`.
