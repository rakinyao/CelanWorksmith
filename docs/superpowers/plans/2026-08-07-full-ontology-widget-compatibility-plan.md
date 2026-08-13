# Full Ontology-aware Widget Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make ontology data a first-class Widget input while preserving native Query behavior and making Object configuration selectable, discoverable, and incrementally verifiable.

**Architecture:** Add a shared Object Binding/Metadata Adapter above the existing CelanWorksmith API, Redux/Saga, Object Query Layer, Execution Layer, and DataTree. Widget-specific code keeps its public DSL properties but delegates normalization, metadata validation, type inference, and shared Property Pane controls to the adapter. New ontology-capable Widgets default to Object mode; legacy DSL without an explicit mode normalizes to Query mode.

**Tech Stack:** React, TypeScript, Appsmith Property Control Registry, Redux, Redux-Saga, DataTree, Jest, React Testing Library, existing Widget DSL migration utilities, Spring WebFlux APIs already implemented in T-Foundation.

## Global Constraints

- Preserve `QUERY` mode and all existing native Query/Table/Form behavior.
- New Widgets or newly created ontology-capable Widget instances default to `OBJECT`; old DSL without a mode field is normalized to `QUERY`.
- Store stable Object Type, Property, Link, and Action IDs; display names are presentation only.
- Widget components do not call Celanworksmith APIs directly; use the existing Object Query Layer, Execution Saga, and DataTree.
- Do not introduce T9 publish snapshots, runtime version checks, or Layer 2/3 production adapters.
- Do not pass MongoDB collection names from the browser.
- Preserve user-entered Widget values when metadata or runtime data refreshes.
- Every task ends with focused automated tests, formatting checks, and a documented manual verification checkpoint.

---

### Task 1: Freeze the Compatibility Matrix

**Files:**
- Create: `docs/superpowers/specs/2026-08-07-widget-compatibility-matrix.md`
- Reference: `CelanWorksmith_T-Foundation阶段检查点.md`
- Reference: `app/client/src/widgets/index.ts`
- Reference: `app/client/src/widgets/TableWidget/widget/index.tsx`
- Reference: `app/client/src/widgets/TableWidgetV2/widget/index.tsx`
- Reference: `app/client/src/widgets/JSONFormWidget/widget/index.tsx`
- Reference: `app/client/src/widgets/FilterListWidget/widget/index.tsx`

**Interfaces:**
- Produces the per-Widget contract that later tasks must implement: Query behavior, Object default, input shape, Object Type selection, Property mapping, Link/Action support, refresh policy, error states, and DSL migration rule.

- [ ] **Step 1: Record the initial Widget inventory**

Record at least Table, TableV2, FilterList, ObjectDetail, JSONForm, Form, List, Select, Dropdown, MultiSelect, ActionButton, Button, Chart, Statbox, Progress, Text, and Input. For each entry record its current Query input and the planned Object input.

- [ ] **Step 2: Define compatibility states**

Use the exact states `loading`, `ready`, `empty`, `error`, `permissionDenied`, and `typeMismatch`. Record which states are rendered by the shared layer and which are rendered by each Widget.

- [ ] **Step 3: Define migration rules**

For each existing Widget with no mode field, record `QUERY` as the normalized mode. For a newly created ontology-capable Widget, record `OBJECT` as the default. Record the public property names that remain backward compatible.

- [ ] **Step 4: Review matrix completeness**

Run:

```bash
rg -n "Table|FilterList|ObjectDetail|JSONForm|Select|Dropdown|Chart|Statbox|Progress|Text|Input" docs/superpowers/specs/2026-08-07-widget-compatibility-matrix.md
git diff --check
```

Expected: all target categories have an explicit mode, input shape, migration rule, and verification owner.

---

### Task 2: Implement the Shared Object Binding Contract

**Files:**
- Create: `app/client/src/celanworksmith/widgets/objectBinding/types.ts`
- Create: `app/client/src/celanworksmith/widgets/objectBinding/normalizeObjectBinding.ts`
- Create: `app/client/src/celanworksmith/widgets/objectBinding/objectBindingValidation.ts`
- Create: `app/client/src/celanworksmith/widgets/objectBinding/objectBindingSelectors.ts`
- Test: `app/client/src/celanworksmith/widgets/objectBinding/normalizeObjectBinding.test.ts`
- Test: `app/client/src/celanworksmith/widgets/objectBinding/objectBindingValidation.test.ts`
- Test: `app/client/src/celanworksmith/widgets/objectBinding/objectBindingSelectors.test.ts`
- Modify: `app/client/src/utils/WidgetPropsUtils.tsx`
- Modify: `app/client/src/utils/WidgetMigrationUtils.ts`

