# Table V2 Native Query Usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Stabilize the active TableWidgetV2 native Query path so Ontology, DB, and API Query arrays render with stable columns, working search, and bounded pagination across Widget size changes.

**Architecture:** Keep the existing Appsmith Query generation and DataTree contracts. Harden only V2 Table derived calculations, schema synchronization, and existing event handlers. Do not add an Ontology adapter, Object mode, parallel Redux state, or a second execution path.

**Tech Stack:** React/TypeScript, existing JavaScript derived properties, Jest/Testing Library, Appsmith Widget Query generators, single-worker Playwright/Cypress smoke checks.

## Global Constraints

- Ontology remains a first-class Datasource beside DB and API Datasources.
- Table behavior uses the existing Query, DataTree, Widget, and event paths.
- No $objects, $functions, $actions, $variables, Object Widget mode, ontology-specific reducer, refresh coordinator, or second execution path is introduced.
- Existing DB/API Query behavior remains unchanged.
- New visible copy is English and uses existing i18n conventions.
- Widget size changes affect derived pagination state only; they do not create a new request mechanism.
- Focused tests run serially or with one worker where browser tooling is involved.
- Unless a command is explicitly a Git command, run listed Jest commands from app/client.

---

### Task 1: Make Derived Pagination Finite

**Files:**
- Modify: app/client/src/widgets/TableWidgetV2/widget/derived.js, getPageSize
- Create: app/client/src/widgets/TableWidgetV2/widget/__tests__/derived.test/getPageSize.test.js
- Test: app/client/src/widgets/TableWidgetV2/widget/__tests__/derived.test/getPageOffset.test.js

**Interfaces:**
- Consumes: componentHeight, compactMode, and tableData from derived-property input.
- Produces: getPageSize(props, moment, _) returning a finite integer >= 1, with getPageOffset remaining finite.

- [ ] **Step 1: Add failing page-size tests**

Create the focused test file with these cases:

```
it("returns at least one row for a short widget", () => {
  expect(getPageSize({ componentHeight: 0, compactMode: "DEFAULT", tableData: [] }, moment, _)).toBe(1);
});

it("returns a finite integer for missing dimensions", () => {
  expect(getPageSize({ componentHeight: undefined, compactMode: "DEFAULT", tableData: [] }, moment, _)).toBe(1);
});

it("uses the current compact mode and height", () => {
  expect(getPageSize({ componentHeight: 600, compactMode: "DEFAULT", tableData: Array(20) }, moment, _)).toBeGreaterThan(1);
});
```

Import getPageSize from the derived-property module in the same style as existing derived tests. Do not render a browser.

- [ ] **Step 2: Run the focused test and verify failure**

Run from app/client:

```
ELECTRON_RUN_AS_NODE= yarn jest src/widgets/TableWidgetV2/widget/__tests__/derived.test/getPageSize.test.js --runInBand --no-cache
```

Expected before implementation: at least one short or missing-dimension assertion fails because the current calculation can return 0, NaN, or Infinity.

- [ ] **Step 3: Implement the finite page-size guard**

Update getPageSize so it resolves an unknown compact mode to DEFAULT, treats non-finite or non-positive componentHeight as the minimum page size, preserves the existing height calculation and fractional-row rule for valid dimensions, and returns Math.max(1, Number.isFinite(pageSize) ? Math.floor(pageSize) : 1). Do not change compact-mode row-height constants or add a second page-size source.

- [ ] **Step 4: Add offset regression coverage and run tests**

Extend getPageOffset.test.js with a zero or non-finite page-size case expecting 0, then run:

```
ELECTRON_RUN_AS_NODE= yarn jest src/widgets/TableWidgetV2/widget/__tests__/derived.test/getPageSize.test.js src/widgets/TableWidgetV2/widget/__tests__/derived.test/getPageOffset.test.js --runInBand --no-cache
```

Expected: all focused tests pass and no NaN value is produced.

- [ ] **Step 5: Commit the task**

```
git add app/client/src/widgets/TableWidgetV2/widget/derived.js app/client/src/widgets/TableWidgetV2/widget/__tests__/derived.test/getPageSize.test.js app/client/src/widgets/TableWidgetV2/widget/__tests__/derived.test/getPageOffset.test.js
git commit -m "fix(table): keep derived pagination finite"
```

### Task 2: Make Runtime Column Synchronization Idempotent

**Files:**
- Modify: app/client/src/widgets/TableWidgetV2/widget/index.tsx, createTablePrimaryColumns and updateColumnProperties only if required
- Modify: app/client/src/widgets/TableWidgetV2/widget/utilities.ts, getAllTableColumnKeys only if required
- Test: app/client/src/widgets/TableWidgetV2/widget/__tests__/utilities.test.ts
- Test: app/client/src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts

