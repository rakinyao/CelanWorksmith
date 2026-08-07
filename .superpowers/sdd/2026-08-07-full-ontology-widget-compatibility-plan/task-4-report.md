# Task 4 / B1 Report: Table and TableV2 Reference Widget

## Scope

- New Table and TableV2 defaults use `dataMode: "OBJECT"`.
- Render mode is resolved through `normalizeObjectBinding`, so a legacy DSL with no mode remains `QUERY` and preserves native Table behavior.
- Both property panes use `CELANWORKSMITH_OBJECT_TYPE` with the stable-ID label `Ontology Object / 本体对象` and collection help text.
- ObjectTableMode normalizes Object Type and structured FilterList filters before dispatching the shared Object Query action. It retains selection unless the query key changes and renders distinct missing-selection, metadata, loading, empty, and runtime-error states.

## Automated Verification

### Reference suite

Command:

```bash
cd app/client
./node_modules/.bin/jest --config jest.config.js \
  src/widgets/TableWidget/component/ObjectTableMode.test.tsx \
  src/widgets/TableWidget/widget/objectBinding.test.ts \
  src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts \
  src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts \
  --runInBand --no-cache
```

Exit code: `0`

Observed output:

```text
PASS src/widgets/TableWidget/component/ObjectTableMode.test.tsx (11.209 s)
PASS src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts (15.63 s)
PASS src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts
```

The terminal wrapper omitted the fourth suite summary from the aggregate stream. It was rerun independently with the following complete result:

```text
PASS src/widgets/TableWidget/widget/objectBinding.test.ts (26.383 s)
Tests: 5 passed, 5 total
Test Suites: 1 passed, 1 total
```

### Formatting and lint

```text
Prettier: exit 0
All matched files use Prettier code style!

ESLint: exit 0
47 warnings, 0 errors
```

The ESLint warnings are existing Table `Object.keys`/React performance rules plus three test JSX object-literal warnings. No lint error was introduced.

### Type check

```text
Command: yarn check-types
Exit code: 1
Elapsed: 0:46.32
```

The full client type check has a dirty-baseline failure outside this task. Its output contains existing `packages/design-system/ads-old` JSX intrinsic-element and children-prop errors, WDS component prop errors, and T8 `DataTree`/`UnEvalTree` incompatibilities. The emitted error stream is over 500,000 tokens and does not identify a Table/TableV2 task file as a failure source.

### Diff check

```text
git diff --check: exit 0
```

## Manual Gate

Not executed. This environment has no authenticated running application plus ontology backend/browser session for creating a Table, selecting `Purchase Order`, then switching to Query mode. The automated coverage verifies the same default, selector, structured-filter, Object query, selection retention, and native Query routing contracts.

## Concerns

- Full `yarn check-types` remains blocked by unrelated pre-existing design-system and T8 errors.
- Browser manual gate remains required in an authenticated app session before release.
- The checkout includes extensive T-Foundation/T8 dirty baseline changes; this task did not modify unrelated Widgets or baseline files.
