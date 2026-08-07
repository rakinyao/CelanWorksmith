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

| Widget       | Type ID                                          | Query input                                                                   | Object input                                                                                   | Object Type / Property mapping                                                                  | Link / Action                                                                      | Refresh policy                                                                                                    | Legacy migration                                                                                                                      | Verification owner                                              |
| ------------ | ------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Table        | `TABLE_WIDGET`                                   | `tableData` array from Query/API binding                                      | Object Set from `objectTypeId`, optional `objectFilter` or FilterList output                   | Columns from Object Type metadata; `selectedPropertyIds` and column IDs are stable Property IDs | Row action may use `actionId`; links are not implicit                              | Shared Object Query key; preserve prior rows during refresh; refresh after successful Action                      | Missing `dataMode` -> `QUERY`; keep `tableData`, `selectedRow`, `selectedRows`, `objectFilter`                                        | Table object-binding tests; Task 4 manual gate                  |
| TableV2      | `TABLE_WIDGET_V2`                                | `tableData` array and native pagination/sorting                               | Same Object Set contract as Table                                                              | Metadata columns use stable Property IDs; display names are labels                              | Row action may use `actionId`; links use `linkTypeId` only when configured         | Same scoped query and prior-data retention as Table                                                               | Missing `dataMode` -> `QUERY`; preserve `tableData`, pagination, selection, `objectFilter`                                            | TableV2 render/content tests; Task 4 manual gate                |
| FilterList   | `FILTER_LIST_WIDGET`                             | No native data source; existing structured filter output is public meta state | Object Type metadata plus local filter conditions, output `{ typeId, conditions, version: 1 }` | `objectTypeId`, `propertyId` and operator are stable IDs/enum values                            | No Action; Link is not part of filter output                                       | Metadata refresh revalidates conditions without discarding valid local input                                      | No mode field exists: normalize as `QUERY` compatibility shell while preserving Object filter behavior; keep `objectTypeId`, `filter` | FilterList tests; Task 5 manual gate                            |
| ObjectDetail | `OBJECT_DETAIL_WIDGET`                           | `objectData` Object Instance expression, commonly selected Query row          | Object Instance from `objectPath` or `objectTypeId` + `objectIdPath`                           | Displayed and selected properties use stable Property IDs                                       | `linkTypeId` selects linked Object Set; linked instance actions may use `actionId` | Load first configured link eagerly; other links on demand; retain last object while metadata refreshes            | No mode field in current DSL: missing mode -> `QUERY`; preserve `objectData`, `displayMode`, `selectedLinkedObject`                   | ObjectDetail tests; Task 6 manual gate                          |
| JSONForm     | `JSON_FORM_WIDGET`                               | `sourceData` / Query result, `formMode: QUERY`                                | Object Instance plus Object Type schema, `formMode: OBJECT`, optional `objectActionId`         | Fields map stable Property IDs to `dataType`, `required`, `readOnly`, `derived`                 | Submit uses stable `actionId` (`objectActionId` public alias remains)              | Keep dirty local values during metadata/runtime refresh; refresh Object after successful submit                   | Missing `formMode` -> `QUERY`; preserve `sourceData`, `schema`, `objectData`, `objectActionId`                                        | ObjectFormMode tests; Task 6 manual gate                        |
| Form         | `FORM_WIDGET`                                    | Child widgets and native Form data/actions                                    | Object Instance schema propagated to child inputs; Object Action on submit                     | Child bindings use stable Property IDs; no display-name persistence                             | Submit may use stable `actionId`; links are child/widget concerns                  | Preserve child dirty state; refresh only after successful Object submit                                           | Missing mode -> `QUERY`; preserve child DSL and native Form submit properties                                                         | Form object-binding tests; Task 6 manual gate                   |
| List         | `LIST_WIDGET` / `LIST_WIDGET_V2`                 | `items`/`listData` expression and child template                              | Object Set from `objectTypeId` or `objectPath`; each item is an Object Instance                | Child bindings resolve stable Property IDs against current item Object Type                     | Child Action uses `actionId`; links use `linkTypeId`                               | Shared query key; preserve rendered previous page during refresh; paginate through Object Query                   | Missing mode -> `QUERY`; preserve `items`, template, pagination                                                                       | List/ListV2 focused tests; Task 5 manual gate                   |
| Select       | `SELECT_WIDGET`                                  | `options` plus `label`/`value` expressions                                    | Object Set plus `displayPropertyId` and `valuePropertyId`                                      | Both mappings are stable Property IDs; selected value is stable Object/Property value           | Optional option Action uses `actionId`; links unsupported                          | Metadata/data refresh keeps selected stable value if still valid, otherwise type mismatch                         | Missing mode -> `QUERY`; preserve `options`, `labelKey`, `valueKey`, `selectedOptionValue`                                            | Select property tests; Task 5 manual gate                       |
| Dropdown     | `DROPDOWN_WIDGET`                                | Native `options`/selected value binding                                       | Same selection contract as Select                                                              | `displayPropertyId` and `valuePropertyId` stable IDs                                            | Optional `actionId`; links unsupported                                             | Same selection retention and scoped refresh as Select                                                             | Missing mode -> `QUERY`; preserve native option and selected-value properties                                                         | Dropdown focused tests; Task 5 manual gate                      |
| MultiSelect  | `MULTI_SELECT_WIDGET` / `MULTI_SELECT_WIDGET_V2` | Native `options` and selected values array                                    | Object Set plus stable display/value Property IDs                                              | Mapping IDs stable; output is an array of stable values                                         | Optional `actionId`; links unsupported                                             | Preserve valid selected values through refresh; remove only values no longer present with explicit mismatch state | Missing mode -> `QUERY`; preserve `options`, selected values, and native mappings                                                     | MultiSelect property tests; Task 5 manual gate                  |
| ActionButton | `ACTION_BUTTON_WIDGET`                           | Native `onClick`/Action trigger                                               | Validated Object Instance target plus `actionId` and parameter bindings                        | Parameters may reference stable Property IDs; Object Type/Instance must match Action metadata   | Primary contract is `actionId`; Link unsupported                                   | No refresh on failure/cancel; on success use changed-object scoped refresh and retain prior data until coherent   | Missing mode -> `QUERY`; preserve native `onClick` and existing Action configuration                                                  | ActionButton tests and Execution Saga tests; Task 7 manual gate |
| Button       | `BUTTON_WIDGET`                                  | Native `onClick` action                                                       | Optional Object Instance target plus `actionId`                                                | Parameter Property references use stable IDs                                                    | `actionId` supported; links unsupported                                            | Same Action success/failure refresh contract                                                                      | Missing mode -> `QUERY`; preserve `onClick`, label and native action fields                                                           | Button focused tests; Task 7 regression                         |
| Chart        | `CHART_WIDGET`                                   | `chartData`/series expression                                                 | Object Property arrays or Object Set with stable label/value Property IDs                      | Label/value and series mappings are stable Property IDs; numeric type validated                 | Link/Action unsupported in data binding; child event actions remain native         | Shared query refresh; retain last valid series while loading; invalidate on type mismatch                         | Missing mode -> `QUERY`; preserve `chartData`, series config and native events                                                        | Chart helper tests; Task 8 manual gate                          |
| Statbox      | `STATBOX_WIDGET`                                 | Native value/title expressions                                                | Object Property or Aggregation Variable output                                                 | `displayPropertyId` or aggregation input uses stable IDs; numeric validation                    | Optional display Action may use `actionId`; no Link data binding                   | Retain last value while loading; empty is explicit, not blank fallback                                            | Missing mode -> `QUERY`; preserve native value/title expressions                                                                      | Statbox focused tests; Task 8 manual gate                       |
| Progress     | `PROGRESS_WIDGET`                                | Native numeric `value`/`max` expressions                                      | Numeric Object Property or Aggregation Variable plus optional stable max Property ID           | Value/max mappings are stable Property IDs and numeric-compatible                               | Action/Link unsupported in value binding                                           | Retain last valid value while loading; type mismatch is explicit                                                  | Missing mode -> `QUERY`; preserve `value`, `max`, and native bounds                                                                   | Progress focused tests; Task 8 manual gate                      |
| Text         | `TEXT_WIDGET`                                    | Native `text` expression/string                                               | Object Instance Property selected by stable `displayPropertyId`                                | Display Property ID and its display formatter are stable; display name is not binding           | Optional `linkTypeId` navigation or native Action, if configured                   | Re-evaluate on Object Query/DataTree changes; retain last display value during refresh                            | Missing mode -> `QUERY`; preserve `text`, formatting, and native events                                                               | Text object-property tests; Task 6 manual gate                  |
| Input        | `INPUT_WIDGET` / `INPUT_WIDGET_V2`               | Native `defaultText`/value and validation                                     | Writable Object Instance Property by stable `displayPropertyId`                                | Property `dataType`, `readOnly`, and `required` drive input/validation                          | Submit/change may use stable `actionId`; Link unsupported                          | Preserve user-entered value during metadata/runtime refresh; never overwrite dirty input                          | Missing mode -> `QUERY`; preserve `defaultText`, `value`, and validation props                                                        | Input property tests; Task 6 manual gate                        |

