# Ontology Query Result Sizing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Ontology object Query result size explicit, with default Limited
queries of 100 rows and opt-in Full queries that fail above 5,000 rows.

**Architecture:** Add a `mode` member to the existing canonical `page` object:
`LIMITED` carries `offset` and `limit`; `FULL` is normalized by the plugin to a
bounded 5,000-row request and checked against the provider-reported total.
The existing Builder/Advanced synchronizer remains the sole representation
bridge. Ontology's one-click Table binding will return a stable Query array and
leave pagination to the native client-side Table, without changing DB/API
bindings.

**Tech Stack:** TypeScript/React, Appsmith form-control JSON, Jest, Java 21,
JUnit 5, Reactor, existing Ontology runtime gateway.

## Global Constraints

- Preserve the native Appsmith datasource/query/action pipeline.
- No `$objects`, parallel ontology execution path, or ontology-specific Table
  runtime state.
- User-facing editor copy is English.
- `LIMITED` defaults to offset `0`, limit `100`, with allowed limits `1..1000`.
- `FULL` returns all matches only when total is at most `5000`; overflow fails
  without returning partial rows.
- DB/API query generators and their server-pagination behavior do not change.
- The active Table V2 receives Ontology rows through `tableData` and performs
  client-side pagination for Ontology one-click binding.

---

### Task 1: Define And Enforce Query Result Modes

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyQueryValidator.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Test: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyObjectQueryExecutorTest.java`
- Test: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyActionConfigurationTest.java`

**Interfaces:**
- Consumes: canonical `definition.page` with `{ mode: "LIMITED", offset, limit }`
  or `{ mode: "FULL" }`.
- Produces: an `ObjectQuery` whose `FULL` request uses offset `0` and limit
  `5000`, plus an execution error when `ObjectQueryResult.total() > 5000`.

- [ ] **Step 1: Write failing validator and executor tests**

Add tests with literal definitions:

```java
assertEquals(100, gateway.query.limit());
assertEquals(0, gateway.query.offset());
```

for an omitted page; confirm `LIMITED` accepts `limit: 1000` and rejects
`limit: 1001`; confirm `FULL` sends offset `0`, limit `5000`; configure the
recording gateway with a total of `5001` and assert execution is unsuccessful,
its error contains `5000`, and no response body is returned.

- [ ] **Step 2: Run the new server tests and verify failure**

Run from `app/server`:

```bash
./gradlew :appsmith-plugins:celanworksmithOntologyPlugin:test \
  --tests com.celanworksmith.plugins.ontology.OntologyObjectQueryExecutorTest \
  --tests com.celanworksmith.plugins.ontology.OntologyActionConfigurationTest
```

Expected: new defaults, `FULL`, and overflow assertions fail because the
validator still defaults to `50` and knows only numeric pages.

- [ ] **Step 3: Implement the minimal normalized page model**

In `OntologyQueryValidator`, replace the page record with a mode-aware private
record or equivalent helper. Use named constants:

```java
private static final int DEFAULT_LIMIT = 100;
private static final int MAX_LIMIT = 1_000;
private static final int FULL_RESULT_LIMIT = 5_000;
```

Accept absent `mode` as `LIMITED` for backward compatibility. Reject an unknown
mode, reject `offset`/`limit` in `FULL`, and require the existing integer bounds
for `LIMITED`. In `OntologyPlugin.successResult`, before constructing row data,
throw an `IllegalArgumentException` when a Full query has a total over `5000`.
Pass the mode from validator to execution with the smallest local type change;
do not change `OntologyRuntimeGateway.ObjectQuery`.

- [ ] **Step 4: Run the focused server tests and verify success**

Run the Step 2 command. Expected: all selected tests pass, including legacy
numeric pages and the new Full overflow case.

- [ ] **Step 5: Commit the server contract**

```bash
git add app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyQueryValidator.java \
  app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java \
  app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyObjectQueryExecutorTest.java \
  app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyActionConfigurationTest.java
git commit -m "feat(ontology): bound full query results"
```

### Task 2: Add Builder And Advanced Result-Mode Editing

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/object-query.json`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyConfigurationTest.java`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.ts`
- Test: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.test.ts`