**Interfaces:**
- `BindingMode = "OBJECT" | "QUERY"`.
- `ObjectBinding` contains `objectTypeId`, `source`, `objectPath`, `objectIdPath`, `filter`, `selectedPropertyIds`, `displayPropertyId`, `valuePropertyId`, `linkTypeId`, and `actionId` as optional stable-ID fields.
- `normalizeObjectBinding(widgetType, widgetProps, metadata)` returns `{ mode, binding, issues }` without mutating the input DSL.
- `validateObjectBinding(binding, metadata)` returns stable issue codes for missing type, missing property, deleted ID, invalid source, and incompatible type.
- `inferObjectTypeId(expression, dataTree)` returns an ID only for recognized `$objects`, Object Query, or Widget meta output shapes; otherwise it returns `undefined`.

- [ ] **Step 1: Write failing normalization tests**

Cover:

```text
missing dataMode -> QUERY
dataMode OBJECT + objectTypeId -> OBJECT
explicit objectTypeId wins over inferred type
recognized FilterList.filter infers its type
unknown expression does not guess a type
```

- [ ] **Step 2: Write failing validation tests**

Cover missing Object Type, deleted Object Type, deleted Property, incompatible Property data type, and a valid `PurchaseOrder.delayDays` binding.

- [ ] **Step 3: Implement immutable normalization and validation**

Keep Widget-specific public properties intact. The normalizer only creates an internal view and migration defaults; it does not rewrite user values during render.

- [ ] **Step 4: Integrate legacy DSL normalization**

Use the existing `WidgetPropsUtils`/`WidgetMigrationUtils` path so a loaded Widget without `dataMode`/`formMode` is interpreted as Query. New defaults are applied only when the Widget is created.

- [ ] **Step 5: Run focused tests**

Run:

```bash
cd app/client
./node_modules/.bin/jest --config jest.config.js \
  src/celanworksmith/widgets/objectBinding/normalizeObjectBinding.test.ts \
  src/celanworksmith/widgets/objectBinding/objectBindingValidation.test.ts \
  src/celanworksmith/widgets/objectBinding/objectBindingSelectors.test.ts \
  --runInBand --no-cache
```

Expected: all new tests pass and no existing DSL migration test regresses.

---

### Task 3: Add Shared Ontology Metadata Selectors and Property Controls

**Files:**
- Create: `app/client/src/selectors/celanworksmithObjectMetadataSelectors.ts`
- Test: `app/client/src/selectors/celanworksmithObjectMetadataSelectors.test.ts`
- Create: `app/client/src/components/propertyControls/CelanworksmithObjectTypeControl.tsx`
- Create: `app/client/src/components/propertyControls/CelanworksmithObjectPropertyControl.tsx`
- Test: `app/client/src/components/propertyControls/CelanworksmithObjectTypeControl.test.tsx`
- Test: `app/client/src/components/propertyControls/CelanworksmithObjectPropertyControl.test.tsx`
- Modify: `app/client/src/components/propertyControls/index.ts`
- Modify: `app/client/src/utils/PropertyControlRegistry.tsx` only if the existing registry requires explicit registration for the new control types.

**Interfaces:**
- `getCelanworksmithObjectTypeOptions(state)` returns sorted options containing `{ value: id, label: displayName, description, searchText }`.
- `getCelanworksmithPropertyOptions(state, objectTypeId)` returns `{ value: id, label: displayName, dataType, readOnly, derived }`.
- `CelanworksmithObjectTypeControl` writes a stable `objectTypeId` and presents `displayName (id)`.
- `CelanworksmithObjectPropertyControl` writes a stable Property ID and only presents Properties belonging to the selected Object Type.

- [ ] **Step 1: Add selector tests**

Test ready metadata, loading metadata, empty metadata, duplicate IDs, display-name sorting, and a missing Object Type.

- [ ] **Step 2: Add control tests**

Test selection, search by ID/displayName, disabled state while metadata loads, empty state text, error/retry state, and preservation of an invalid existing stable ID.

- [ ] **Step 3: Implement selectors from current Redux state**

Read Object Type metadata from `getCelanworksmithObjectsState` and current App Binding state. Do not create a second API cache.

- [ ] **Step 4: Register the controls**

Register the controls through the existing `PropertyControls` map and use control types `CELANWORKSMITH_OBJECT_TYPE` and `CELANWORKSMITH_OBJECT_PROPERTY` in Widget property configurations.

- [ ] **Step 5: Run focused control tests and formatting**

