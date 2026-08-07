# Widget Compatibility Matrix

Status: B0 frozen on 2026-08-07
Scope: the first ontology-compatible Widget contract. This document is a
contract for later implementation tasks; it does not change Widget code.

## Contract Rules

- `mode` is either `QUERY` or `OBJECT`.
- A legacy DSL instance with no mode field normalizes to `QUERY`. The
  normalizer must not rewrite the user's other values.
- A newly created ontology-capable Widget defaults to `OBJECT`. A Widget that
  has not opted into ontology capability keeps its existing native behavior.
- `QUERY` keeps the existing Appsmith input and output contract. `OBJECT`
  consumes the shared Object Binding/Metadata Adapter and the existing Object
  Query, Execution, and DataTree layers; Widget code does not call an API.
- Object Type, Property, Link Type, Action, and Object Instance references are
  stable IDs. `displayName` is presentation only and must never be persisted as
  a substitute for an ID. Controls may show `displayName (id)` and search both
  values.
- The common binding vocabulary is:

  ```text
  objectTypeId, source, objectPath, objectIdPath, filter,
  selectedPropertyIds, displayPropertyId, valuePropertyId,
  linkTypeId, actionId
  ```

  These fields are optional by Widget category. Existing public properties
  remain compatible and are mapped into this internal view.

## Input and Behavior Matrix

`Query input` records the current/native source. `Object input` records the
planned normalized source. `Property mapping` names stable IDs, not labels.

