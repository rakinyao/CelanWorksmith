# Function Query Builder and Runtime Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make native Ontology Function Queries configurable through Builder and Advanced JSON views while executing `CalculateDelayDays` against the datasource's Mongo Runtime Provider.

**Architecture:** Function Queries keep one canonical `{ functionId, parameters }` definition. The client synchronizer hydrates and serializes it between Builder and Advanced views. The plugin returns selected-Function parameter metadata. `MongoRuntimeDataProvider` implements snapshot-aware Function execution, so Object, Link, and Function reads use the same datasource-selected provider.

**Tech Stack:** TypeScript, React, Redux Form, Jest, PF4J Java plugin, Java 25, Reactor, Spring Data MongoDB, JUnit 5, Mockito.

## Global Constraints

- Preserve the native Appsmith datasource/query/action pipeline; no Function Widget, `$functions`, Redux/Saga state, or parallel execution path.
- Builder and Advanced JSON are views of one `FUNCTION_QUERY` definition containing only `functionId` and `parameters`.
- Editor text is English. Writable parameters are dynamic text fields accepting literals and `{{ }}` bindings; type-specific editors are out of scope.
- Parameter metadata is Function-ID scoped and never invokes a Function or reads runtime objects.
- `MockRuntimeProvider` stays an explicit mock/test provider. Mongo snapshot Function execution must not fall back to it.
- Do not add Demo business data or merge the separate Demo Action Server branch.
- Use focused tests and `gavin <gavin@localhost>` commits.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeDataProvider.java` | Mongo snapshot Function path. |
| `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MongoRuntimeDataProviderTest.java` | Mongo Function tests. |
| `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java` | Selected Function parameter trigger. |
| `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java` | Builder values to canonical definition merge. |
| `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java` | Metadata trigger test. |
| `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyActionConfigurationTest.java` | Builder and Advanced configuration tests. |
| `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.ts` | Pure Function definition logic. |
| `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.test.ts` | Pure Function definition tests. |
| `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.tsx` | Operation dispatch and synchronization. |
| `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts` | Function synchronizer tests. |
| `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/function-query.json` | Function Builder/Advanced form. |

### Task 1: Implement Mongo Snapshot Function Execution

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeDataProvider.java`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MongoRuntimeDataProviderTest.java`

**Interfaces:**
- Consumes: `executeFunction(OntologyProjectDefinition, String, FunctionExecutionRequest)`.
- Produces: Mongo `CalculateDelayDays` results and explicit `FUNCTION_NOT_FOUND`, `INVALID_ARGUMENT`, and `OBJECT_NOT_FOUND` errors.

- [ ] **Step 1: Write failing tests**

Add `FunctionExecutionRequest` import. Add the following test and separate blank `poId`, unsupported Function, and nonnumeric `delayDays` tests. Each early-validation test verifies `template.findOne` is never called.

```java
@Test
void calculatesDelayDaysFromPinnedMongoPurchaseOrder() {
    when(template.findOne(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
            .thenReturn(Mono.just(document("PO002", "DELAYED", 4)));
    StepVerifier.create(provider.executeFunction(
                    RuntimeProviderTestFixtures.binding().project(),
                    "CalculateDelayDays",
                    new FunctionExecutionRequest(Map.of("poId", "PO002"))))
            .expectNext(4)
            .verifyComplete();
}
```

- [ ] **Step 2: Confirm failure**

Run `cd app/server && mvn -q -pl appsmith-server -am -Dtest=MongoRuntimeDataProviderTest -Dsurefire.failIfNoSpecifiedTests=false test`.

Expected: FAIL because the snapshot overload is inherited from `MockRuntimeProvider`.

- [ ] **Step 3: Implement the snapshot-aware Mongo override**

```java
@Override
public Mono<Object> executeFunction(
        OntologyProjectDefinition definition, String functionId, FunctionExecutionRequest request) {
    if (definition == null) return Mono.error(new CelanWorksmithException(
            CelanWorksmithErrorCode.INVALID_ARGUMENT, "Ontology project definition is required"));
    if (!"CalculateDelayDays".equals(functionId)) return Mono.error(new CelanWorksmithException(
            CelanWorksmithErrorCode.FUNCTION_NOT_FOUND, "Unknown function: " + functionId));
    Map<String, Object> parameters = request == null || request.parameters() == null ? Map.of() : request.parameters();
    Object poIdValue = parameters.get("poId");
    if (!(poIdValue instanceof String poId) || poId.isBlank()) return Mono.error(new CelanWorksmithException(
            CelanWorksmithErrorCode.INVALID_ARGUMENT, "Function parameter poId is required"));
    return resolveType(definition, "PurchaseOrder").flatMap(type -> template
            .findOne(Query.query(Criteria.where("_id").is(poId)), MongoRuntimeObjectDocument.class, collection(type))
            .switchIfEmpty(Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.OBJECT_NOT_FOUND, "Unknown object: PurchaseOrder/" + poId)))
            .flatMap(document -> parseDelayDays(poId, document)));
}
```

Implement private `parseDelayDays`: parse `properties.delayDays` as integer; missing/non-numeric values return `INVALID_ARGUMENT` with `PurchaseOrder <id> has invalid delayDays`.

- [ ] **Step 4: Verify and commit**

Run the Step 2 command and expect PASS. Commit with `git add app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeDataProvider.java app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MongoRuntimeDataProviderTest.java && git commit -m "fix(ontology): execute function queries from mongo"`.

### Task 2: Expose Parameter Metadata and Builder Configuration

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyActionConfigurationTest.java`