Run:

```bash
cd app/client
./node_modules/.bin/jest --config jest.config.js \
  src/selectors/celanworksmithObjectMetadataSelectors.test.ts \
  src/components/propertyControls/CelanworksmithObjectTypeControl.test.tsx \
  src/components/propertyControls/CelanworksmithObjectPropertyControl.test.tsx \
  --runInBand --no-cache
./node_modules/.bin/prettier --check \
  src/selectors/celanworksmithObjectMetadataSelectors.ts \
  src/components/propertyControls/CelanworksmithObjectTypeControl.tsx \
  src/components/propertyControls/CelanworksmithObjectPropertyControl.tsx
```

---

### Task 4: Upgrade Table and TableV2 as the Reference Widget

**Files:**
- Modify: `app/client/src/widgets/TableWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/TableWidget/widget/propertyConfig/contentConfig.ts`
- Modify: `app/client/src/widgets/TableWidget/component/ObjectTableMode.tsx`
- Modify: `app/client/src/widgets/TableWidget/component/ObjectTableMode.test.tsx`
- Modify: `app/client/src/widgets/TableWidgetV2/widget/index.tsx`
- Modify: `app/client/src/widgets/TableWidgetV2/widget/propertyConfig/contentConfig.ts`
- Modify: `app/client/src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts`
- Modify: `app/client/src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts`
- Test: `app/client/src/widgets/TableWidget/widget/objectBinding.test.ts`

**Interfaces:**
- New Table/TableV2 instances default to `dataMode: "OBJECT"` when created by the Widget factory.
- Legacy Table/TableV2 DSL without `dataMode` is normalized to `QUERY` before rendering.
- `objectTypeId` uses `CELANWORKSMITH_OBJECT_TYPE` and displays `Ontology Object / 本体对象`, not a generic `Object type` text input.
- `objectFilter` continues to accept structured Object Query filters and FilterList output.
- Query mode continues to use `tableData`, generated columns, pagination, and native Query behavior unchanged.

- [ ] **Step 1: Add failing default and migration tests**

Assert new Widget defaults are Object, old DSL without `dataMode` normalizes to Query, explicit Query remains Query, and switching modes does not delete the inactive mode's user value.

- [ ] **Step 2: Replace manual Object Type input**

Change both Table property configurations to the shared Object Type control and add helper text explaining that the selection identifies which ontology object collection supplies rows.

- [ ] **Step 3: Normalize the Object Table path**

Use the shared binding normalizer before constructing `createObjectTableQueryRequest`. Preserve current pagination, sorting, selection meta properties, and FilterList structured filters.

- [ ] **Step 4: Add error and empty states**

Distinguish missing selection, metadata mismatch, loading, empty result, and runtime failure. Do not clear `selectedObject`, `selectedObjects`, or user configuration on metadata refresh unless the query key explicitly changes.

- [ ] **Step 5: Run the reference Widget suite**

Run:

```bash
cd app/client
./node_modules/.bin/jest --config jest.config.js \
  src/widgets/TableWidget/component/ObjectTableMode.test.tsx \
  src/widgets/TableWidget/widget/objectBinding.test.ts \
  src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts \
  src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts \
  --runInBand --no-cache
```

Manual gate: create a new Table, choose `Purchase Order` from the selector, confirm rows load, switch to Query mode, and confirm a native Query table still works.

---

### Task 5: Upgrade Collection and Selection Widgets

**Files:**
- Modify: `app/client/src/widgets/FilterListWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/FilterListWidget/widget/filterUtils.ts`
- Modify: `app/client/src/widgets/FilterListWidget/widget/index.test.tsx`
- Modify: `app/client/src/widgets/ListWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/ListWidgetV2/widget/index.tsx`
- Modify: `app/client/src/widgets/SelectWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/DropdownWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/MultiSelectWidgetV2/widget/index.tsx`
- Add focused tests beside each modified Widget.

**Interfaces:**
- Collection Widgets consume `ObjectSet`.
- Selection Widgets expose stable `valuePropertyId` and `displayPropertyId` mappings.
- FilterList keeps its structured `{ typeId, conditions, version }` output and uses the shared Object Type/Property controls.
- Existing `options` and Query bindings remain unchanged in Query mode.

- [ ] **Step 1: Add Object Set and property mapping tests**

Cover Object Set rows, display/value mapping, missing metadata, empty data, and Query mode regression for Select/Dropdown/MultiSelect.

- [ ] **Step 2: Replace FilterList Object Type and Property inputs**

Use shared selectors and controls. Keep filter operator validation and serialized condition version unchanged.

