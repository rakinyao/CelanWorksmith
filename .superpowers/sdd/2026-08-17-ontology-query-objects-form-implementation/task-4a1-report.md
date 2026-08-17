# Task 4A1 Report

## Status

Implemented the opt-in `resetOnDependencyChange` flag for form controls. Dropdowns now clear their configured value when the declared conditional dependency changes and the flag is enabled. Existing conditional multi-select resets remain unchanged.

## Tests

Ran from `app/client/`:

```text
yarn jest src/components/formControls/DropDownControl --runInBand
```

Result: 1 suite passed, 17 tests passed.

## Concerns

The focused suite still emits pre-existing React Select and `act(...)` warnings; no new test failures or warnings were introduced by this change.
