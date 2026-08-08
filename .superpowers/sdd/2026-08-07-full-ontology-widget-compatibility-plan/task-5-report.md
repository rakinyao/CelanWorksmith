# Task 5 Report

## Scope

Completed B2 / Task 5 only. Table and unrelated T-Foundation/T8 work were not
modified, staged, reset, checked out, or cleaned.

## Inherited Partial Work

- Added `dataMode: "OBJECT"` defaults and legacy `QUERY` normalization for
  FilterList, List/ListV2, Select, Dropdown, and MultiSelect.
- Added Object Type/Property property-pane controls and focused Widget tests.
- Added the untracked ObjectSet binding, collection/selection adapters, and
  ObjectSet mapping utilities.
- Extended `getObjectBindingModeProperty` for the Task 5 Widget types.

## Completion Changes

- Preserved ObjectSet rows and stable `displayPropertyId` / `valuePropertyId`
  mappings for selection widgets.
- Corrected ObjectSet state precedence: metadata loading/error is rendered
  before a missing metadata record is treated as `typeMismatch`.
- Rejects an ObjectSet whose `typeId` differs from the requested object type.
- Reused shared Object Type and Property option selectors in FilterList while
  retaining `{ typeId, conditions, version: 1 }` serialization and operator
  validation.
- Replaced explicit `any` in Task 5 tests to make scoped ESLint pass.

## Verification

```text
./node_modules/.bin/jest --config jest.config.js \
  src/widgets/FilterListWidget/widget/filterUtils.test.ts \
  src/widgets/FilterListWidget/widget/index.test.tsx \
  src/widgets/SelectWidget/widget/propertyUtils.test.ts \
  src/widgets/MultiSelectWidgetV2/widget/propertyUtils.test.ts \
  --runInBand --no-cache
PASS 4 suites, 55 tests

./node_modules/.bin/jest --config jest.config.js \
  src/celanworksmith/widgets/objectBinding/ObjectSetBinding.test.tsx \
  src/celanworksmith/widgets/objectBinding/objectSetUtils.test.ts \
  src/widgets/SelectWidget/widget/objectBinding.test.ts \
  src/widgets/DropdownWidget/widget/objectBinding.test.ts \
  src/widgets/MultiSelectWidgetV2/widget/objectBinding.test.ts \
  src/widgets/ListWidget/widget/objectBinding.test.ts \
  src/widgets/ListWidgetV2/widget/objectBinding.test.ts \
  --runInBand --no-cache
PASS all listed ObjectSet/Widget suites; List and ListV2 were also rerun
individually: PASS 2 suites, 2 tests.

./node_modules/.bin/prettier --check <Task 5 files>
All matched files use Prettier code style.

./node_modules/.bin/eslint <Task 5 files>
exit 0; 42 pre-existing non-blocking warnings (no errors). Browserslist also
reports its caniuse-lite dataset is 18 months old.

yarn check-types
exit 0 (no diagnostics)

git diff --check
exit 0
```

## Concerns

- The requested manual IDE gate (PurchaseOrder filter feeding Table and live
  Supplier selection) was not run: this workspace session has no configured
  live app/ontology fixture. Automated structured-filter and selection mapping
  coverage passes.
- FilterList `icon.svg` and `thumbnail.svg` contain unrelated trailing-newline
  changes in the dirty baseline; they are intentionally excluded from the Task
  5 commit.

## Fix Round 1

- ObjectSet rows now adapt to the native List and ListV2 `listData` contract,
  preserving template rendering, pagination, item click behavior, stable IDs,
  and runtime `currentItemsView` evaluation.
- FilterList only mounts the Object metadata publisher in `OBJECT` mode; QUERY
  mode leaves its legacy configuration untouched.
- Added actual Widget ObjectSet integration coverage for stable selection
  output and ready, empty, error, and type-mismatch states.
- Dropdown required validation and selection-change checks now recognize
  `false` and `0` as selected values.

### Fix Round Verification

```text
Focused ObjectSet collection/widget Jest suite: PASS
Prettier check: PASS
ESLint: exit 0 (existing warnings only)
yarn check-types: exit 0
git diff --check: exit 0
```
