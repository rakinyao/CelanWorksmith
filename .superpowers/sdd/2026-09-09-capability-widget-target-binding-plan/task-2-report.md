# Task 2 Report: Target Binding Builder Control

## Changed files

- `app/client/src/components/formControls/CapabilityTargetBindingControl.tsx`
- `app/client/src/components/formControls/CapabilityTargetBindingControl.test.tsx`
- `app/client/src/utils/formControl/formControlTypes.ts`
- `app/client/src/utils/formControl/FormControlRegistry.tsx`
- `app/client/src/entities/Action/actionProperties.ts`
- `app/client/src/i18n/resources/en-US.ts`
- `app/client/src/i18n/resources/zh-CN.ts`

The control exposes Widget and manual target modes, derives Table/Select/
MultiSelect expressions through the Task 1 adapter registry, preserves manual
expressions while clearing `widgetId`, and reports removed Widget provenance.
The new control is registered as `ONTOLOGY_CAPABILITY_TARGET` and included in
normal dynamic action fields. New control copy is requested through the
existing `i18n` service, with matching English and Chinese locale entries.

## TDD evidence

- RED: `cd app/client && yarn g:jest src/components/formControls/CapabilityTargetBindingControl.test.tsx`
  failed before implementation with `Cannot find module
  './CapabilityTargetBindingControl'`; 0 tests ran.
- GREEN: the same focused command passed after implementation: 1 test suite,
  4 tests passed.
- Final GREEN: `cd app/client && yarn g:jest
  src/components/formControls/CapabilityTargetBindingControl.test.tsx
  src/components/formControls/FunctionParametersControl.test.tsx` passed: 2
  test suites, 5 tests passed.
- `git diff --check` passed with no output.
- Review regression RED: the added tests failed with one unselected Widget
  binding and one stale Table binding after bound/provenance changes (4 passed,
  2 failed).
- Review regression GREEN: the focused control suite passed with 6 tests; the
  combined control and FunctionParametersControl suites passed with 2 suites,
  7 tests.
- Locale/resource GREEN: the control, FunctionParametersControl, and locale
  parity suites passed with 3 suites, 12 tests.

## Test output summary

Focused control and FunctionParametersControl suites pass. Targeted ESLint
passes with only existing inline-handler performance warnings and the
repository Browserslist age notice. The full client typecheck remains blocked
by unrelated pre-existing errors across the design-system/widget tree; the
filtered output contained no actionable registry/control type error after the
local dispatch typing fix.

## Commit

`feat(editor): select capability target widgets`

## Concerns

The control accepts optional `canonicalKey`, `tableCanonicalKey`, and
`tableCanonicalKeys` provenance forms so Task 3 editor metadata can select the
appropriate shape. Manual mode intentionally retains the current expression
and cardinality while omitting `widgetId`.

The control's i18n keys now have matching `en-US` and `zh-CN` resource entries.
