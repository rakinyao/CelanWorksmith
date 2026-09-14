# Demo Handler Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable execution of a small, auditable set of `DEMO_HANDLER` Functions against the current business Release data through the native ontology Query pipeline.

**Architecture:** Keep Release `1.0.0` immutable and add a provisional `1.1.0` fixture containing Function metadata and implementation references. Function execution remains provider-blind and receives a homogeneous snapshot-resolved `OntologyObjectSet`; a server-side registry dispatches only named demo handlers and never evaluates source code.

**Tech Stack:** Java 25/Maven, Spring WebFlux, Jackson, Reactor, native Appsmith ontology plugin, Jest/TypeScript.

## Global Constraints

- `DEMO_HANDLER` is the only executable implementation kind in this phase.
- No Python, arbitrary source, eval, reflection-based class loading, network callback, or Action implementation is added.
- Release `1.0.0` and its digest remain unchanged; `1.1.0` gets a new digest.
- Function targets are homogeneous `OntologyObjectSet<T>` values resolved from one immutable snapshot.
- Function code does not filter or select targets; filtering happens before invocation.
- Exceeding `maxItems`, wrong object type, invalid parameter, empty target set, and null numeric values have deterministic errors/semantics covered by tests.
- Results use existing native `FUNCTION_QUERY` response handling and remain consumable by existing Widgets.

### Task 1: Auditable Demo Handler Registry

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mock/MockRuntimeProvider.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/demo/DemoFunctionHandler.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/demo/DemoFunctionRegistry.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/demo/DemoFunctionRegistryTest.java`

**Interfaces:**
- `DemoFunctionHandler.execute(OntologyProjectDefinition definition, OntologyObjectSet targets, Map<String,Object> parameters)` returns a typed scalar or list; provider adapters read the pinned runtime data through their existing mapped-data path.
- Registry exposes only explicit IDs for `CalculateSupplierRisk`, `CalculateContractChangeRate`, `CalculateContractGrossAmount`, and `CalculateCustomerContractTotal`.
- `MockRuntimeProvider.executeFunction` validates target type/limits and delegates to the registry.

- [ ] Write failing tests for registry dispatch, homogeneous target validation, `maxItems`, empty-set behavior, and deterministic decimal aggregation.
- [ ] Run the focused JUnit test and verify RED.
- [ ] Implement the registry and handlers using the existing `MockDataStore` snapshot reads.
- [ ] Run the focused JUnit test and verify GREEN.
- [ ] Run existing ontology Function executor tests to prove legacy Functions remain compatible.

### Task 2: Provisional Release 1.1 Function Metadata

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/FunctionDTO.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/project/OntologyProjectDefinition.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelRelease.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelReleaseParser.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelReleaseMapper.java`
- Create: `docs/superpowers/fixtures/ontology-model-release-demo-functions-1.1.0.json`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/release/OntologyModelReleaseMapperTest.java`

**Interfaces:**
- Function metadata adds `maxItems` and an immutable `DEMO_HANDLER` implementation reference while retaining old constructors.
- The parser accepts `spec.display_name`, `spec.owner_object_type_ids`, `spec.return_type`, `spec.side_effect_free`, `spec.target.max_items`, and `spec.implementation { kind, ref, version }`, and rejects unsupported implementation kinds.
- The mapper emits no Actions and maps the four demo Functions to existing object IDs and fields.

- [ ] Add RED tests for parsing the four functions, digest/version immutability, unsupported implementation rejection, and `maxItems` validation.
- [ ] Implement backward-compatible metadata mapping and generate the new fixture without editing `1.0.0`.
- [ ] Run parser/mapper tests and verify GREEN.

### Task 3: Native Query Builder And Manual Verification

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyQueryValidator.java`
- Test: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java`
- Modify: `docs/superpowers/verification/2026-09-08-demo-handler-functions.md`

**Interfaces:**
- Existing `FUNCTION_QUERY` Builder controls load Function metadata from the pinned `1.1.0` snapshot.
- Results preserve current scalar/list response behavior and include no implementation internals.

- [ ] Add regression tests for Builder execution with one and many targets and for invalid `maxItems`/type cases.
- [ ] Run focused plugin tests and frontend Function Query tests.
- [ ] Build/restart local services and record manual steps: import `1.1.0`, select Function, provide ObjectSet through Builder/Advanced mode, run, and bind result to Text/Table.

## Verification Gates

- Each task must pass its focused tests before the next task starts.
- Final verification includes focused Java tests, focused Jest tests, `git diff --check`, backend health, and a manual Function Query execution against the Demo runtime data.
