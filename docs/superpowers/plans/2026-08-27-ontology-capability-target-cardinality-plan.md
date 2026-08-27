# Ontology Capability Target Cardinality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce metadata-declared Object Set cardinality for every Ontology Function and Action, and add a batch-capable Supplier amount aggregation Function to the demo ontology.

**Architecture:** `minItems` and `maxItems` flow from project YAML through snapshots to the native datasource plugin. The plugin validates a resolved Object Set before execution, and runtime providers repeat the check as their trust boundary. The demo Function consumes a homogeneous Supplier Object Set and returns one aggregate decimal result.

**Tech Stack:** Java 21, Spring WebFlux, MongoDB reactive driver, Maven/JUnit 5/AssertJ/Reactor Test, TypeScript/Jest, Appsmith plugin form configuration, YAML.

## Global Constraints

- Preserve the native Appsmith datasource/query/action pipeline; do not add client-side ontology execution state.
- ObjectSet target context is system-managed, homogeneous, and separate from business parameters.
- User-facing UI copy is English and must use existing i18n mechanisms.
- Continue to author only `SINGLE_OBJECT` targets; do not add Filter, Object Query, Table multi-select, cursors, jobs, or progress UI.
- `minItems` and `maxItems` are positive integers and `minItems <= maxItems`.
- Use historical Git identity `gavin <gavin@localhost>` for task commits.

---

### Task 1: Propagate and Validate Capability Target Bounds

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/FunctionDTO.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/ActionTypeDTO.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/project/OntologyProjectYamlImporter.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/project/OntologyProjectValidator.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologySnapshotService.java`
- Modify: `app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyRuntimeGateway.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyRuntimeSnapshotProjection.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/project/OntologyProjectYamlImporterTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyProjectImportTest.java`

**Interfaces:**
- Produces `FunctionDTO(..., int minItems, int maxItems, ...)` and `ActionTypeDTO(..., int minItems, int maxItems, ...)`.
- Produces matching `OntologyRuntimeGateway.FunctionMetadata` and `ActionMetadata` fields.

- [ ] **Step 1: Write the failing tests**

Add valid `minItems: 1`, `maxItems: 100` YAML fixtures and invalid zero/inverted-bound fixtures. Assert imported definitions and snapshots retain valid bounds and reject invalid bounds.

- [ ] **Step 2: Verify red**

Run `cd app/server && ./mvnw -pl appsmith-server -Dtest=OntologyProjectYamlImporterTest,OntologyProjectImportTest test`.

Expected: failure because target bounds are neither parsed nor exposed.

- [ ] **Step 3: Write minimal implementation**

Parse required YAML bounds, add immutable DTO and gateway metadata fields, include them in snapshot digest canonicalization, project them to runtime snapshots, and validate positive ordered bounds. Update each construction site with explicit `1..1` bounds for current PurchaseOrder Function and Action fixtures.

- [ ] **Step 4: Verify green**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit**

Run `git add` for only the listed source and test files, then `git -c user.name=gavin -c user.email=gavin@localhost commit -m "feat(ontology): declare capability target bounds"`.

### Task 2: Enforce Bounds at Query and Runtime Boundaries

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyQueryValidator.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mock/MockRuntimeProvider.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeDataProvider.java`
- Test: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyQueryValidatorTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MockRuntimeProviderTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MongoRuntimeDataProviderTest.java`

**Interfaces:**
- Consumes the bounds declared in Task 1.
- Rejects Object Set counts outside `[minItems, maxItems]` before object lookup or Action dispatch.

- [ ] **Step 1: Write the failing tests**

Add a validator test and both provider tests passing two PurchaseOrder IDs to `CalculateDelayDays`. Assert a target-count error before any object lookup.

- [ ] **Step 2: Verify red**

Run `cd app/server && ./mvnw -pl appsmith-plugins/celanworksmithOntologyPlugin,appsmith-server -Dtest=OntologyQueryValidatorTest,MockRuntimeProviderTest,MongoRuntimeDataProviderTest test`.

Expected: the multi-target request is accepted or fails only after provider work, because no cardinality enforcement exists.

- [ ] **Step 3: Write minimal implementation**

Validate normalized Object Set counts in the plugin. Both runtime providers must resolve the selected Function metadata from the pinned definition and apply the same lower/upper-bound validation before data access. Error messages state actual count and accepted range.

- [ ] **Step 4: Verify green**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit**

Run `git add` for only the listed source and test files, then `git -c user.name=gavin -c user.email=gavin@localhost commit -m "feat(ontology): enforce capability target bounds"`.

### Task 3: Add Supplier Aggregate Function and Deterministic Demo Data

**Files:**
- Modify: `app/server/appsmith-server/src/main/resources/celanworksmith/demo-ontology-project.yaml`
- Modify: `app/server/appsmith-server/src/main/resources/celanworksmith/ontology-projects/celanworksmith-demo/objects/Supplier.yaml`
- Create: `app/server/appsmith-server/src/main/resources/celanworksmith/ontology-projects/celanworksmith-demo/functions/SumSupplierAmounts.yaml`
- Modify: `app/server/appsmith-server/src/main/resources/celanworksmith/ontology-projects/celanworksmith-demo/ontology.yaml`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/bootstrap/OntologyProjectBootstrap.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/mock/MockDataStore.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mock/MockRuntimeProvider.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeDataProvider.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MockRuntimeProviderTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MongoRuntimeDataProviderTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyProjectImportTest.java`