**Interfaces:**
- Consumes: trigger `ONTOLOGY_FUNCTION_PARAMETERS` with `functionId` parameter and snapshot Function metadata.
- Produces: ordered existing `metadataEntry(...)` fields and canonical `definition.parameters` for Builder mode.

- [ ] **Step 1: Write failing tests**

In `OntologyFunctionLinkActionExecutorTest`, trigger `ONTOLOGY_FUNCTION_PARAMETERS` for `delayScore`. Assert ordered entries retain `label`, `value`, `dataType`, `required`, `readOnly`, and `derived`; blank/unknown IDs throw `IllegalArgumentException`.

In `OntologyActionConfigurationTest`, assert this Builder input produces exactly the shown definition. Also assert absent parameters becomes `Map.of()`, present non-map parameters fails, and `ADVANCED` JSON remains authoritative.

```java
Map<String, Object> formData = Map.of(
        "operation", "FUNCTION_QUERY", "queryMode", "BUILDER",
        "functionId", "delayScore",
        "parameters", Map.of("delayDays", "{{Table1.selectedRow.delayDays}}"));
assertEquals(Map.of("functionId", "delayScore", "parameters", Map.of(
        "delayDays", "{{Table1.selectedRow.delayDays}}")),
        OntologyActionConfiguration.from(action(formData)).definition());
```

- [ ] **Step 2: Confirm failure**

Run `cd app/server && mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=OntologyFunctionLinkActionExecutorTest,OntologyActionConfigurationTest -Dsurefire.failIfNoSpecifiedTests=false test`.

Expected: FAIL because the selector and Builder parameter merge are absent.

- [ ] **Step 3: Implement selector and merge**

In `OntologyPlugin.metadataTriggerResult`, add:

```java
case "ONTOLOGY_FUNCTION_PARAMETERS" -> dropdownResult(functionParameters(snapshot, request));
```

`functionParameters` requires nonblank `request.getParameters().get("functionId")`, locates that Function in `snapshot.functions()`, and maps ordered parameters through `metadataEntry(...)`. It throws `Unknown ontology function: <id>` when absent.

In `OntologyActionConfiguration`, merge Builder `functionId` and map-valued `parameters` into definition only for `FUNCTION_QUERY` Builder mode. Use `Map.of()` when absent; throw `Ontology function parameters selector must be an object` when present but not a map.

- [ ] **Step 4: Verify and commit**

Run the Step 2 command and expect PASS; the trigger must not invoke a Runtime Provider. Commit with `git add app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyActionConfigurationTest.java && git commit -m "feat(ontology): expose function query parameters"`.

### Task 3: Add Function Builder/Advanced Synchronization

**Files:**
- Create: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.ts`
- Create: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.test.ts`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.tsx`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts`

**Interfaces:**
- Consumes: `formData.functionId`, `formData.parameters`, `formData.queryMode`, and Function parameter metadata.
- Produces: strict parser, validator, serializer, and hydrator for `OntologyFunctionQueryDefinition`.

- [ ] **Step 1: Write failing pure-definition tests**

Create `ontologyFunctionQueryDefinition.test.ts` with required writable `poId` metadata. Cover serialization, Advanced hydration, absent Function ID, absent `poId`, unknown parameter ID, supplied read-only/derived parameters, and resetting parameters on Function change.

```ts
expect(serializeFunctionBuilderForm({
  functionId: { data: "CalculateDelayDays" },
  parameters: { data: { poId: "{{Table1.selectedRow.id}}" } },
})).toBe(JSON.stringify({
  functionId: "CalculateDelayDays",
  parameters: { poId: "{{Table1.selectedRow.id}}" },
}));
```

- [ ] **Step 2: Confirm failure**

Run `cd app/client && yarn test ontologyFunctionQueryDefinition --runInBand`.

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement definition logic and operation dispatch**

