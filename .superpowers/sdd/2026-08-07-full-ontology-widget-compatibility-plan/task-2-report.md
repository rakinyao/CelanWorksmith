# Task 2 Report: Shared Object Binding Contract

## Completed Work

- Added the shared `BindingMode`, `ObjectBinding`, metadata, source, and stable validation issue contracts.
- Added immutable Widget DSL normalization. Missing mode fields normalize to `QUERY`; explicit stable IDs take precedence over inferred IDs; FilterList structured filters and recognized DataTree paths can infer an Object Type.
- Added stable validation for missing/deleted Object Types and Properties, invalid sources, and Property data-type incompatibility. Validation returns issues without rewriting bindings.
- Added conservative DataTree inference for `$objects`, Object Query `.data`, and recognized Widget object-meta outputs. Unknown expressions return `undefined`.
- Integrated load-time legacy migration through `extractCurrentDSL`. Missing `dataMode`, `formMode`, or Object Detail `mode` is written as `QUERY` only for known ontology-capable Widget types. Existing values are retained.
- No Widget implementation, Property Control, API call, T9, Layer 2, or Layer 3 changes were made.

## Changed Files

- `app/client/src/celanworksmith/widgets/objectBinding/types.ts`
- `app/client/src/celanworksmith/widgets/objectBinding/normalizeObjectBinding.ts`
- `app/client/src/celanworksmith/widgets/objectBinding/objectBindingValidation.ts`
- `app/client/src/celanworksmith/widgets/objectBinding/objectBindingSelectors.ts`
- `app/client/src/celanworksmith/widgets/objectBinding/normalizeObjectBinding.test.ts`
- `app/client/src/celanworksmith/widgets/objectBinding/objectBindingValidation.test.ts`
- `app/client/src/celanworksmith/widgets/objectBinding/objectBindingSelectors.test.ts`
- `app/client/src/utils/WidgetPropsUtils.tsx`
- `app/client/src/utils/WidgetMigrationUtils.ts`
- `app/client/src/utils/WidgetMigrationUtils.test.ts`

## Verification

Command:

```bash
cd app/client
./node_modules/.bin/jest --config jest.config.js \
  src/celanworksmith/widgets/objectBinding/normalizeObjectBinding.test.ts \
  src/celanworksmith/widgets/objectBinding/objectBindingValidation.test.ts \
  src/celanworksmith/widgets/objectBinding/objectBindingSelectors.test.ts \
  --runInBand --no-cache
```

Output:

```text
PASS src/celanworksmith/widgets/objectBinding/objectBindingValidation.test.ts
PASS src/celanworksmith/widgets/objectBinding/normalizeObjectBinding.test.ts
PASS src/celanworksmith/widgets/objectBinding/objectBindingSelectors.test.ts

Test Suites: 3 passed, 3 total
Tests:       16 passed, 16 total
Snapshots:   0 total
Time:        1.465 s
```

Additional commands and output:

```text
./node_modules/.bin/jest --config jest.config.js src/utils/WidgetMigrationUtils.test.ts --runInBand --no-cache
PASS src/utils/WidgetMigrationUtils.test.ts
Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total

./node_modules/.bin/prettier --check <all Task 2 files>
All matched files use Prettier code style!

./node_modules/.bin/eslint <all Task 2 files>
exit 0; only the environment's stale caniuse-lite Browserslist notice was emitted.

yarn check-types
exit 0

git diff --check
exit 0
```

## Compatibility And Risks

- `QUERY` remains the normalization default for legacy loaded DSL. The migration preserves all existing user values and only adds a missing mode field on the page-load migration boundary.
- Stable IDs are never replaced with display names. Deleted IDs remain in the binding and are surfaced through stable issue codes for repair.
- Inference is intentionally conservative and only recognizes data shapes confirmed by the DataTree contract. Later Widget tasks must pass their expected Property data types when they require data-type validation.
- The working tree contains unrelated T-Foundation/T8 changes. This task stages and commits only the files listed above plus this report.
- The repository pre-commit hook could not create its lint-staged backup in the existing dirty worktree. The focused Jest, Prettier, ESLint, TypeScript, and diff checks above were run manually before the commit.

## Fix Round 1

- Removed the load-time legacy mode migration. `extractCurrentDSL` now leaves legacy DSL mode fields absent; `normalizeObjectBinding` continues to interpret missing modes as `QUERY` without mutating the caller's object.
- Tightened type inference to recognized, complete DataTree shapes only: `$objects.<typeId>.all` requires the CelanWorksmith Objects entity marker; Object Query results require their entity marker and full result shape; Widget selection output requires a Widget marker, recognized table type, and complete object instance shape.
- Tightened FilterList inference to the versioned structured-filter contract. A bare `{ typeId }` no longer becomes an inferred binding.
- Added regression tests covering non-mutating legacy load normalization, pseudo `$objects` subpaths, ordinary Query data with `typeId`, non-Widget `selectedObject`, and unstructured filters while retaining the positive inference cases.

### Fix Round 1 Verification

```text
./node_modules/.bin/jest --config jest.config.js \
  src/celanworksmith/widgets/objectBinding/normalizeObjectBinding.test.ts \
  src/celanworksmith/widgets/objectBinding/objectBindingValidation.test.ts \
  src/celanworksmith/widgets/objectBinding/objectBindingSelectors.test.ts \
  src/utils/WidgetMigrationUtils.test.ts \
  --runInBand --no-cache
PASS: 4 suites, 24 tests

./node_modules/.bin/prettier --check <Task 2 files>
PASS

./node_modules/.bin/eslint <Task 2 files>
exit 0; only the existing stale caniuse-lite Browserslist notice was emitted.

yarn check-types
exit 0

git diff --check
exit 0
```

## Fix Round 2

- Replaced partial legacy DSL assertions with exact equality checks. The regression fixture includes additional legacy Table fields and verifies that `extractCurrentDSL` does not mutate the complete input DSL, while the fully migrated legacy Table remains unchanged by normalization and has no `dataMode` written back.
- Cloned the loaded DSL before applying the shared `migrateDSL` pipeline so the page response DSL remains immutable at the loading boundary.
- Defined the recognized `$objects.<typeId>` contract used for inference: the `$objects` entity marker, an `all` array of records, and `_meta` with a supported load-status string and numeric `total`; optional `updatedAt` and `error` fields are type-checked when present.
- Added negative inference cases for empty or partial metadata, invalid metadata types/statuses, and non-record entries in `all`. Each now returns `undefined`; a complete empty object set remains a valid inference source.

### Fix Round 2 Verification

```text
./node_modules/.bin/jest --config jest.config.js \
  src/celanworksmith/widgets/objectBinding/normalizeObjectBinding.test.ts \
  src/celanworksmith/widgets/objectBinding/objectBindingValidation.test.ts \
  src/celanworksmith/widgets/objectBinding/objectBindingSelectors.test.ts \
  src/utils/WidgetMigrationUtils.test.ts \
  --runInBand --no-cache --coverage
PASS: 4 suites, 29 tests

./node_modules/.bin/prettier --check <Task 2 Fix Round 2 files>
PASS

./node_modules/.bin/eslint <Task 2 Fix Round 2 files>
exit 0; only the existing stale caniuse-lite Browserslist notice was emitted.

yarn check-types
exit 0

git diff --check
exit 0
```
