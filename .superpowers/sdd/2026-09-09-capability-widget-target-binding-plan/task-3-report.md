# Task 3 Report: Capability Target Serialization, Synchronization, And Editor Resources

## Implementation

- Extended capability target definitions to support canonical `SINGLE_OBJECT/objectId` and Function-only `OBJECT_SET/objectIds` targets. Builder metadata is converted from `{ mode, widgetId?, cardinality, expression }` before validation and serialization; `widgetId` never enters Advanced JSON.
- Preserved legacy raw `SINGLE_OBJECT/objectId` Builder values and Advanced JSON compatibility. Function many-target expressions serialize as `OBJECT_SET/objectIds`; literal JSON ID arrays are retained as arrays. Advanced hydration returns manual Builder metadata, including JSON array expressions for object sets.
- Rejected many-target Action Builder bindings instead of downcasting them. Capability/owner changes clear target metadata and parameters; mode changes preserve target values.
- Replaced the disabled target-source/Object-ID controls with `ONTOLOGY_CAPABILITY_TARGET`. Function uses a 1000-item upper bound and Action uses an effective one-target bound. Advanced placeholders use canonical target shapes.
- Added `primaryColumnId` as the existing Table Widget canonical-key fallback in the target control, after explicit provenance overrides, so ontology-generated Tables remain selectable without new Widget state.

## Verification

- RED: the new serializer/hydrator tests failed against the old single-target-only implementation (3 failures).
- `cd app/client && yarn g:jest src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts` -> 2 suites, 50 tests passed.
- `cd app/client && yarn g:jest src/PluginActionEditor/components/CapabilityTargetBinding/ontologyTargetWidgetAdapters.test.ts src/components/formControls/CapabilityTargetBindingControl.test.tsx src/components/formControls/FunctionParametersControl.test.tsx` -> 3 suites, 18 tests passed.
- `cd app/client && yarn g:jest src/components/formControls/CapabilityTargetBindingControl.test.tsx` after `primaryColumnId` correction -> 1 suite, 6 tests passed.
- Targeted ESLint completed with no errors; existing `Object.keys` and React performance warnings remain. `git diff --check` passed. Both editor JSON resources parse successfully.

## Commit

`5f3f3ad72e` - `feat(ontology): bind capability targets from widgets`

## Concerns

- Function editor resources use the provisional 1000-item upper bound because the current editor resource contract does not expose selected capability cardinality metadata; runtime validation remains authoritative.
- The commit includes the narrow `primaryColumnId` control fallback and its test because Table provenance is required for the new target picker to work with existing ontology-generated Tables.

## Review Fix Round 1

- Added a regression test with `canonicalKey`, `tableCanonicalKey`, and
  `tableCanonicalKeys` explicitly absent, proving a Table's `primaryColumnId`
  fallback produces the expected binding expression.
- `cd app/client && yarn g:jest src/components/formControls/CapabilityTargetBindingControl.test.tsx`
  -> 1 suite, 7 tests passed.
- Targeted ESLint completed with no errors (three existing React performance
  warnings).
- Follow-up commit: `test(ontology): cover primary column target fallback` (current HEAD).