**Interfaces:**
- Consumes: native tableData array, existing primaryColumns, columnOrder, and derived columns.
- Produces: stable primary-column updates that add new runtime keys, preserve existing configuration, retain derived columns, and do nothing for empty or equivalent schemas.

- [ ] **Step 1: Add failing schema tests**

Add pure tests for getAllTableColumnKeys:

```
expect(getAllTableColumnKeys([{ id: "PO001", delayDays: 4 }, { id: "PO002", supplier: "S001" }])).toEqual(["id", "delayDays", "supplier"]);
expect(getAllTableColumnKeys([])).toEqual([]);
expect(getAllTableColumnKeys(undefined)).toEqual([]);
```

Add a TableWidgetV2 regression test using the existing fixture with two rows. Verify the first update includes primaryColumns.id and primaryColumns.delayDays. Send a second update with only changed values and verify no equivalent schema update is dispatched. Use the existing pushBatchMetaUpdates mock; do not add Redux or browser state.

- [ ] **Step 2: Run the focused schema tests and verify failure**

```
ELECTRON_RUN_AS_NODE= yarn jest src/widgets/TableWidgetV2/widget/__tests__/utilities.test.ts src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts --runInBand --no-cache
```

Expected before implementation: the new lifecycle assertion fails or exposes repeated schema updates.

- [ ] **Step 3: Implement the smallest idempotent synchronization change**

Preserve getDefaultColumnProperties, getColumnType, sanitized IDs, column order, and derived-column behavior. Change only the comparison or dispatch boundary needed so non-empty arrays add missing keys, existing columns are reused by originalId, empty/non-array/loading/error values do not cause destructive updates, equivalent key sets do not dispatch again, and removed runtime keys follow current non-infinite-scroll behavior without deleting derived columns. Do not alter persisted Table properties or the Query binding contract.

- [ ] **Step 4: Run focused and adjacent Table tests**

```
ELECTRON_RUN_AS_NODE= yarn jest src/widgets/TableWidgetV2/widget/__tests__/utilities.test.ts src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts src/widgets/TableWidgetV2/widget/__tests__/propertyUtils.test.ts --runInBand --no-cache
```

Expected: all selected suites pass with no repeated schema update assertion.

- [ ] **Step 5: Commit the task**

```
git add app/client/src/widgets/TableWidgetV2/widget/index.tsx app/client/src/widgets/TableWidgetV2/widget/utilities.ts app/client/src/widgets/TableWidgetV2/widget/__tests__/utilities.test.ts app/client/src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts
git commit -m "fix(table): stabilize runtime column synchronization"
```

### Task 3: Bound Table Search, Page Count, and Size Changes

**Files:**
- Modify: app/client/src/widgets/TableWidgetV2/widget/index.tsx, componentDidUpdate, pushResetPageNoUpdates, and existing search/page handlers only if required
- Modify: app/client/src/widgets/TableWidgetV2/component/Table.tsx, page-count/current-page guards only if required
- Modify: app/client/src/widgets/TableWidgetV2/component/header/actions/index.tsx, display guard only if required
- Create: app/client/src/widgets/TableWidgetV2/widget/__tests__/nativeQueryMode.test.ts
- Test: app/client/src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts
- Test: app/client/src/widgets/TableWidgetV2/component/header/actions/Actions.test.tsx

**Interfaces:**
- Consumes: getQueryGenerationConfig, getPropertyUpdatesForQueryBinding, searchText, pageNo, pageSize, totalRecordsCount, componentHeight, onSearchTextChanged, and onPageChange.
- Produces: one native search path per binding, finite client/server page counts, and bounded page state after data, total-count, page-size, or height changes.

- [ ] **Step 1: Add failing native Query binding tests**

Create nativeQueryMode.test.ts and assert:

```
expect(config.select.limit).toBe("Table1.pageSize");
expect(config.select.offset).toBe("Table1.pageOffset");
expect(config.select.where).toBe("Table1.searchText");
```

Also assert the server-side form sets serverSidePaginationEnabled to true, sets enableClientSideSearch to false when searchableColumn is supplied, and maps queryConfig.total_record.data to totalRecordsCount. Use TableWidgetV2.getQueryGenerationConfig() and getPropertyUpdatesForQueryBinding() directly; do not test the retired TableWidget implementation.

- [ ] **Step 2: Add failing component state tests**

