# Ontology Native Path Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the standard Ontology Datasource import and native Query path so Demo import is durable and native Table binding performs one execution per trigger.

**Architecture:** Reuse Appsmith's ordinary Datasource, Action, DataTree, and Widget execution paths. Trace the existing request across the client, server, PF4J plugin, and Runtime Provider boundaries, then fix the first failing boundary with a focused regression test. Do not add an ontology-specific refresh coordinator or restore the retired Object-mode path.

**Tech Stack:** React/TypeScript, Jest, Cypress, Java/Spring WebFlux, Reactor, Maven, PF4J, MongoDB-backed ontology snapshot/provider fixtures.

## Global Constraints

- Ontology remains a first-class Datasource beside DB and API sources.
- Native Query/JS mode remains available.
- `$objects`, `$functions`, `$actions`, and `$variables` are not active DataTree roots.
- Object Widget mode and ontology-specific parallel Redux/Saga execution are not restored.
- All new visible UI text is English and uses the existing i18n mechanism.
- Action Server business execution remains outside Worksmith.
- Multiple Apps may share one Ontology Datasource.
- One App must not bind multiple active versions of the same Ontology Project.
- Subtasks touching shared files run serially and use focused tests before broader checks.
- Do not create a Git commit unless explicitly requested by the user.

## File Map

- `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.tsx`: ordinary Datasource import form and error/success handling.
- `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx`: import form request and response tests.
- `app/client/src/api/OntologyDatasourceApi.ts`: client request and response types for ontology Datasource lifecycle.
- `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceService.java`: plugin resolution, project import, Datasource creation, configuration persistence, and cleanup boundary.
- `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceController.java`: authenticated HTTP boundary.
- `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyDatasourceServiceTest.java`: service-level import and persistence behavior.
- `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyDatasourceControllerTest.java`: HTTP contract behavior.
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`: native PF4J action execution and trigger metadata.
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java`: native Action form decoding and protected context validation.
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyObjectQueryExecutorTest.java`: object query execution and provider call assertions.
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyConfigurationTest.java`: pinned Datasource and Action configuration validation.
- `app/client/cypress/e2e/CelanWorksmith/OntologyDatasourceNativePath_spec.ts`: headless native Datasource/Table regression scenario.
- `docs/superpowers/verification/2026-08-14-ontology-native-path-stabilization.md`: D0 evidence, root-cause findings, test output, and gate decision.

---

### Task 1: Lock the Demo Import Contract

**Files:**
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyDatasourceServiceTest.java`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyDatasourceControllerTest.java`
- Modify: `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx`
- Modify: `app/client/src/api/OntologyDatasourceApi.ts` only if the failing contract test proves the request type is incomplete.

**Interfaces:**
- Consumes `POST /api/v1/celanworksmith/ontology/datasources` with `sourceKind: "DEMO"`.
- Produces a normal Datasource summary and a persisted plugin document ID.

- [ ] **Step 1: Add the failing service test** for a Demo import using a plugin record whose Mongo document ID differs from `celanworksmith-ontology-plugin`; assert the created Datasource uses the Mongo document ID and stores all seven immutable configuration properties.
- [ ] **Step 2: Run the focused server test**.

Run:

```bash
cd app/server
mvn -q -pl appsmith-server -Dtest=OntologyDatasourceServiceTest -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: the new test fails if the service still uses a package name or omits a persisted property.

- [ ] **Step 3: Add the failing controller/client tests** for the authenticated Demo request, successful refresh callback, and a structured error message instead of `[object Object]`.
- [ ] **Step 4: Run the focused client test**.

Run:

```bash
cd app/client
yarn jest src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx --runInBand
```

Expected: the new assertions fail only for the missing contract behavior.

- [ ] **Step 5: Implement the smallest contract correction** in the existing import path, preserving the ordinary Datasource refresh and existing i18n keys.
- [ ] **Step 6: Re-run the server, controller, and client tests** and record the exact results in the D0 verification document.

---

### Task 2: Make Import Failure State Explicit

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceService.java`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyDatasourceServiceTest.java`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyDatasourceControllerTest.java`

**Interfaces:**
- Consumes the existing `DatasourceService.create` and `updateDatasourceStorage` operations.
- Produces either a fully configured active Datasource or a failed request with no active partial Datasource.

- [ ] **Step 1: Write the failing test** that forces `persistDatasourceId` to fail after Datasource creation and asserts the created record is archived or marked inactive according to the existing Datasource service contract.
- [ ] **Step 2: Run only that test and confirm the failure identifies leaked active state.**
- [ ] **Step 3: Implement cleanup at the first failure boundary** without changing the Datasource plugin or adding a second persistence model.
- [ ] **Step 4: Add the missing-plugin and incompatible-provider failure assertions** and verify both leave no active ontology Datasource.
- [ ] **Step 5: Run the focused server suite.**

Run:

```bash
cd app/server
mvn -q -pl appsmith-server -Dtest=OntologyDatasourceServiceTest,OntologyDatasourceControllerTest -Dsurefire.failIfNoSpecifiedTests=false test
```

---

