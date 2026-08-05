# T6.1 ObjectDetail Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a registered read-only ObjectDetail Widget that renders one bound object, lazily loads linked objects through Redux/Saga, and exposes selected linked state.

**Architecture:** Keep object and link fetching in the existing CelanWorksmith API/Redux/Saga layers. The Widget receives evaluated `objectData`, derives display groups from ontology metadata, dispatches link-load intents, and renders selector state without making network requests in React render code.

**Tech Stack:** React, TypeScript, Appsmith `BaseWidget`, WidgetProvider factory/registry, Redux Toolkit-style reducers, Redux-Saga, Jest, React Testing Library, existing DSL import/export utilities.

## Global Constraints

- Use `/api/v1/celanworksmith` through `CelanworksmithAPI`; do not create relative `/runtime` requests.
- Keep all network calls in `CelanworksmithAPI` and Saga code; Widget components must not call APIs.
- Preserve the existing asynchronous DataTree/Saga loading model and T5 scoped refresh behavior.
- Preserve user Widget input values when object/link data refreshes.
- Display primary object properties even when a Link request fails.
- Run focused tests after every task; do not run broad regex Jest selections.
- Execute tasks sequentially with narrow file scopes and immediate review; do not dispatch parallel Agents for shared state files.

---

### Task 1: Define ObjectDetail Pure Data Model

**Files:**
- Create: `app/client/src/widgets/ObjectDetailWidget/widget/objectDetailUtils.ts`
- Test: `app/client/src/widgets/ObjectDetailWidget/widget/objectDetailUtils.test.ts`

**Interfaces:**
- Produces `normalizeObjectData(value: unknown): NormalizedObjectData | undefined`.
- Produces `groupObjectProperties(object, metadata, displayMode): ObjectDetailPropertyGroup[]`.
- Produces `getObjectIdentity(value: NormalizedObjectData | undefined): string | undefined`.

- [ ] **Step 1: Write failing tests for object normalization**

Test flat and nested inputs, preserve `id`/`typeId`, flatten nested `properties`,
and return `undefined` for null, missing id, or missing typeId.

- [ ] **Step 2: Run the focused test and verify the expected missing-export failure**

Run:

```bash
yarn jest --no-cache --runInBand --silent src/widgets/ObjectDetailWidget/widget/objectDetailUtils.test.ts
```

Expected: FAIL because the new utility module does not exist.

- [ ] **Step 3: Implement the minimal normalizer and identity helper**

Keep the normalized shape flat and do not perform metadata or API lookups.

- [ ] **Step 4: Add failing tests for Basic/Business/Derived grouping**

Assert metadata order, default `BUSINESS_ONLY`, `BUSINESS_AND_DERIVED`, and
`ALL_METADATA` behavior, including unknown runtime fields only in `ALL_METADATA`.

- [ ] **Step 5: Implement property grouping**

Use `derived` metadata to classify fields. Always include `id` and `typeId` in
the Basic group. Use metadata display names and data types when available.

- [ ] **Step 6: Run the focused utility suite**

Expected: all utility tests pass.

- [ ] **Step 7: Commit the isolated utility change**

```bash
git add app/client/src/widgets/ObjectDetailWidget/widget/objectDetailUtils.ts app/client/src/widgets/ObjectDetailWidget/widget/objectDetailUtils.test.ts
git commit -m "feat: add object detail data normalization"
```

### Task 2: Add Link Metadata and Link Data State

**Files:**
- Create: `app/client/src/actions/celanworksmithLinkActions.ts`
- Create: `app/client/src/reducers/celanworksmithLinksReducer.ts`
- Create: `app/client/src/reducers/celanworksmithLinksReducer.test.ts`
- Create: `app/client/src/sagas/CelanworksmithLinksSaga.ts`
- Create: `app/client/src/sagas/__tests__/CelanworksmithLinksSaga.test.ts`
- Modify: `app/client/src/ce/constants/ReduxActionConstants.tsx`
- Modify: `app/client/src/ce/reducers/index.tsx`
- Modify: `app/client/src/ce/sagas/index.tsx`
- Modify: `app/client/src/selectors/celanworksmithSelectors.ts`

**Interfaces:**
- Consumes `CelanworksmithAPI.getLinkTypes` and `getLinkedObjects`.
- Produces `celanworksmithLinkMetadataRequested(typeId)` and `celanworksmithLinkLoadRequested({ typeId, objectId, linkTypeId, prefetch })`.
- Produces selectors for Link Type metadata by `typeId` and link data by `{ typeId, objectId, linkTypeId }`.

