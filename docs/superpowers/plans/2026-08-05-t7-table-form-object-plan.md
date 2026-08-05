# T7 Table/Form Object Mode Implementation Plan

## Goal

Add Object Type modes to the existing Table and JSON Form workflows while
keeping Query mode behavior and saved applications compatible.

## Shared Data Layer

- Add a widget-scoped object query state keyed by `widgetId`, `typeId`, and a
  normalized query signature.
- Query only through `CelanworksmithAPI.queryObjects` and Redux/Saga. The
  Widget render code dispatches intents and consumes selectors; it never calls
  the API or builds URLs.
- Whitelist `propertyId` sort fields and FilterList operators. Enforce offset,
  limit, and type IDs before the API call. Preserve the last successful page
  while a refresh is loading and expose error state.

## Task 0: Shared Query Layer

Implement and test the widget-scoped query state, actions, reducer, selectors,
and Saga before the Table mode consumes it. Keep the existing full-object
metadata loading flow unchanged.

## Task 1: Table Object Mode

- Add `dataMode: QUERY | OBJECT` and `objectTypeId` configuration to the
  existing Table Widget; QUERY remains the default and its existing properties
  and derived behavior remain unchanged.
- In OBJECT mode, derive columns from Object Type metadata using stable
  property IDs and display names. Fetch page data through the shared query
  Saga with server pagination, sort, and structured filter input.
- Expose `selectedObject` and `selectedObjects` as standard meta properties;
  preserve `selectedRow` for Query mode. Row selection must use object identity.
- Add focused tests for mode isolation, metadata column generation, query
  arguments, pagination/sort/filter, selection output, errors, and DSL defaults.

## Task 2: Form Object Mode

- Add `formMode: QUERY | OBJECT` and `objectTypeId` configuration to the
  existing JSON Form or Form workflow without changing Query mode.
- Map STRING, INTEGER, DECIMAL, DATETIME, and BOOLEAN properties to existing
  field controls; map `required` and `readOnly` to validation/disabled state.
- Keep editable values local while metadata/data refreshes. Validate locally,
  then map the submitted object and changed properties to a selected existing
  Action through the T5 action execution chain.
- Add focused tests for field generation, required/readOnly, type conversion,
  invalid submission, Action payload, success refresh, failure preservation,
  registration/defaults, and DSL compatibility.

## Verification

Each Task is committed and verified independently. Run focused Jest suites,
Prettier, ESLint, `git diff --check`, then existing Table/JSON Form regression
tests. Record manual/API verification and known limitations in separate
T7 verification documents.