**Interfaces:**
- Adds `SumSupplierAmounts: ObjectSet<Supplier>[1..100] -> DECIMAL` with no business parameters.
- Demo Supplier objects expose deterministic `amount` decimal values.

- [ ] **Step 1: Write the failing tests**

Add Mock and Mongo tests passing two Supplier IDs and asserting the exact deterministic decimal sum. Also assert invalid type, missing ID, and 101 targets fail. Assert project import exposes owner `Supplier` and bounds `1..100`.

- [ ] **Step 2: Verify red**

Run `cd app/server && ./mvnw -pl appsmith-server -Dtest=MockRuntimeProviderTest,MongoRuntimeDataProviderTest,OntologyProjectImportTest test`.

Expected: `SumSupplierAmounts` is unknown and Supplier does not declare `amount`.

- [ ] **Step 3: Write minimal implementation**

Add Function metadata to both demo project representations and bootstrap manifest. Add Supplier `amount: DECIMAL` metadata and deterministic seed values. Implement decimal-safe ordered Supplier reads in both providers; report invalid type, missing object, non-decimal data, and oversized sets through existing native error paths.

- [ ] **Step 4: Verify green**

Run the Step 2 command. Expected: PASS.

- [ ] **Step 5: Commit**

Run `git add` for only the listed source, resource, and test files, then `git -c user.name=gavin -c user.email=gavin@localhost commit -m "feat(demo): add supplier amount aggregation"`.

### Task 4: Surface Bounds in the Capability Editor and Verify

**Files:**
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.ts`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.ts`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.tsx`
- Modify: the existing i18n resource consumed by `QueryModeSynchronizer`
- Test: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.test.ts`
- Test: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts`
- Test: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts`
- Modify: `docs/superpowers/verification/2026-08-26-ontology-object-set-function-action.md`

**Interfaces:**
- Consumes `minItems` and `maxItems` metadata.
- Produces i18n-backed target acceptance text while retaining `SINGLE_OBJECT` and existing Builder/Advanced serialization.

- [ ] **Step 1: Write the failing tests**

Extend metadata fixtures with bounds. Assert the Builder model exposes translated one-target text for `1..1` and range text for `1..100`, without enabling unsupported multi-target sources.

- [ ] **Step 2: Verify red**

Run `cd app/client && npx jest --runInBand src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts`.

Expected: type or assertion failures because client metadata has no target bounds.

- [ ] **Step 3: Write minimal implementation**

Extend Function and Action metadata types and display translated target acceptance next to target configuration using the existing localization pattern. Do not add new source controls or modify persisted target JSON.

- [ ] **Step 4: Verify green and record evidence**

Run the Step 2 Jest command and the affected server suites from Tasks 1 through 3. Update the verification note with commands, results, the single-target rejection, the Supplier aggregate sum, and the deferred target-source scope.

- [ ] **Step 5: Commit**

Run `git diff --check`, confirm unrelated existing modifications remain untouched, then commit only the client files and documentation with `git -c user.name=gavin -c user.email=gavin@localhost commit -m "feat(editor): show capability target bounds"`.