| Widget       | Type ID                                          | Mode field / default                  | Query input                                                             | Object input                                                                                             | Object Type / Property mapping                                                                  | Link / Action                                                                      | Refresh policy                                                                                                    | Legacy migration                                                                                       | Verification owner                                              |
| ------------ | ------------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| Table        | `TABLE_WIDGET`                                   | `dataMode`; old `QUERY`, new `OBJECT` | `tableData` array from Query/API binding                                | Object Set from `objectTypeId`, optional `objectFilter` or FilterList output                             | Columns from Object Type metadata; `selectedPropertyIds` and column IDs are stable Property IDs | Row action may use `actionId`; links are not implicit                              | Shared Object Query key; preserve prior rows during refresh; refresh after successful Action                      | Missing `dataMode` -> `QUERY`; keep `tableData`, `selectedRow`, `selectedRows`, `objectFilter`         | Table object-binding tests; Task 4 manual gate                  |
| TableV2      | `TABLE_WIDGET_V2`                                | `dataMode`; old `QUERY`, new `OBJECT` | `tableData` array and native pagination/sorting                         | Same Object Set contract as Table                                                                        | Metadata columns use stable Property IDs; display names are labels                              | Row action may use `actionId`; links use `linkTypeId` only when configured         | Same scoped query and prior-data retention as Table                                                               | Missing `dataMode` -> `QUERY`; preserve `tableData`, pagination, selection, `objectFilter`             | TableV2 render/content tests; Task 4 manual gate                |
| FilterList   | `FILTER_LIST_WIDGET`                             | `dataMode`; old `QUERY`, new `OBJECT` | Query mode keeps legacy `objectTypeId`/`filter` output; no Object fetch | Object mode binds Object Type metadata and local conditions, output `{ typeId, conditions, version: 1 }` | `objectTypeId`, `propertyId` and operator are stable IDs/enum values                            | No Action; Link is not part of filter output                                       | Metadata refresh revalidates conditions without discarding valid local input                                      | Missing `dataMode` -> `QUERY`; preserve `objectTypeId`/`filter` as legacy output, never infer `OBJECT` | FilterList tests; Task 5 manual gate                            |
| ObjectDetail | `OBJECT_DETAIL_WIDGET`                           | `mode`; old `QUERY`, new `OBJECT`     | `objectData` Object Instance expression, commonly selected Query row    | Object Instance from `objectPath` or `objectTypeId` + `objectIdPath`                                     | Displayed and selected properties use stable Property IDs                                       | `linkTypeId` selects linked Object Set; linked instance actions may use `actionId` | Load first configured link eagerly; other links on demand; retain last object while metadata refreshes            | Missing `mode` -> `QUERY`; preserve `objectData`, `displayMode`, `selectedLinkedObject`                | ObjectDetail tests; Task 6 manual gate                          |
| JSONForm     | `JSON_FORM_WIDGET`                               | `formMode`; old `QUERY`, new `OBJECT` | `sourceData` / Query result, `formMode: QUERY`                          | Object Instance plus Object Type schema, `formMode: OBJECT`, optional `objectActionId`                   | Fields map stable Property IDs to `dataType`, `required`, `readOnly`, `derived`                 | Submit uses stable `actionId` (`objectActionId` public alias remains)              | Keep dirty local values during metadata/runtime refresh; refresh Object after successful submit                   | Missing `formMode` -> `QUERY`; preserve `sourceData`, `schema`, `objectData`, `objectActionId`         | ObjectFormMode tests; Task 6 manual gate                        |
| Form         | `FORM_WIDGET`                                    | `formMode`; old `QUERY`, new `OBJECT` | Child widgets and native Form data/actions                              | Object Instance schema propagated to child inputs; Object Action on submit                               | Child bindings use stable Property IDs; no display-name persistence                             | Submit may use stable `actionId`; links are child/widget concerns                  | Preserve child dirty state; refresh only after successful Object submit                                           | Missing `formMode` -> `QUERY`; preserve child DSL and native Form submit properties                    | Form object-binding tests; Task 6 manual gate                   |
| List         | `LIST_WIDGET` / `LIST_WIDGET_V2`                 | `dataMode`; old `QUERY`, new `OBJECT` | `items`/`listData` expression and child template                        | Object Set from `objectTypeId` or `objectPath`; each item is an Object Instance                          | Child bindings resolve stable Property IDs against current item Object Type                     | Child Action uses `actionId`; links use `linkTypeId`                               | Shared query key; preserve rendered previous page during refresh; paginate through Object Query                   | Missing `dataMode` -> `QUERY`; preserve `items`, template, pagination                                  | List/ListV2 focused tests; Task 5 manual gate                   |
| Select       | `SELECT_WIDGET`                                  | `dataMode`; old `QUERY`, new `OBJECT` | `options` plus `label`/`value` expressions                              | Object Set plus `displayPropertyId` and `valuePropertyId`                                                | Both mappings are stable Property IDs; selected value is stable Object/Property value           | Optional option Action uses `actionId`; links unsupported                          | Metadata/data refresh keeps selected stable value if still valid, otherwise type mismatch                         | Missing `dataMode` -> `QUERY`; preserve `options`, `labelKey`, `valueKey`, `selectedOptionValue`       | Select property tests; Task 5 manual gate                       |
| Dropdown     | `DROPDOWN_WIDGET`                                | `dataMode`; old `QUERY`, new `OBJECT` | Native `options`/selected value binding                                 | Same selection contract as Select                                                                        | `displayPropertyId` and `valuePropertyId` stable IDs                                            | Optional `actionId`; links unsupported                                             | Same selection retention and scoped refresh as Select                                                             | Missing `dataMode` -> `QUERY`; preserve native option and selected-value properties                    | Dropdown focused tests; Task 5 manual gate                      |
| MultiSelect  | `MULTI_SELECT_WIDGET` / `MULTI_SELECT_WIDGET_V2` | `dataMode`; old `QUERY`, new `OBJECT` | Native `options` and selected values array                              | Object Set plus stable display/value Property IDs                                                        | Mapping IDs stable; output is an array of stable values                                         | Optional `actionId`; links unsupported                                             | Preserve valid selected values through refresh; remove only values no longer present with explicit mismatch state | Missing `dataMode` -> `QUERY`; preserve `options`, selected values, and native mappings                | MultiSelect property tests; Task 5 manual gate                  |
| ActionButton | `ACTION_BUTTON_WIDGET`                           | `mode`; old `QUERY`, new `OBJECT`     | Native `onClick`/Action trigger                                         | Validated Object Instance target plus `actionId` and parameter bindings                                  | Parameters may reference stable Property IDs; Object Type/Instance must match Action metadata   | Primary contract is `actionId`; Link unsupported                                   | No refresh on failure/cancel; on success use changed-object scoped refresh and retain prior data until coherent   | Missing `mode` -> `QUERY`; preserve native `onClick` and existing Action configuration                 | ActionButton tests and Execution Saga tests; Task 7 manual gate |
| Button       | `BUTTON_WIDGET`                                  | `mode`; old `QUERY`, new `OBJECT`     | Native `onClick` action                                                 | Optional Object Instance target plus `actionId`                                                          | Parameter Property references use stable IDs                                                    | `actionId` supported; links unsupported                                            | Same Action success/failure refresh contract                                                                      | Missing `mode` -> `QUERY`; preserve `onClick`, label and native action fields                          | Button focused tests; Task 7 regression                         |
| Chart        | `CHART_WIDGET`                                   | `dataMode`; old `QUERY`, new `OBJECT` | `chartData`/series expression                                           | Object Property arrays or Object Set with stable label/value Property IDs                                | Label/value and series mappings are stable Property IDs; numeric type validated                 | Link/Action unsupported in data binding; child event actions remain native         | Shared query refresh; retain last valid series while loading; invalidate on type mismatch                         | Missing `dataMode` -> `QUERY`; preserve `chartData`, series config and native events                   | Chart helper tests; Task 8 manual gate                          |
| Statbox      | `STATBOX_WIDGET`                                 | `dataMode`; old `QUERY`, new `OBJECT` | Native value/title expressions                                          | Object Property or Aggregation Variable output                                                           | `displayPropertyId` or aggregation input uses stable IDs; numeric validation                    | Optional display Action may use `actionId`; no Link data binding                   | Retain last value while loading; empty is explicit, not blank fallback                                            | Missing `dataMode` -> `QUERY`; preserve native value/title expressions                                 | Statbox focused tests; Task 8 manual gate                       |
| Progress     | `PROGRESS_WIDGET`                                | `dataMode`; old `QUERY`, new `OBJECT` | Native numeric `value`/`max` expressions                                | Numeric Object Property or Aggregation Variable plus optional stable max Property ID                     | Value/max mappings are stable Property IDs and numeric-compatible                               | Action/Link unsupported in value binding                                           | Retain last valid value while loading; type mismatch is explicit                                                  | Missing `dataMode` -> `QUERY`; preserve `value`, `max`, and native bounds                              | Progress focused tests; Task 8 manual gate                      |
| Text         | `TEXT_WIDGET`                                    | `dataMode`; old `QUERY`, new `OBJECT` | Native `text` expression/string                                         | Object Instance Property selected by stable `displayPropertyId`                                          | Display Property ID and its display formatter are stable; display name is not binding           | Optional `linkTypeId` navigation or native Action, if configured                   | Re-evaluate on Object Query/DataTree changes; retain last display value during refresh                            | Missing `dataMode` -> `QUERY`; preserve `text`, formatting, and native events                          | Text object-property tests; Task 6 manual gate                  |
| Input        | `INPUT_WIDGET` / `INPUT_WIDGET_V2`               | `dataMode`; old `QUERY`, new `OBJECT` | Native `defaultText`/value and validation                               | Writable Object Instance Property by stable `displayPropertyId`                                          | Property `dataType`, `readOnly`, and `required` drive input/validation                          | Submit/change may use stable `actionId`; Link unsupported                          | Preserve user-entered value during metadata/runtime refresh; never overwrite dirty input                          | Missing `dataMode` -> `QUERY`; preserve `defaultText`, `value`, and validation props                   | Input property tests; Task 6 manual gate                        |