- [ ] **Step 1: Add reducer tests for idle, loading, ready, empty, error, and retry replacement**

Assert that state is isolated by the three-part cache key and that a failed link
does not mutate another object or Link Type entry.

- [ ] **Step 2: Run reducer tests and verify they fail**

Run:

```bash
yarn jest --no-cache --runInBand --silent src/reducers/celanworksmithLinksReducer.test.ts
```

Expected: FAIL because the reducer and action types are not implemented.

- [ ] **Step 3: Implement action constants, typed actions, and reducer**

Keep Link Type metadata state separate from per-object link data. Keep
`loading` as a per-key state. Preserve successful data while a refresh is
loading so a refresh cannot render false empty data.

- [ ] **Step 4: Add Saga tests for API call, duplicate suppression, prefetch, and error normalization**

Use the existing Saga test style. Assert the exact API method and arguments,
including `linkTypeId` and `{ offset: 0, limit: 100 }`.

- [ ] **Step 5: Implement link Saga and selectors**

The Saga must load Link Type metadata once per source type, ignore an identical
in-flight object/link key, call the shared API client, normalize errors through
the existing CelanWorksmith error helper, and dispatch success/error actions.
Register the reducer and Saga in the existing roots.

- [ ] **Step 6: Run the reducer and Saga suites**

Expected: all link state tests pass without starting a browser or server.

- [ ] **Step 7: Commit the link data layer**

```bash
git add app/client/src/api/CelanworksmithAPI.ts app/client/src/actions/celanworksmithLinkActions.ts app/client/src/reducers/celanworksmithLinksReducer.ts app/client/src/reducers/celanworksmithLinksReducer.test.ts app/client/src/sagas/CelanworksmithLinksSaga.ts app/client/src/sagas/__tests__/CelanworksmithLinksSaga.test.ts app/client/src/ce/constants/ReduxActionConstants.tsx app/client/src/ce/reducers/index.tsx app/client/src/ce/sagas/index.tsx app/client/src/selectors/celanworksmithSelectors.ts
git commit -m "feat: add object link loading state"
```

### Task 3: Implement ObjectDetail Runtime Component

**Files:**
- Create: `app/client/src/widgets/ObjectDetailWidget/component/index.tsx`
- Create: `app/client/src/widgets/ObjectDetailWidget/component/index.styled.tsx`
- Create: `app/client/src/widgets/ObjectDetailWidget/widget/index.tsx`
- Create: `app/client/src/widgets/ObjectDetailWidget/widget/index.test.tsx`
- Create: `app/client/src/widgets/ObjectDetailWidget/constants.ts`
- Create: `app/client/src/widgets/ObjectDetailWidget/thumbnail.svg`
- Create: `app/client/src/widgets/ObjectDetailWidget/icon.svg`

**Interfaces:**
- Consumes `objectData`, `displayMode`, link selectors, and link actions.
- Produces `selectedLinkedObject`, `selectedLinkedObjectId`, and `selectedLinkType` through `getMetaPropertiesMap` and `updateWidgetMetaProperty`.

- [ ] **Step 1: Write failing component tests for default, empty, degraded, and link error states**

Cover the primary object rendering, Basic/Business groups, no-object state,
invalid object state, metadata fallback, scoped link error, and local Retry.

- [ ] **Step 2: Run the component suite and verify failure**

Run:

```bash
yarn jest --no-cache --runInBand --silent src/widgets/ObjectDetailWidget/widget/index.test.tsx
```

Expected: FAIL because the widget module is not registered or implemented.

- [ ] **Step 3: Implement the component without API calls**

Use `useSelector` for metadata/link state and `useDispatch` for link-load and
retry intents. Render properties immediately. Trigger first-link prefetch from
a controlled effect keyed by object identity and available link metadata.

- [ ] **Step 4: Implement linked selection state**

Keep primary `objectData` unchanged. On linked item click, set selected linked
object/id/link type and clear selection when object identity or active Link Tab
changes.

- [ ] **Step 5: Implement Widget class defaults, property pane, autocomplete, and styles**

Use `objectData` as a bindable text property, `displayMode` as a dropdown with
the three exact values, and standard `isVisible`, `widgetName`, layout, and
version defaults. Add `getMetaPropertiesMap` entries and autocomplete
definitions for the three output paths. Linked selection must call
`updateWidgetMetaProperty` rather than storing output only in React state.

- [ ] **Step 6: Run the focused component suite and related existing Widget tests**

Expected: new component tests pass and no existing Widget test is changed.

- [ ] **Step 7: Commit the runtime Widget**