### Task 3: Add Non-invasive Native Execution Evidence

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyObjectQueryExecutorTest.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyConfigurationTest.java` only if a result classification assertion belongs there.

**Interfaces:**
- Consumes the native plugin executor test boundary and a Recording Runtime Gateway.
- Produces deterministic provider-call counts and result classifications without changing the shared Appsmith plugin interface or logging business payloads.

- [ ] **Step 1: Add a failing plugin test** that executes one Object Query and asserts the Recording Runtime Gateway receives exactly one provider call with the pinned Datasource identity.
- [ ] **Step 2: Run the focused plugin test and confirm it fails only because the call-count or identity assertion is absent.**
- [ ] **Step 3: Add deterministic assertions** for success, empty result, validation failure, and provider error classifications using the existing `ActionExecutionResult` contract; do not add diagnostic fields to the result.
- [ ] **Step 4: Run the focused Object Query and Function/Link/Action plugin tests.**

Run:

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin \
  -Dtest=OntologyObjectQueryExecutorTest,OntologyFunctionLinkActionExecutorTest,OntologyConfigurationTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

The cross-layer request count is covered by Task 4 through Cypress interception
of the native `/api/v1/actions/execute` endpoint.

---

### Task 4: Reproduce the Table Repeated-Execution Boundary

**Files:**
- Create: `app/client/cypress/e2e/CelanWorksmith/OntologyDatasourceNativePath_spec.ts`
- Modify: `app/client/cypress/support/commands.js` only if a reusable login or Datasource helper is required by the new scenario.
- Modify: `app/client/cypress/support/Pages/DataSources.ts` only if the existing native query creation helpers cannot express the ontology query form.

**Interfaces:**
- Consumes the normal Datasource import, Query creation, Table binding, and `/api/v1/actions/execute` request path.
- Produces a reproducible execution count for initial binding, idle stabilization, explicit Run, empty result, and error result cases.

- [ ] **Step 1: Write the failing Cypress scenario** that imports or selects the Demo Datasource, creates an Object Query for `PurchaseOrder`, binds a native Table to `Query.data`, and aliases `POST /api/v1/actions/execute`.
- [ ] **Step 2: Assert zero matching executions after Table binding and stabilization, then assert one matching execution after one explicit Run.** Use request interception and action/query identity where available, not arbitrary DOM timing alone.
- [ ] **Step 3: Run the scenario against the active development services.**

Run:

```bash
cd app/client
yarn cypress run --spec cypress/e2e/CelanWorksmith/OntologyDatasourceNativePath_spec.ts --browser electron
```

Expected: the test reproduces the repeated execution or proves that the reported behavior is no longer present in the current candidate.

- [ ] **Step 4: Record empty-result, validation-error, and provider-error execution classifications** from the Task 3 plugin contract tests; do not duplicate them with unverified browser stubs.
- [ ] **Step 5: Capture request counts, action IDs where available, response summaries, and browser console errors in the D0 verification record.**

---

### Task 5: Fix the First Failing Refresh Boundary

**Files:**
- Modify only the first failing boundary identified by Task 4, selected from:
  `app/client/src/ce/sagas/ActionExecution/ActionExecutionSagas.ts`,
  `app/client/src/ce/workers/Evaluation/Actions.ts`,
  `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`,
  or the exact native Appsmith execution file identified by the correlation evidence.
- Modify the corresponding focused test file before production code.
- Modify: `app/client/cypress/e2e/CelanWorksmith/OntologyDatasourceNativePath_spec.ts` to preserve the regression.

**Interfaces:**
- Consumes the existing native Appsmith execution and evaluation contracts.
- Produces one provider execution per native trigger without changing Query data shape or adding ontology-specific refresh state.

- [ ] **Step 1: Record one concrete root-cause statement** in the SDD progress ledger, including the first component that duplicates or causes the request and the evidence proving it.
- [ ] **Step 2: Write the smallest failing unit or integration test** at that boundary.
- [ ] **Step 3: Run the test and verify it fails for the recorded root cause.**
- [ ] **Step 4: Implement one minimal fix**; do not combine import, Widget, metadata, or Action Server changes in this task.
- [ ] **Step 5: Run the focused test, the Cypress reproduction, and the nearest native DB/API regression test.**
- [ ] **Step 6: If the fix changes the architecture beyond the native path, stop and update this plan before proceeding.**

---

### Task 6: Verify Native Regression and Service Health

**Files:**
- Modify: `docs/superpowers/verification/2026-08-14-ontology-native-path-stabilization.md`
- Modify existing tests only when a failing D0 contract is identified; do not add unrelated coverage.

**Interfaces:**
- Consumes all D0 implementation outputs.
- Produces an auditable D0 gate decision and a list of residual manual checks.

- [ ] **Step 1: Run the focused plugin suite.**
- [ ] **Step 2: Run the focused server suite.**
- [ ] **Step 3: Run the focused client import suite.**
- [ ] **Step 4: Run the new Cypress scenario and the nearest native DB/API Table binding regression.**
- [ ] **Step 5: Run `git diff --check` and record any known production-build limitation without treating it as a D0 pass condition.**
- [ ] **Step 6: Check `http://127.0.0.1:8081/api/v1/health`, the frontend root, and backend startup logs for the ontology PF4J plugin.**
- [ ] **Step 7: Mark D0 passed only if the acceptance gate in the design document is satisfied; otherwise record the blocking finding and stop before D1.**

---

## D1-D6 Transition

D1 is a separate implementation plan created after D0 passes. It will cover
Metadata and Native Query editor behavior. D2 through D6 remain blocked until
their predecessor gate is recorded. Each later phase must reuse the standard
Datasource/Action/DataTree path and must add a focused verification document.

The production phases are planned only after D6 and are not part of this D0
implementation plan.