All rows above explicitly retain `QUERY`; no Object binding may silently consume
an arbitrary expression that is not recognized by the shared normalizer.

### FilterList Mode Semantics

FilterList is Object-capable. Its public mode field is `dataMode`, with
`OBJECT` as the creation default. In `OBJECT` mode its canonical normalized
value is:

```text
{
  mode: "OBJECT",
  binding: {
    source: "OBJECT_SET",
    objectTypeId,
    filter: { typeId, conditions, version: 1 }
  }
}
```

An old FilterList DSL without `dataMode` normalizes to `QUERY`, as required for
all legacy missing-mode DSL. In that mode the adapter preserves the existing
`objectTypeId` and `filter` public output as a legacy structured filter and
does not issue an Object Query. `options`/legacy consumer bindings remain
available to a future Query-mode FilterList. The normalizer therefore never
silently changes an old FilterList into `OBJECT`, while a newly created
ontology-capable FilterList is unambiguously `OBJECT`.

## Compatibility States

The only allowed state names are `loading`, `ready`, `empty`, `error`,
`permissionDenied`, and `typeMismatch`.

### Shared Layer Ownership

| State              | Shared Object Binding / Metadata / Query layer responsibility                                                 | Widget responsibility                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `loading`          | Set metadata or query status, identify the stable request key, and retain prior successful data for refreshes | Show loading affordance without treating retained data as `empty`                                          |
| `ready`            | Return validated metadata/data and normalized binding                                                         | Render the normal Widget output                                                                            |
| `empty`            | Distinguish no metadata, no Object rows, and no linked results; return typed empty result                     | Render an intentional empty state appropriate to the Widget                                                |
| `error`            | Normalize transport/runtime/validation failures and expose retry metadata                                     | Render actionable error state and retry entry point; do not erase last successful value unless key changed |
| `permissionDenied` | Normalize authorization failure separately from generic `error`; never leak backend details                   | Render access-denied state and disable dependent controls/actions                                          |
| `typeMismatch`     | Validate Object Type, Property data type, deleted IDs, source shape, and Action target before rendering       | Render binding/type error, preserve the user binding for repair, and avoid guessing                        |