- [ ] **Step 3: Add Object mode to collection/selection Widgets one category at a time**

For each Widget, add the normalized binding, metadata-driven property options, loading/error/empty states, and stable selected value output before moving to the next Widget.

- [ ] **Step 4: Run focused collection tests**

Run the modified Widget tests plus:

```bash
cd app/client
./node_modules/.bin/jest --config jest.config.js \
  src/widgets/FilterListWidget/widget/filterUtils.test.ts \
  src/widgets/FilterListWidget/widget/index.test.tsx \
  src/widgets/SelectWidget/widget/propertyUtils.test.ts \
  src/widgets/MultiSelectWidgetV2/widget/propertyUtils.test.ts \
  --runInBand --no-cache
```

Manual gate: FilterList `PurchaseOrder / Delay Days / gt / 1` feeds Table and shows the expected two rows; Select and Dropdown can choose a Supplier by name while returning its stable ID.

---

### Task 6: Upgrade Single-object, Form, and Input Widgets

**Files:**
- Modify: `app/client/src/widgets/ObjectDetailWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/ObjectDetailWidget/widget/objectDetailUtils.ts`
- Modify: `app/client/src/widgets/ObjectDetailWidget/widget/index.test.tsx`
- Modify: `app/client/src/widgets/JSONFormWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/JSONFormWidget/component/ObjectFormMode.tsx`
- Modify: `app/client/src/widgets/JSONFormWidget/component/ObjectFormMode.test.tsx`
- Modify: `app/client/src/widgets/FormWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/TextWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/InputWidget/widget/index.tsx`
- Add focused tests beside each modified Widget.

**Interfaces:**
- Detail and display Widgets consume `ObjectInstance` or a selected object path.
- JSONForm/Form map `required`, `readOnly`, and `dataType` metadata to existing form field validation and controls.
- Text/Input expose explicit Property selection when the source is an Object Instance.
- Query mode and ordinary static/dynamic Widget values remain unchanged.

- [ ] **Step 1: Add instance/property binding tests**

Cover `PurchaseOrder.PO001`, missing instance, deleted Property, read-only derived Property, and type-specific display/input behavior.

- [ ] **Step 2: Normalize ObjectDetail and JSONForm bindings**

Replace free-form Object Type configuration where present with shared controls, while retaining existing selected-object meta properties and Action parameter validation.

- [ ] **Step 3: Map ontology metadata to Form/Input controls**

Implement only mappings supported by current Widgets: STRING, INTEGER, DECIMAL, BOOLEAN, DATETIME, ENUM, and REFERENCE. Unsupported data types render an explicit unsupported-type state.

- [ ] **Step 4: Run focused form/detail tests**

Run:

```bash
cd app/client
./node_modules/.bin/jest --config jest.config.js \
  src/widgets/ObjectDetailWidget/widget/index.test.tsx \
  src/widgets/ObjectDetailWidget/widget/objectDetailUtils.test.ts \
  src/widgets/JSONFormWidget/component/ObjectFormMode.test.tsx \
  --runInBand --no-cache
```

Manual gate: select a Purchase Order, render its properties in ObjectDetail, edit a writable Form field, and confirm read-only/derived fields are disabled.

---

### Task 7: Add Link and Action Compatibility

**Files:**
- Modify: `app/client/src/widgets/ActionButtonWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/ActionButtonWidget/widget/actionButtonUtils.ts`
- Modify: `app/client/src/widgets/ActionButtonWidget/widget/index.test.tsx`
- Modify: `app/client/src/widgets/ButtonWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/FormButtonWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/MenuButtonWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/ObjectDetailWidget/component/index.tsx`
- Modify: `app/client/src/sagas/CelanworksmithExecutionSaga.ts`
- Modify: `app/client/src/sagas/CelanworksmithObjectQuerySaga.ts`
- Add focused Action/Link integration tests.

**Interfaces:**
- Action targets resolve from a validated Object Instance and stable `actionId`.
- Action parameters map from selected Property values or explicit user input and are validated before dispatch.
- Link navigation uses the existing link query API and does not embed collection names in Widget DSL.
- Successful Action execution emits the existing changed-object refresh path; failure preserves the last successful data and exposes structured error metadata.

- [ ] **Step 1: Add failing action/link binding tests**

Cover valid target, wrong Object Type, missing Object ID, invalid parameter type, confirmation-required Action, success refresh, and failed execution without data loss.

- [ ] **Step 2: Integrate shared binding validation**

Replace duplicated object/action checks with `validateObjectBinding` and preserve the existing execution request shape.