Add focused tests proving page count is 1 for empty or zero-total data, page count is finite when pageSize is 0/undefined/NaN at the component boundary, server-side page count uses a valid total, search sends pageNo = 1 and invokes only the configured native search callback, and a page-size/height update clamps a previously high page number to the new maximum. Use existing TableWidgetV2 and Actions fixtures and mocks. Do not start the development server.

- [ ] **Step 3: Run the focused tests and verify failure**

```
ELECTRON_RUN_AS_NODE= yarn jest src/widgets/TableWidgetV2/widget/__tests__/nativeQueryMode.test.ts src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts src/widgets/TableWidgetV2/component/header/actions/Actions.test.tsx --runInBand --no-cache
```

Expected before implementation: at least one new page-count or clamp assertion fails.

- [ ] **Step 4: Implement bounded native state**

Implement only the smallest changes required to normalize the component boundary to a finite page size of at least 1, calculate a minimum page count of 1 for empty data, treat valid zero totals as empty server-side results instead of falling back to row length, clamp page index/page number when total count/page size/pagination mode/componentHeight changes, retain search reset-to-first-page behavior, trigger callbacks only when their bindings exist, and preserve the existing 1-based Widget metadata to 0-based React Table conversion. Do not add an unconditional run effect, refresh coordinator, or Ontology-specific branch.

- [ ] **Step 5: Run focused, native, and existing Table tests**

```
ELECTRON_RUN_AS_NODE= yarn jest src/widgets/TableWidgetV2/widget/__tests__/nativeQueryMode.test.ts src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts src/widgets/TableWidgetV2/component/header/actions/Actions.test.tsx src/widgets/TableWidgetV2/component/TableContext.test.tsx --runInBand --no-cache
```

Expected: all selected suites pass, including existing search and pagination behavior.

- [ ] **Step 6: Commit the task**

```
git add app/client/src/widgets/TableWidgetV2/widget/index.tsx app/client/src/widgets/TableWidgetV2/component/Table.tsx app/client/src/widgets/TableWidgetV2/component/header/actions/index.tsx app/client/src/widgets/TableWidgetV2/widget/__tests__/nativeQueryMode.test.ts app/client/src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts app/client/src/widgets/TableWidgetV2/component/header/actions/Actions.test.tsx
git commit -m "fix(table): bound native search and pagination state"
```

### Task 4: Verify Native Ontology Table Behavior

**Files:**
- Create: docs/superpowers/verification/2026-08-16-table-v2-native-query-usability.md
- Review: app/client/src/widgets/TableWidgetV2/
- Review: docs/superpowers/specs/2026-08-16-table-v2-native-query-usability-design.md

**Interfaces:**
- Consumes: completed Tasks 1-3, existing development server, Demo Ontology Datasource, and low-memory browser test harness.
- Produces: reproducible verification record and clean focused test result without changing application architecture.

- [ ] **Step 1: Run the complete focused V2 unit set serially**

Run from app/client:

```
ELECTRON_RUN_AS_NODE= yarn jest src/widgets/TableWidgetV2/widget --runInBand --no-cache
```

Record exact suite and test counts. Do not run full client tsc, full ESLint, or a production build because the baseline records those commands as OOM-prone on this machine.

- [ ] **Step 2: Run the existing native browser smoke test with one worker**

Use the existing D0/T9 smoke configuration and run only the Table scenario with one worker. Keep ELECTRON_RUN_AS_NODE unset for Cypress/Electron and use the existing Xvfb setup if needed. Record whether the scenario verifies Demo Ontology Query binding, generated columns, client/server search, next/previous pagination, Widget height change with a valid page indicator, and request count without duplicate Query execution.

- [ ] **Step 3: Review the diff against design constraints**

Run:

```
git diff c5c9a7dc67..HEAD --check
git diff c5c9a7dc67..HEAD --stat
git status --short
```

Confirm no retired $objects/Object-mode execution path, no new datasource adapter, no non-English UI copy, and no unrelated Widget changes.

- [ ] **Step 4: Write the verification record**

Document commands, counts, browser constraints, residual defects, and exact manual checks still required. Distinguish verified behavior from unverified full-build checks.

- [ ] **Step 5: Commit the verification record**

```
git add docs/superpowers/verification/2026-08-16-table-v2-native-query-usability.md
git commit -m "docs: record native table query verification"
```

## Completion Gate

The work is ready for the next planning stage only when Tasks 1-4 have focused test evidence, the verification record states residual limits, and git diff --check is clean. A full client build remains a separately reported machine-capacity limitation unless it can run without risking OOM.