### Inherited State Group Contracts

Each Widget row below inherits one group contract and adds its own render
owner and verification case. The group contract is shared behavior, not a
replacement for the per-Widget acceptance row.

| Group                                                               | Inherited requirement                                                                                                                                                                                     |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collection (`Table`, `TableV2`, `List`, `FilterList`)               | Shared query/metadata layer owns request status; the Widget owner renders all six states and retains prior rows during refresh.                                                                           |
| Instance/form (`ObjectDetail`, `JSONForm`, `Form`, `Input`, `Text`) | Shared binding layer validates instance/property shape; the Widget owner renders all six states and preserves repairable user bindings or dirty values.                                                   |
| Selection (`Select`, `Dropdown`, `MultiSelect`)                     | Shared metadata/query layer owns option status; the Widget owner renders all six states and preserves valid stable selections.                                                                            |
| Action (`ActionButton`, `Button`)                                   | Shared execution layer owns action status and authorization; the Widget owner renders `loading` as running/disabled, `ready`, `error`, `permissionDenied`, `typeMismatch`, and `empty` as missing target. |
| Visualization (`Chart`, `Statbox`, `Progress`)                      | Shared property/aggregation layer validates shape; the Widget owner renders all six states and retains the last valid value while loading.                                                                |

### Per-Widget Render Owner and Verification

States not listed as Widget-rendered are still normalized by the shared layer
and must not be silently converted to a normal value. Every row has an
independent owner and a focused acceptance case.