```bash
git add app/client/src/widgets/ObjectDetailWidget
git commit -m "feat: add object detail widget"
```

### Task 4: Register Widget and Verify DSL Compatibility

**Files:**
- Modify: `app/client/src/widgets/index.ts`
- Create: `app/client/src/widgets/ObjectDetailWidget/index.ts`
- Create: `app/client/src/widgets/ObjectDetailWidget/index.test.ts`
- Create: `app/client/src/widgets/ObjectDetailWidget/dsl.test.ts`

**Interfaces:**
- Consumes the `ObjectDetailWidget` class from Task 3.
- Produces a loader entry for `OBJECT_DETAIL_WIDGET` and a WidgetFactory registration path.

- [ ] **Step 1: Add failing registration and default DSL tests**

Assert the loader map contains `OBJECT_DETAIL_WIDGET`, the factory sees the
widget type after registration, and defaults include `objectData`,
`displayMode`, `widgetName`, `version`, `rows`, and `columns`.

- [ ] **Step 2: Run registration tests and verify failure**

Run:

```bash
yarn jest --no-cache --runInBand --silent src/widgets/ObjectDetailWidget/index.test.ts src/widgets/ObjectDetailWidget/dsl.test.ts
```

Expected: FAIL because the loader and DSL fixtures are not registered.

- [ ] **Step 3: Register the dynamic loader and export the Widget class**

Follow the existing lazy loader pattern in `widgets/index.ts`; do not add a
static widget barrel import that reintroduces the registry cycle.

- [ ] **Step 4: Add import/export round-trip assertions**

Round-trip a DSL containing a bound `objectData` expression and each display
mode. Assert the binding and mode survive unchanged.

- [ ] **Step 5: Run registration, DSL, and ObjectDetail tests**

Expected: all new Widget suites pass.

- [ ] **Step 6: Commit registration and compatibility coverage**

```bash
git add app/client/src/widgets/index.ts app/client/src/widgets/ObjectDetailWidget/index.ts app/client/src/widgets/ObjectDetailWidget/index.test.ts app/client/src/widgets/ObjectDetailWidget/dsl.test.ts
git commit -m "feat: register object detail widget"
```

### Task 5: Integrated Verification and T6.1 Record

**Files:**
- Create: `docs/superpowers/verification/2026-08-05-t6-1-object-detail-verification.md`
- Modify: `CelanWorksmith_T5阶段检查点.md`

- [ ] **Step 1: Run the exact T6.1 focused frontend test set**

Run:

```bash
yarn jest --no-cache --runInBand --silent \
  src/widgets/ObjectDetailWidget \
  src/reducers/celanworksmithLinksReducer.test.ts \
  src/sagas/__tests__/CelanworksmithLinksSaga.test.ts \
  src/api/__tests__/CelanworksmithAPI.test.ts
```

Expected: all selected suites pass. Do not use a broad unanchored regex.

- [ ] **Step 2: Run changed-module ESLint and Prettier checks**

Run these exact commands from `app/client` and record warnings separately from
errors:

```bash
yarn eslint --no-cache src/widgets/ObjectDetailWidget src/actions/celanworksmithLinkActions.ts src/reducers/celanworksmithLinksReducer.ts src/sagas/CelanworksmithLinksSaga.ts src/selectors/celanworksmithSelectors.ts
yarn prettier --check src/widgets/ObjectDetailWidget src/actions/celanworksmithLinkActions.ts src/reducers/celanworksmithLinksReducer.ts src/sagas/CelanworksmithLinksSaga.ts src/selectors/celanworksmithSelectors.ts
```

- [ ] **Step 3: Run the existing Widget registration and DSL regression tests**

Use the exact registration/DSL test paths from Task 4 and confirm no existing
Widget registration test regresses.

- [ ] **Step 4: Perform manual acceptance with the running development stack**

Create or reuse an app with an existing Table and verify:

```text
ObjectDetail.objectData = {{Table1.selectedRow}}
```

Confirm properties render, the first Link Tab prefetches without blocking the
primary object, another Link Tab loads on click, selecting a linked row updates
`selectedLinkedObject`, and a failed link request leaves primary properties visible.

- [ ] **Step 5: Record results and known limitations**

Record exact test counts, runtime URL, API prefix, any existing Appsmith
warnings, and the fact that Object-aware Table remains T7 scope.

- [ ] **Step 6: Commit the T6.1 verification record**

```bash
git add docs/superpowers/verification/2026-08-05-t6-1-object-detail-verification.md CelanWorksmith_T5阶段检查点.md
git commit -m "docs: record T6.1 object detail verification"
```