**Interfaces:**
- Consumes: Builder `formData.page.data` and Advanced `definition.page`.
- Produces: canonical page definitions preserving `mode`, with limited defaults
  `{ mode: "LIMITED", offset: 0, limit: 100 }` and full `{ mode: "FULL" }`.

- [ ] **Step 1: Write failing mode round-trip and editor-resource tests**

Add Jest cases asserting:

```ts
expect(serializeBuilderForm({ page: { data: { mode: "FULL" } } }, true))
  .toContain('"mode": "FULL"');
expect(hydrateBuilderForm({ objectTypeId: "PurchaseOrder", page: { mode: "FULL" } }))
  .toMatchObject({ page: { data: { mode: "FULL" } } });
```

Add JUnit resource assertions for a `Result mode` dropdown targeting
`actionConfiguration.formData.page.data.mode`, Limited and Full options, a
default pagination value of `{ mode: "LIMITED", offset: 0, limit: 100 }`, and
an English Full-mode warning. Assert offset/limit controls are hidden in Full
mode through control conditionals.

- [ ] **Step 2: Run the focused client and resource tests and verify failure**

Run:

```bash
cd app/client && ELECTRON_RUN_AS_NODE= yarn jest \
  src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.test.ts \
  --runInBand --no-cache
cd ../server && ./gradlew :appsmith-plugins:celanworksmithOntologyPlugin:test \
  --tests com.celanworksmith.plugins.ontology.OntologyConfigurationTest
```

Expected: the round trip rejects the unknown mode or drops it, and the editor
resource lacks the result-mode controls and warning.

- [ ] **Step 3: Implement the canonical editor representation**

Extend `OntologyObjectQueryDefinition.page` and its validation/normalization
helpers to accept exactly `LIMITED` and `FULL`. Normalize an absent page or
absent mode to Limited defaults of `0` and `100`; require no offset/limit for
Full; preserve valid dynamic Limited values. Update `object-query.json` to
provide the result-mode control and Full warning, using existing form-control
types and conditionals. The numeric pagination control remains visible only for
Limited and uses the new default. Keep Builder and Advanced mode synchronization
as the only source of `definition` updates.

- [ ] **Step 4: Run focused tests and verify success**

Run both Step 2 commands. Expected: Full round-trips, invalid mode/page shapes
are rejected, and the resource exposes the reviewed controls.

- [ ] **Step 5: Commit the editor behavior**

```bash
git add app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/object-query.json \
  app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyConfigurationTest.java \
  app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.ts \
  app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.test.ts
git commit -m "feat(ontology): expose query result modes"
```

### Task 3: Make Ontology Table Binding Client-Paginated

**Files:**
- Modify: `app/client/src/WidgetQueryGenerators/types.ts`
- Modify: `app/client/src/WidgetQueryGenerators/Ontology/index.ts`
- Modify: `app/client/src/WidgetQueryGenerators/Ontology/index.test.ts`
- Modify: `app/client/src/sagas/OneClickBindingSaga.ts`
- Modify: `app/client/src/widgets/TableWidgetV2/widget/index.tsx`
- Test: `app/client/src/widgets/TableWidgetV2/widget/__tests__/nativeQueryMode.test.ts`
- Test: `app/client/src/sagas/OneClickBindingSaga.test.ts` (create)

**Interfaces:**
- Consumes: an Ontology generator select action marked with client-pagination
  binding metadata.
- Produces: `tableData` dynamic binding only for an Ontology Table selection;
  no `onPageChange`, `serverSidePaginationEnabled`, or `totalRecordsCount`.

- [ ] **Step 1: Write failing generator and binding tests**

Add a generator test using a Table query config with
`Table1.pageSize`/`pageOffset` and assert the generated Ontology select has a
literal `{ mode: "LIMITED", offset: 0, limit: 100 }`, no dynamic page binding,
and no total-record action. Add a binding test asserting the final Table update
contains `tableData: "{{Query_PurchaseOrder.data}}"`, preserves
client-side pagination, and has no page callback or server total. Keep the
existing DB/API test fixture asserting server pagination unchanged.

- [ ] **Step 2: Run the focused client tests and verify failure**

Run from `app/client`:

