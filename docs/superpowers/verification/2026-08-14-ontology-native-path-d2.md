# D2 Native Widget Compatibility Verification

Date: 2026-08-14

## Result

D2 found no new production defect in the native Query Widget path after the
D0/D1 native Datasource changes. Table and JSONForm continue to consume the
ordinary evaluated Query values; no ontology-specific Widget state or
execution chain was added.

The existing Table regression had an invalid unit fixture that set
`filteredTableData` to `undefined` while expecting rows from `tableData`.
Appsmith's native Table renderer consumes the evaluated `filteredTableData`
derived property. The fixture now supplies that evaluated array and verifies
the real native rendering boundary.

## Verification

Focused native regressions:

```bash
cd app/client
yarn jest src/widgets/TableWidget/widget/nativeQueryMode.test.ts \
  src/widgets/JSONFormWidget/widget/nativePath.test.ts --runInBand
```

Result: PASS, 2 suites and 5 tests.

Full Table Widget family:

```bash
cd app/client
yarn jest src/widgets/TableWidget --runInBand
```

Result: PASS, 40 suites and 371 tests. Existing React DOM property warnings
remain in the TableV2 pagination component tests and are unrelated to this
native-path verification.

## Boundary Decision

- Native Table columns, search, sorting, pagination, loading, empty, and error
  behavior remain Appsmith-owned and are not duplicated for Ontology.
- Native JSONForm continues to consume Query-shaped data and retains its
  standard validation path.
- D2 does not claim browser-level visual verification; the native execution
  count and import flow are covered by the completed D0 checkpoint.