All rows above explicitly retain `QUERY`; no Object binding may silently consume
an arbitrary expression that is not recognized by the shared normalizer.

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

### Per-Widget Render Contract

The following cell lists the states the Widget must render itself. States not
listed are still normalized by the shared layer and must not be silently
converted to a normal value.

| Widget category               | Widget-rendered states                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Table, TableV2, List          | `loading`, `ready`, `empty`, `error`, `permissionDenied`, `typeMismatch`                                                                |
| FilterList                    | `loading`, `ready`, `empty`, `error`, `permissionDenied`, `typeMismatch`                                                                |
| ObjectDetail                  | `loading`, `ready`, `empty`, `error`, `permissionDenied`, `typeMismatch`                                                                |
| JSONForm, Form, Input         | `loading`, `ready`, `empty`, `error`, `permissionDenied`, `typeMismatch`                                                                |
| Select, Dropdown, MultiSelect | `loading`, `ready`, `empty`, `error`, `permissionDenied`, `typeMismatch`                                                                |
| ActionButton, Button          | `ready`, `error`, `permissionDenied`, `typeMismatch`; `loading` is the disabled/running action state; `empty` is a missing-target state |
| Chart, Statbox, Progress      | `loading`, `ready`, `empty`, `error`, `permissionDenied`, `typeMismatch`                                                                |
| Text                          | `loading`, `ready`, `empty`, `error`, `permissionDenied`, `typeMismatch`                                                                |

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