```bash
ELECTRON_RUN_AS_NODE= yarn jest \
  src/WidgetQueryGenerators/Ontology/index.test.ts \
  src/widgets/TableWidgetV2/widget/__tests__/nativeQueryMode.test.ts \
  src/sagas/OneClickBindingSaga.test.ts \
  --runInBand --no-cache
```

Expected: generated Query still contains the Table height bindings and the
shared Table binding path still enables server pagination.

- [ ] **Step 3: Implement explicit generator binding metadata**

Add a narrow optional pagination-binding mode to the widget-query generator
action result, consumed only by `OneClickBindingSaga`. Ontology emits
`CLIENT_SIDE`; other generators emit nothing and keep current behavior. Use
that metadata to omit the generic Table server pagination/total bindings for
Ontology only, without checking datasource names inside `TableWidgetV2`.
Generate the Ontology select with literal Limited defaults and omit the total
record action. Update the widget binding method to accept the explicit mode so
it assigns only the native `tableData` expression for client-paginated binding.

- [ ] **Step 4: Run focused and adjacent tests and verify success**

Run the Step 2 command plus:

```bash
ELECTRON_RUN_AS_NODE= yarn jest \
  src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts \
  --runInBand --no-cache
```

Expected: Ontology has no Table-size query binding, client Table pagination
uses the loaded row count, and existing server pagination tests remain green.

- [ ] **Step 5: Commit the binding boundary**

```bash
git add app/client/src/WidgetQueryGenerators/types.ts \
  app/client/src/WidgetQueryGenerators/Ontology/index.ts \
  app/client/src/WidgetQueryGenerators/Ontology/index.test.ts \
  app/client/src/sagas/OneClickBindingSaga.ts \
  app/client/src/sagas/OneClickBindingSaga.test.ts \
  app/client/src/widgets/TableWidgetV2/widget/index.tsx \
  app/client/src/widgets/TableWidgetV2/widget/__tests__/nativeQueryMode.test.ts
git commit -m "fix(ontology): decouple table size from query results"
```

### Task 4: Deploy And Verify The Active Manual-Test App

**Files:**
- Modify: `docs/migration/2026-08-19-windows11-wsl-migration.md` only if a
  deployment or manual-test checkpoint needs updating.

**Interfaces:**
- Consumes: rebuilt ontology plugin JAR, frontend dev server, and the current
  manual-test application's `Query_PurchaseOrder1` and `Table1`.
- Produces: a running environment where manual Query results are independent
  of Table height.

- [ ] **Step 1: Build the plugin and focused frontend artifacts**

Run the focused Gradle tests from Tasks 1-2 and the Task 3 Jest suite before
deployment. Do not use repository-wide memory-heavy commands.

- [ ] **Step 2: Deploy only changed services**

Build the ontology plugin JAR with the repository's established Gradle task,
copy it to the configured backend plugin location, and restart `cw-backend`.
Restart `cw-frontend` only if the running Vite process does not pick up the
client changes. Confirm `cw-backend`, `cw-rts`, and `cw-frontend` are active.

- [ ] **Step 3: Repair the active manual-test binding**

Replace the temporary server-pagination fields previously added to the current
test page's `Table1` with client-side binding fields only. Update the generated
`Query_PurchaseOrder1` to `{ mode: "LIMITED", offset: 0, limit: 100 }` and
remove its Table-derived dynamic page bindings. Target the concrete current
page and widget IDs only after read-only verification; do not touch data rows,
other applications, or Datasources.

- [ ] **Step 4: Verify manual-test acceptance cases**

Confirm through query configuration and response capture:

1. A no-filter Limited run returns all 10 demo Purchase Orders, independent of
   Table height.
2. A short Table presents the same 10 loaded rows across client-side pages.
3. Resizing then re-running retains a 10-row Query response and recomputes only
   Table page count.
4. Set Limited to 5 and confirm exactly five rows return.
5. Select Full and confirm the warning is visible and a 10-row demo response
   returns.
6. Verify an overflow fixture over 5,000 rows fails with no partial response.

- [ ] **Step 5: Record verification and commit only relevant source/docs**

Run `git diff --check`, inspect the complete diff and focused test output, then
commit any required migration verification note using
`gavin <gavin@localhost>`. Do not commit runtime database state or generated
JAR files.