Create:

```ts
export type OntologyFunctionQueryDefinition = {
  functionId: string;
  parameters: Record<string, unknown>;
};
export type OntologyFunctionMetadata = {
  functions: Array<{ id: string; parameters: Array<{
    id: string; required?: boolean; readOnly?: boolean; derived?: boolean;
  }> }>;
};
```

Parse only `functionId` and `parameters`; require a trimmed nonblank Function ID and object parameters. Reject unknown fields/parameters, missing writable required fields, and supplied read-only/derived fields. Serialization unwraps Redux Form `{ data }`, validates, then calls `JSON.stringify`; hydration returns updates for `actionConfiguration.formData.functionId.data` and `actionConfiguration.formData.parameters.data`.

Modify `QueryModeSynchronizer.tsx` to retain Object behavior but dispatch to Function logic for `FUNCTION_QUERY`. Build Function metadata from `ONTOLOGY_FUNCTION_PARAMETERS` evaluation data. Track the prior Builder Function ID in a `useRef`; a changed ID dispatches exactly one `change(formName, "actionConfiguration.formData.parameters.data", {})` before serialization. Mode switches never clear parameters.

- [ ] **Step 4: Add integration cases, verify, and commit**

Add `QueryModeSynchronizer.test.ts` cases for Builder-to-Advanced, Advanced-to-Builder, invalid Advanced definition retaining Advanced/error behavior, and Function-change clearing only stale parameters. Run `cd app/client && yarn test ontologyFunctionQueryDefinition QueryModeSynchronizer --runInBand` and expect PASS, including Object Query tests. Commit with `git add app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.ts app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.test.ts app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.tsx app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts && git commit -m "feat(ontology): synchronize function query modes"`.

### Task 4: Replace the Function Editor Placeholder

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/function-query.json`
- Modify: `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts`
- Create: `docs/superpowers/verification/2026-08-25-function-query-builder-runtime-consistency.md`

**Interfaces:**
- Consumes: `ONTOLOGY_FUNCTIONS`, `ONTOLOGY_FUNCTION_PARAMETERS`, canonical Builder fields, and Task 3 synchronizer.
- Produces: Function selection/parameter editing in Builder and canonical JSON in Advanced mode.

- [ ] **Step 1: Write a failing editor-resource test**

Parse `function-query.json` in `QueryModeSynchronizer.test.ts`. Assert its parameter control requests selected-Function metadata:

```ts
expect(control.conditionals.fetchDynamicValues.config.params).toEqual({
  requestType: "ONTOLOGY_FUNCTION_PARAMETERS",
  displayType: "DROP_DOWN",
  parameters: { functionId: "{{actionConfiguration.formData.functionId.data}}" },
});
```

Assert a `queryMode` dropdown exists, Builder controls are hidden in `ADVANCED`, and Advanced JSON is shown only in `ADVANCED` with a canonical `CalculateDelayDays` placeholder.

- [ ] **Step 2: Confirm failure**

Run `cd app/client && yarn test QueryModeSynchronizer --runInBand`.

Expected: FAIL because the current editor only has a dropdown and raw JSON input.

- [ ] **Step 3: Implement editor controls**

Replace `function-query.json` with, in order: a `queryMode` dropdown defaulting to `BUILDER`; Builder-only `functionId` dropdown using `ONTOLOGY_FUNCTIONS`; Builder-only writable parameters control at `actionConfiguration.formData.parameters.data`, using `ONTOLOGY_FUNCTION_PARAMETERS` with selected `functionId`, `QUERY_DYNAMIC_INPUT_TEXT` values, and `resetOnDependencyChange: true`; then Advanced-only required JSON input at `actionConfiguration.formData.definition.data` with template substitution and placeholder:

```json
{"functionId":"CalculateDelayDays","parameters":{"poId":"{{Table1.selectedRow.id}}"}}
```

Follow `object-query.json` visibility/enabled conventions. Do not add output controls.

- [ ] **Step 4: Run focused verification and record it**

Run `cd app/client && yarn test ontologyFunctionQueryDefinition QueryModeSynchronizer --runInBand`, then `cd app/server && mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin,appsmith-server -am -Dtest=OntologyFunctionLinkActionExecutorTest,OntologyActionConfigurationTest,MongoRuntimeDataProviderTest -Dsurefire.failIfNoSpecifiedTests=false test`.

Expected: PASS. Create the verification note with exact outcomes and existing toolchain warnings.

- [ ] **Step 5: Commit**

Run `git add app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/function-query.json app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts docs/superpowers/verification/2026-08-25-function-query-builder-runtime-consistency.md && git commit -m "feat(ontology): add function query builder"`.
