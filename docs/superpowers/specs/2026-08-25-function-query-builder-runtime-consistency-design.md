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

## Function Selection and Query Definition

`FUNCTION_QUERY` has one required Function selector, visible in both modes.
The selected `functionId` is the sole authority for Function metadata and is
not editable through Advanced JSON.

`queryMode` controls two parameter-editing views of one canonical definition:

- `BUILDER` is the default for new Function Queries.
- `ADVANCED` exposes the selected Function's parameters JSON.

The saved and executed canonical definition consists of `functionId` and
`parameters`. `queryMode` is editor state and does not alter runtime semantics.
Switching modes must preserve the same Function and parameter values without
generating a second query representation. Advanced JSON edits only the
`parameters` object; the client combines it with the separately selected
Function ID before saving or executing.

In this version, changing the selected Function clears the current parameter
values immediately. Switching mode does not clear values. Confirmation,
drafting, and per-Function parameter restoration are intentionally deferred:
they are user-data safety features that require a separate interaction design,
not implicit state retention in this release.

## Builder Interaction

The Function selector is populated from the existing Function metadata trigger.
In Builder mode, the selected Function's ordered parameter metadata is loaded
through a dynamic selector scoped by the visible `functionId`. Advanced mode
does not depend on that metadata request.

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

Advanced mode is for users who prefer to write the parameter object directly.
It accepts a JSON object only, for example:

```json
{
  "poId": "{{Table1.selectedRow.id}}"
}
```

Malformed JSON is an editor error because no request can be formed. A valid
JSON object is allowed to contain semantic mistakes such as omitted required
parameters, unknown parameter IDs, or unsuitable evaluated values. Those
errors execute through the normal native Query path and the backend returns a
clear Function/parameter error. Advanced mode therefore remains useful for
expert workflows without becoming a second Function-definition protocol.

The Builder contains no output controls. A successful Function Query exposes
its value through the existing native `Query.data` path; errors remain in the
native Query error path.

## Metadata and Validation Flow

1. The user selects a Function, independently of the parameter editing mode.
2. Builder requests typed parameter metadata for that selected `functionId`.
3. Builder stores editable values as the parameters object; Advanced edits the
   same object as JSON text.
4. The client combines selected `functionId` and parameters into the canonical
   definition.
5. The plugin validates required parameters and snapshot Function metadata.
6. `OntologySnapshotRuntimeGateway` resolves the datasource's configured
   provider and calls its snapshot-aware Function implementation.
7. The provider returns the scalar/object result to the native Query pipeline,
   which exposes it as `Query.data`.

The selector response must be metadata only. It does not expose runtime object
rows or run the Function while the editor is being configured.

## Error Handling

- Missing selected `functionId` fails validation before runtime execution.
- Builder validation guides missing or unwritable fields; backend validation
  remains authoritative for both modes.
- Advanced semantic mistakes, including unknown IDs and missing required
  values, return a clear native Query error from backend validation.
- The Builder does not hide a selected Function's required parameter fields.
- Runtime object absence, for example `PurchaseOrder/PO002`, is surfaced as a
  native Query error from the selected provider.
- An unsupported function has a provider-specific, explicit error; no fallback
  to Mock or another provider occurs.
- Invalid evaluated parameter types remain backend validation errors. Builder
  type text is guidance, not a second type system.

## Verification

Focused automated coverage must prove:

1. Function Builder defaults to `BUILDER`; Advanced edits only parameters; the
   separate Function selector remains stable across mode changes.
2. Selecting a different Function clears parameters in this version; mode
   changes preserve them.
3. The Function parameter selector receives the visible selected Function ID and
   returns required/read-only/derived/type metadata.
4. Builder guides parameter validation while backend validation returns clear
   native errors for Advanced semantic mistakes.
5. A snapshot-backed `CalculateDelayDays` execution through the Mongo provider
   reads the Mongo `PurchaseOrder` document, including `PO002`, rather than
   the inherited Mock data store.
6. A missing Mongo object and an unsupported Function return explicit native
   Query errors.

Manual acceptance uses a Mongo-backed Demo datasource, a `PurchaseOrder`
Table, a Button event that runs the Function Query, and a Text Widget bound to
`{{Table1.selectedRow.id}} delayed {{Query1.data}}`.