| Widget       | Inherited group | Widget render owner                                       | Required rendered states                                                 | Focused verification case                                                                                        |
| ------------ | --------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Table        | Collection      | `TableWidget` Object Table renderer                       | all six exact states                                                     | Query/Object switch, Object rows, empty result, runtime error, permission denial, deleted Property type mismatch |
| TableV2      | Collection      | `TableWidgetV2` renderer                                  | all six exact states                                                     | Same state fixtures plus V2 pagination and prior-row refresh                                                     |
| FilterList   | Collection      | `FilterListComponent`                                     | all six exact states                                                     | Metadata loading/error, no conditions, permission denial, deleted Property, and Object filter output             |
| ObjectDetail | Instance/form   | `ObjectDetailComponent`                                   | all six exact states                                                     | Missing instance, linked empty/error, permission denial, deleted Property, and valid Object instance             |
| JSONForm     | Instance/form   | `ObjectFormMode` / JSON Form renderer                     | all six exact states                                                     | Schema loading/error, empty Object, permission denial, read-only/type mismatch, dirty-value retention            |
| Form         | Instance/form   | Form container and Object-aware child controls            | all six exact states                                                     | Child schema loading, empty instance, submit error/denial, incompatible field type                               |
| List         | Collection      | `ListWidget` / `ListWidgetV2` item renderer               | all six exact states                                                     | Object page load, empty page, refresh retention, query error, permission denial, item type mismatch              |
| Select       | Selection       | Select option renderer                                    | all six exact states                                                     | Object options load, empty options, stable value retention, permission denial, mapping mismatch                  |
| Dropdown     | Selection       | Dropdown option renderer                                  | all six exact states                                                     | Same selection fixtures with native Query regression                                                             |
| MultiSelect  | Selection       | MultiSelect option renderer                               | all six exact states                                                     | Multiple stable values, empty/error options, denied metadata, invalid mapping                                    |
| ActionButton | Action          | ActionButton component plus Execution Saga status adapter | `loading`, `ready`, `empty`, `error`, `permissionDenied`, `typeMismatch` | Running/duplicate click, missing target, successful scoped refresh, failed action, denied action, invalid target |
| Button       | Action          | Button action renderer                                    | `loading`, `ready`, `empty`, `error`, `permissionDenied`, `typeMismatch` | Native Query click regression plus Object Action success/failure/denial/type mismatch                            |
| Chart        | Visualization   | Chart data/series renderer                                | all six exact states                                                     | Numeric Object Property chart, empty set, query error, denied metadata, non-numeric mismatch                     |
| Statbox      | Visualization   | Statbox value renderer                                    | all six exact states                                                     | Property/aggregation value, loading retention, empty, error, denial, numeric mismatch                            |
| Progress     | Visualization   | Progress value renderer                                   | all six exact states                                                     | Numeric value/max, empty aggregation, query error, denial, non-numeric mismatch                                  |
| Text         | Instance/form   | Text display renderer                                     | all six exact states                                                     | Property display, empty/missing property, error/denial, data-type mismatch, Query regression                     |
| Input        | Instance/form   | Input control and validation renderer                     | all six exact states                                                     | Writable Property, dirty retention, read-only denial, metadata error, incompatible data type                     |

## Migration and Public Names

The following names remain public and backward compatible:

| Existing public property                                                          | Normalized meaning                                     | Rule                                                                                                        |
| --------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `dataMode`                                                                        | `mode` for Table/TableV2 and future collection Widgets | Missing field is `QUERY`; explicit `QUERY` stays `QUERY`; explicit `OBJECT` requires a valid Object binding |
| `formMode`                                                                        | `mode` for JSONForm and future forms                   | Missing field is `QUERY`; explicit `OBJECT` uses Object metadata/schema                                     |
| `objectTypeId`                                                                    | stable Object Type ID                                  | Preserve the ID even when metadata cannot resolve it; never replace it with display name                    |
| `objectData`                                                                      | Object Instance source/path                            | Preserve expression and validate its resolved shape                                                         |
| `objectFilter`                                                                    | Object Query filter                                    | Preserve structured filter and FilterList output version                                                    |
| `objectActionId`                                                                  | stable Action ID for JSONForm submit                   | Keep this alias while the normalized binding uses `actionId`                                                |
| `filter`                                                                          | FilterList structured output                           | Preserve `{ typeId, conditions, version: 1 }` exactly                                                       |
| `tableData`, `sourceData`, `options`, `chartData`, `text`, `defaultText`, `value` | native Query/static inputs                             | Never clear or reinterpret these when mode is `QUERY` or when inactive Object mode is edited                |

Migration occurs at load/normalization boundaries, not during React render.
New defaults are creation-time defaults only. A mode switch must preserve the
inactive mode's user-entered values.

## Verification Gate

Task 1 is complete only when the following are all true:

1. The inventory contains Table, TableV2, FilterList, ObjectDetail, JSONForm,
   Form, List, Select, Dropdown, MultiSelect, ActionButton, Button, Chart,
   Statbox, Progress, Text, and Input.
2. Every inventory row states Query input, Object input, migration rule, and a
   verification owner.
3. Every Object-capable row states Object Type/Property mapping, Link/Action
   support, refresh policy, and all six state responsibilities.
4. The exact compatibility states are used without aliases.
5. The focused command and `git diff --check` pass, and the manual checkpoint
   is recorded in the Task 1 report.

## References

- `CelanWorksmith_T-Foundation阶段检查点.md`
- `app/client/src/widgets/index.ts`
- `app/client/src/widgets/TableWidget/widget/index.tsx`
- `app/client/src/widgets/TableWidgetV2/widget/index.tsx`
- `app/client/src/widgets/JSONFormWidget/widget/index.tsx`
- `app/client/src/widgets/FilterListWidget/widget/index.tsx`
