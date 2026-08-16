# H2 Native Widget Result Compatibility Verification

Date: 2026-08-15
Branch: `feat/ontology-datasource-plugin`

## Gate Decision

`PASSED` as a verification-only phase. No production Widget, evaluator,
Datasource, Redux, Saga, or refresh code was changed for H2.

Ontology Query results are consumed at the same native boundaries as DB/API
results:

- Table receives an array of row objects and forwards native columns, loading,
  empty-result, page, page-size, and total-count state to the existing table
  component.
- JSONForm continues to consume `formData` and `sourceData` through the
  existing Query form component.
- List continues to use array `listData` and native pagination decisions.
- Select and Dropdown continue to consume `{ label, value }` option arrays.

No `$objects`, `$functions`, `$actions`, `$variables`, Object Widget mode,
ontology-specific Widget adapter, or parallel execution path was restored.

## Focused Verification

```bash
cd app/client
yarn jest \
  src/widgets/TableWidget/widget/nativeQueryMode.test.ts \
  src/widgets/JSONFormWidget/widget/nativePath.test.ts \
  src/widgets/ListWidget/widget/index.test.tsx \
  src/widgets/SelectWidget/widget/nativePath.test.ts \
  src/widgets/DropdownWidget/widget/index.test.tsx \
  --runInBand --no-cache
```

Result: `PASS`, 5 suites and 11 tests.

The added coverage verifies Table rows/columns/loading/pagination, JSONForm
native values, List pagination input, and Select/Dropdown option input. The
existing authenticated Cypress scenario in the H0 record also verifies that
native Table binding does not execute a Query repeatedly and that one explicit
Run produces exactly one execution.

## Static Checks

```bash
cd app/client
yarn exec prettier --check \
  src/widgets/TableWidget/widget/nativeQueryMode.test.ts \
  src/widgets/JSONFormWidget/widget/index.test.tsx \
  src/widgets/ListWidget/widget/index.test.tsx \
  src/widgets/SelectWidget/widget/nativePath.test.ts \
  src/widgets/DropdownWidget/widget/index.test.tsx
yarn eslint \
  src/widgets/TableWidget/widget/nativeQueryMode.test.ts \
  src/widgets/JSONFormWidget/widget/index.test.tsx \
  src/widgets/ListWidget/widget/index.test.tsx \
  src/widgets/SelectWidget/widget/nativePath.test.ts \
  src/widgets/DropdownWidget/widget/index.test.tsx
git diff --check
```

Results: Prettier passed; ESLint exited successfully with one existing
`react-perf/jsx-no-new-object-as-prop` warning in the Dropdown test and the
repository's normal Browserslist data-age notice. `git diff --check` passed.

## Boundary Notes

Native evaluator errors are surfaced by Appsmith's existing debugger/error
path rather than a Widget-specific `error` prop. H2 therefore does not add an
error adapter. H3 owns explicit loading, empty, Provider failure, permission,
and last-valid-result state transitions on the native Query path.

## Files

- `app/client/src/widgets/TableWidget/widget/nativeQueryMode.test.ts`
- `app/client/src/widgets/JSONFormWidget/widget/index.test.tsx`
- `app/client/src/widgets/ListWidget/widget/index.test.tsx`
- `app/client/src/widgets/SelectWidget/widget/nativePath.test.ts`
- `app/client/src/widgets/DropdownWidget/widget/index.test.tsx`
- `.superpowers/sdd/2026-08-15-native-ontology-next-phase/h2-result-compatibility-brief.md`