- [ ] **Step 3: Add Link result binding**

Expose Link Type selection from metadata, load linked Object Sets through the existing Object Query Saga, and render loading/empty/error states.

- [ ] **Step 4: Run focused execution and link tests**

Run the ActionButton tests, Object Query Saga tests, Execution Saga tests, and new Link tests with `--runInBand --no-cache`.

Manual gate: execute a valid Action for `PurchaseOrder/PO001`, reject an invalid Object ID, and load a Supplier's linked Purchase Orders.

---

### Task 8: Add Statistics and Visualization Compatibility

**Files:**
- Modify: `app/client/src/widgets/ChartWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/ChartWidget/component/helpers.ts`
- Modify: `app/client/src/widgets/StatboxWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/ProgressWidget/widget/index.tsx`
- Modify: `app/client/src/entities/DataTree/dataTreeCelanworksmithVariables.ts`
- Modify: `app/client/src/celanworksmith/variables/variableLoaderUtils.ts`
- Add focused tests beside the modified Widgets.

**Interfaces:**
- Visualization Widgets consume Object Property arrays or Aggregation Variable outputs, with explicit label/value mappings.
- Derived and numeric metadata are validated before rendering charts or statistics.
- Empty and non-numeric values render a defined empty/invalid state instead of a blank chart.

- [ ] **Step 1: Add property and aggregation mapping tests**

Cover numeric Property, Aggregation Variable, empty Object Set, null values, and unsupported data types.

- [ ] **Step 2: Implement Object input normalization**

Use the shared adapter to build chart/stat input while leaving existing `chartData` and static Query configuration unchanged in Query mode.

- [ ] **Step 3: Run focused visualization tests**

Run Chart helper tests, Statbox tests, Progress tests, and variable DataTree tests with `--runInBand --no-cache`.

Manual gate: build a delayed-order count and average-delay visualization from `PurchaseOrder` data.

---

### Task 9: Complete UX, Migration, and Compatibility Regression

**Files:**
- Modify: `app/client/src/components/propertyControls/CelanworksmithObjectTypeControl.tsx`
- Modify: `app/client/src/components/propertyControls/CelanworksmithObjectPropertyControl.tsx`
- Modify: `app/client/src/celanworksmith/widgets/objectBinding/objectBindingValidation.ts`
- Modify: `app/client/src/ce/utils/autocomplete/entityDefGeneratorMap.ts`
- Modify: `app/client/src/sagas/PostEvaluationSagas.ts`
- Create: `docs/superpowers/verification/2026-08-07-full-ontology-widget-compatibility-verification.md`
- Update: `CelanWorksmith_T-Foundation阶段检查点.md`
- Update: `CelanWorksmith_分步实施计划.md`

**Interfaces:**
- All Object controls use consistent bilingual labels, search behavior, stable-ID summaries, and error/retry states.
- Autocomplete exposes Object Type and Property paths after metadata is ready and does not advertise unavailable nodes.
- Verification document records focused tests, browser checks, known warnings, and residual unsupported Widget categories.

- [ ] **Step 1: Run the full CelanWorksmith frontend regression**

Run the previously established Object, Query, Variable, Function, Action, binding, Table, Form, FilterList, and Explorer suites with `--runInBand --no-cache`.

- [ ] **Step 2: Run changed-file formatting and type checks**

Run Prettier on changed files, `git diff --check`, and the repository type check. Record pre-existing repository-wide type errors separately from new CelanWorksmith errors.

- [ ] **Step 3: Execute browser acceptance**

Verify:

1. New Object-capable Table opens in Object mode.
2. Object Type selector searches and selects `Purchase Order (PurchaseOrder)`.
3. Property selector searches and selects `Delay Days (delayDays)`.
4. FilterList feeds Table and returns the expected rows.
5. Switching to Query mode preserves native Query behavior.
6. An old Query App opens unchanged.
7. Metadata failure, empty metadata, deleted Property, and runtime error show actionable states.

- [ ] **Step 4: Record the phase gate**

Mark only verified Widget categories complete. Do not mark T9 complete and do not claim universal compatibility for categories not covered by the matrix.

## Implementation Order and Gates

```text
B0 Matrix
  -> B1 Contract + controls + Table
  -> B2 Collection/selection
  -> B3 Detail/form/input
  -> B4 Link/action
  -> B5 Visualization
  -> B6 UX/regression
```

Each arrow is a release gate. A later category may not bypass a failing shared binding, migration, or Query regression test. The first executable batch is B0 followed by B1; its manual gate is the current Table Object Mode scenario without manual Object Type input.
