# Task 3 Report: C1 显示名称与稳定 ID

Implemented C1 in three compatible slices:

- Added `getOntologyNamePresentation` in `app/client/src/celanworksmith/ontologyNames.ts`.
- Supports stable IDs, display names, localized/Chinese aliases, trimmed blank aliases, and duplicate display names across distinct IDs.
- Added focused unit tests in `app/client/src/celanworksmith/ontologyNames.test.ts`.
- Metadata selectors now use the helper for Object Type and Property labels/search text.
- Ontology Explorer and VariablesSection use localized presentation labels for Object Type, Property, Link, Function, and Action while keeping IDs for selection/events.

Validation:

- `yarn jest --runInBand --silent src/celanworksmith/ontologyNames.test.ts` passed: 3 tests.
- `yarn exec prettier --check src/celanworksmith/ontologyNames.ts src/celanworksmith/ontologyNames.test.ts` passed.
- `yarn eslint src/celanworksmith/ontologyNames.ts src/celanworksmith/ontologyNames.test.ts` passed.
- `git diff --check` passed for the slice files.

Implemented the second C1 slice:

- Integrated `getOntologyNamePresentation` into Object Type and Property option construction.
- Added localized/Chinese aliases to labels and search text while preserving stable option IDs and values.
- Deduplicated repeated IDs only, preserving distinct options with duplicate display names.
- Kept missing/deleted selected ID control behavior unchanged.
- No API, server, reducer, saga, or unrelated dirty files were changed.

Validation:

- `yarn jest src/celanworksmith/ontologyNames.test.ts src/selectors/celanworksmithObjectMetadataSelectors.test.ts --runInBand` passed: 8 tests.
- `yarn exec prettier --check src/celanworksmith/ontologyNames.ts src/selectors/celanworksmithObjectMetadataSelectors.ts src/selectors/celanworksmithObjectMetadataSelectors.test.ts` passed.
- `yarn eslint src/celanworksmith/ontologyNames.ts src/selectors/celanworksmithObjectMetadataSelectors.ts src/selectors/celanworksmithObjectMetadataSelectors.test.ts` passed.
- `git diff --check` passed for the slice files.

Integration validation:

- Explorer/Variables and control regression passed: 5 suites, 23 tests.
- Focused integration review Approved; 6 suites, 26 tests were observed.
- Targeted ESLint passed with existing warnings only; no errors.
- Helper and selector slices are committed as `54baf2ed7d` and `e55fa00056`. Explorer/Variables files already contain prior T0-T8/B0-B6 dirty changes, so their presentation edits remain in the shared worktree rather than being committed with unrelated history.
