# Function Query Mode Boundary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Function selection independent of Builder/Advanced parameter editing, remove Advanced Function-ID races, and provide metadata-derived Builder inputs.

**Architecture:** `functionId` is one required selector visible in both modes. Builder renders writable parameters from selected Function metadata; Advanced edits only a parameters JSON object. The existing native Query path receives the composed canonical `{ functionId, parameters }` definition.

**Tech Stack:** React, TypeScript, Redux Form, Jest, PF4J editor JSON, Java 25, JUnit 5.

## Global Constraints

- Preserve the native Appsmith datasource/query/action pipeline and `Query.data`; no Function Widget or parallel state.
- Function selector is visible and required in both modes. Advanced JSON contains parameters only, never `functionId`.
- Builder metadata is scoped to current selected Function; Advanced does not await metadata.
- This version clears parameters immediately on Function change; do not add confirmation, drafts, or restoration.
- Advanced permits valid JSON objects with semantic errors; backend returns native Query errors. Malformed JSON is an editor error.
- Do not modify Demo data or merge Action Server work. Use `gavin <gavin@localhost>` and focused tests.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `app/client/src/components/formControls/FunctionParametersControl.tsx` | Metadata-derived writable parameter inputs, object-valued output, reset on Function change. |
| `app/client/src/components/formControls/FunctionParametersControl.test.tsx` | Control interaction and reset tests. |
| `app/client/src/components/formControls/utils.ts` | Registers `FUNCTION_PARAMETERS`. |
| `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/function-query.json` | Always-visible selector and mode-specific parameter editors. |
| `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.ts` | Canonical and parameter-only parsing/serialization. |
| `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.tsx` | Mode synchronization without Function-ID hydration race state. |
| `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java` | Server composition of selector Function ID and parameters. |

### Task 1: Add a Metadata-Derived Builder Parameter Control

**Files:**
- Create: `app/client/src/components/formControls/FunctionParametersControl.tsx`
- Create: `app/client/src/components/formControls/FunctionParametersControl.test.tsx`
- Modify: `app/client/src/components/formControls/utils.ts`

**Interfaces:**
- Consumes: dynamic metadata `{ value, label, dataType, required, readOnly, derived }` and `Record<string, unknown>` form value.
- Produces: `FUNCTION_PARAMETERS`, ordered dynamic inputs for writable values, and an object-valued parameter map.

- [ ] **Step 1: Write failing component tests**

Test metadata with writable `poId`, read-only `createdAt`, and derived `delayDays`. Assert only `poId` renders with `Purchase Order ID (STRING)` and expression `{{Table1.selectedRow.id}}` changes value to `{ poId: "{{Table1.selectedRow.id}}" }`. Assert a changed Function ID emits `{}` once.

- [ ] **Step 2: Confirm RED**

Run `cd app/client && yarn exec jest FunctionParametersControl --runInBand`.

Expected: FAIL because the control and registry entry do not exist.

- [ ] **Step 3: Implement and register**

Implement `FunctionParametersControl` with existing input primitives. It uses stable metadata `value` as map key, renders only writable non-derived entries, retains literal and moustache strings, and uses a `useRef` prior Function ID to emit `{}` once after actual selection change. Register `FUNCTION_PARAMETERS` in `utils.ts`.

- [ ] **Step 4: Verify GREEN and commit**

Run the Step 2 command, expect PASS, then commit `feat(ontology): add function parameter builder control` with the three files.

### Task 2: Separate Function Selection From Parameter Modes

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/function-query.json`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.ts`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.test.ts`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.tsx`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts`

**Interfaces:**
- Consumes: always-present `formData.functionId`, Builder object parameters, and Advanced parameter JSON text.
- Produces: complete definition only at synchronization; Advanced parser returns `Record<string, unknown>` and no Function ID.

- [ ] **Step 1: Write failing boundary tests**

Assert Function selector is visible for both modes. Assert Advanced placeholder is `{ "poId": "{{Table1.selectedRow.id}}" }` and no Advanced control contains `functionId`. Test `parseAdvancedParameters('{"unknown":"x"}')` returns its map without metadata validation; malformed or array JSON throws `Advanced Function parameters must be a JSON object`. Assert Advanced mode neither reads nor waits for `ONTOLOGY_FUNCTION_PARAMETERS`.

- [ ] **Step 2: Confirm RED**

Run `cd app/client && yarn exec jest ontologyFunctionQueryDefinition QueryModeSynchronizer --runInBand`.

Expected: FAIL because Advanced parses a complete definition and selector is Builder-only.

- [ ] **Step 3: Implement mode separation**

Make Function selector unconditional in editor JSON. Use `FUNCTION_PARAMETERS` only in Builder and fetch its metadata there. Bind Advanced JSON to `actionConfiguration.formData.parameters.data`; it parses only a non-array JSON object and never fetches parameter metadata. Remove `pendingFunctionMetadata`, Advanced Function-ID parsing, and Advanced-to-Builder Function hydration from synchronizer. Combine selected `functionId` and Builder object or Advanced parameter object; Builder may validate current metadata, Advanced performs syntax/shape validation only.

- [ ] **Step 4: Verify GREEN and commit**

Run the Step 2 command, expect existing Object and Function tests to pass, then commit `refactor(ontology): separate function selection from modes`.

### Task 3: Compose Canonical Definitions Server-Side

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyActionConfigurationTest.java`
- Create: `docs/superpowers/verification/2026-08-25-function-query-mode-boundary.md`

**Interfaces:**
- Consumes: selected `formData.functionId` in both modes and object/JSON parameters in `formData.parameters`.
- Produces: exactly `{ functionId, parameters }`, then existing validator errors through native Query execution.

- [ ] **Step 1: Write failing configuration tests**

Assert Builder selector `CalculateDelayDays` plus map parameters and Advanced selector plus parameter-only JSON create identical canonical definitions. Assert Advanced parameter JSON with `functionId` is treated as an unknown parameter by existing Function validation. Assert missing required `poId` and unknown IDs pass configuration parsing but return normal parameter-specific Query validation errors.

- [ ] **Step 2: Confirm RED**

Run `cd app/server && mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=OntologyActionConfigurationTest,OntologyFunctionLinkActionExecutorTest -Dsurefire.failIfNoSpecifiedTests=false test`.

Expected: FAIL because Advanced expects a complete definition and ignores selected Function ID.

- [ ] **Step 3: Implement composition**

For every `FUNCTION_QUERY`, require selector Function ID. Builder accepts object parameters. Advanced parses parameter JSON with existing `ObjectMapper`, rejecting malformed/non-object values. Only compose `definition.functionId = selectedFunctionId` and `definition.parameters = parsedParameters`; do not accept a second Function ID. Preserve `OntologyQueryValidator` as semantic authority for required, unknown, read-only, derived, and type errors.

- [ ] **Step 4: Verify and commit**

Run `cd app/client && yarn exec jest FunctionParametersControl ontologyFunctionQueryDefinition QueryModeSynchronizer --runInBand`; then run `cd app/server && mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin,appsmith-server -am -Dtest=OntologyActionConfigurationTest,OntologyFunctionLinkActionExecutorTest,MongoRuntimeDataProviderTest -Dsurefire.failIfNoSpecifiedTests=false test`. Record exact outcomes/warnings in verification note, then commit `fix(ontology): compose function query definitions by mode`.
