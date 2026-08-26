# Ontology Object Set Function and Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (\`- [ ]\`) syntax for tracking.

**Goal:** Make native Ontology Function and Action Queries execute owner-bound capabilities against a validated homogeneous typed Object Set, initially from one selected object.

**Architecture:** Metadata declares ordered capability owners and Action transaction semantics. Query definitions retain selected owner/capability outside Advanced JSON, then pass a normalized \`ObjectSet\` through the native Appsmith plugin, Runtime Provider, and replaceable Action Server client. Builder and Advanced are views of one target/parameter payload; only \`SINGLE_OBJECT\` is executable in this phase.

**Tech Stack:** TypeScript, React, Redux Form, Jest, PF4J Java plugin, Java 25, Spring WebFlux, Spring Data MongoDB, JUnit 5, Mockito, Demo Action Server.

## Global Constraints

- Preserve the native Appsmith datasource/query/action pipeline; no client-side ontology state, Action Widget, or parallel execution path.
- Every Function and Action has a non-empty ordered \`ownerObjectTypeIds\`; global capabilities are invalid.
- An execution has one selected owner type and a non-empty homogeneous Object Set. This release supports only \`SINGLE_OBJECT\`.
- Advanced JSON contains only \`target\` and \`parameters\`; it cannot override selected owner type, capability ID, or Action \`atomic\`.
- Action \`atomic\` defaults to \`false\`; unsupported whole-set atomic execution fails before mutation.
- No compatibility is required for development-only Function/Action Queries.
- User-visible copy is English and follows existing plugin-editor i18n conventions.
- Do not add broad Demo business data. Successful production-schedule mutation remains deferred to the dedicated Demo-data phase.
- Use \`gavin <gavin@localhost>\` for commits. Do not commit local service/test-account configuration or credentials.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| \`app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/FunctionDTO.java\` | Persisted Function owner declaration. |
| \`app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/ActionTypeDTO.java\` | Persisted Action owner declaration and atomic flag. |
| \`app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyRuntimeGateway.java\` | Snapshot metadata and typed target contract. |
| \`app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyObjectSet.java\` | Immutable homogeneous target representation. |
| \`app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/dto/FunctionExecutionRequest.java\` | Function target context plus business parameters. |
| \`app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/\` | Query composition, validation, metadata triggers, native execution. |
| \`app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyActionServerProtocol.java\` | Versioned Action Server transport. |
| \`app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/\` | Per-target Action dispatch/audit and atomic preflight. |
| \`app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.ts\` | Shared Function/Action Builder/Advanced synchronization. |
| \`app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/{function,action}-query.json\` | Owner-first Builder/Advanced editors. |
| \`docs/superpowers/verification/2026-08-26-ontology-object-set-function-action.md\` | Focused test and isolated E2E evidence. |

### Task 1: Migrate Capability Metadata to Owner Lists

**Files:**
- Modify: \`app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/FunctionDTO.java\`
- Modify: \`app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/ActionTypeDTO.java\`
- Modify: \`app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyRuntimeGateway.java\`
- Modify: the ontology project importer and metadata tests under \`app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/\` and \`src/test/java/com/celanworksmith/ontology/\`
- Modify: \`app/server/appsmith-server/src/main/resources/celanworksmith/ontology-projects/celanworksmith-demo/functions/CalculateDelayDays.yaml\`
- Modify: \`app/server/appsmith-server/src/main/resources/celanworksmith/ontology-projects/celanworksmith-demo/actions/UpdateProductionSchedule.yaml\`

**Interfaces:**
- Produces \`FunctionMetadata(String id, String displayName, String returnType, List<String> ownerObjectTypeIds, List<PropertyMetadata> parameters)\`.
- Produces \`ActionMetadata(String id, String displayName, List<String> ownerObjectTypeIds, boolean atomic, List<PropertyMetadata> parameters)\`.
- Import rejects missing, blank, duplicate, and unknown owner IDs.

- [ ] **Step 1: Write failing metadata tests**

Add project-import fixtures for missing Function owners and unknown Action owners. Assert Demo \`CalculateDelayDays\` has only \`PurchaseOrder\` ownership and no \`poId\`; assert \`UpdateProductionSchedule\` has that same owner and \`atomic == false\`.

- [ ] **Step 2: Confirm failure**

Run: \`cd app/server && mvn -q -pl appsmith-server -am -Dtest=OntologyProjectImporterTest,OntologySnapshotRuntimeGatewayTest -Dsurefire.failIfNoSpecifiedTests=false test\`

Expected: FAIL because Functions have no owners and Actions still use a singular owner.

- [ ] **Step 3: Implement owner metadata**

Replace \`ActionTypeDTO.objectTypeId\` with owner list plus atomic flag; add owner list to \`FunctionDTO\`. Validate owner lists against project object types and map them to Runtime Gateway metadata. Update Demo YAML:

\`\`\`yaml
id: CalculateDelayDays
ownerObjectTypeIds: [PurchaseOrder]
parameters: []
\`\`\`

\`\`\`yaml
id: UpdateProductionSchedule
ownerObjectTypeIds: [PurchaseOrder]
atomic: false
\`\`\`

- [ ] **Step 4: Verify and commit**

Run Step 2 and expect PASS. Commit only modified metadata/importer/YAML/tests with \`feat(ontology): bind capabilities to object types\`.

**Gate:** Scoped reviewer confirms no code infers ownership from IDs or a legacy singular field.

### Task 2: Define and Validate Canonical Target Object Sets

**Files:**
- Create: \`app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyObjectSet.java\`
- Modify: \`app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java\`
- Modify: \`app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyQueryValidator.java\`
- Test: \`app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyActionConfigurationTest.java\`
- Test: \`app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyQueryValidatorTest.java\`

**Interfaces:**
- \`OntologyObjectSet(String objectTypeId, List<String> objectIds)\` rejects blank type/IDs, duplicates, empty lists, and more than \`MAX_TARGET_OBJECTS = 1000\`.
- Canonical definition is \`{ functionId|actionId, objectTypeId, target: { source: "SINGLE_OBJECT", objectId }, parameters }\`.
- Validator produces \`ValidatedCapabilityQuery(String capabilityId, String objectTypeId, OntologyObjectSet targets, Map<String,Object> parameters, boolean atomic)\`.

- [ ] **Step 1: Write failing tests**

Cover Builder and Advanced composition. Assert Advanced rejects \`functionId\`, \`actionId\`, \`objectTypeId\`, and \`atomic\`; missing target, unknown source, blank ID, incompatible owner, and 1001 IDs fail before runtime/client invocation. Assert PurchaseOrder \`SINGLE_OBJECT\` normalizes to \`new OntologyObjectSet("PurchaseOrder", List.of("PO002"))\`.

- [ ] **Step 2: Confirm failure**

Run: \`cd app/server && mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=OntologyActionConfigurationTest,OntologyQueryValidatorTest -Dsurefire.failIfNoSpecifiedTests=false test\`

Expected: FAIL because Function definitions omit targets and Action requires top-level \`objectId\`.

- [ ] **Step 3: Implement canonical boundary**

Add immutable Object Set. Builder composes selected owner/capability with target and parameters. Advanced parses only:

\`\`\`json
{"target":{"source":"SINGLE_OBJECT","objectId":"{{Table1.selectedRow.id}}"},"parameters":{}}
\`\`\`

Merge protected selector fields from controls only. Validate owner membership, normalize one target ID, and validate business parameters separately. Do not implement Table, Object Query, or Filter sources.

- [ ] **Step 4: Verify and commit**

Run Step 2 and expect PASS. Commit with \`feat(ontology): validate typed query targets\`.

**Gate:** Scoped reviewer proves malformed, cross-type, and over-limit targets fail before provider/HTTP invocation.

### Task 3: Execute Functions Against Target Context

**Files:**
- Modify: \`app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/dto/FunctionExecutionRequest.java\`
- Modify: \`app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/port/RuntimeProvider.java\`
- Modify: \`app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologySnapshotRuntimeGateway.java\`
- Modify: \`app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeDataProvider.java\`
- Modify: \`app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mock/MockRuntimeProvider.java\`
- Test: \`app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MongoRuntimeDataProviderTest.java\`
- Test: relevant Function plugin execution tests.

**Interfaces:**
- \`FunctionExecutionRequest(OntologyObjectSet targets, Map<String,Object> parameters)\`.
- \`executeFunction(providerId, snapshot, functionId, OntologyObjectSet targets, Map<String,Object> parameters)\` preserves target order.

- [ ] **Step 1: Write failing runtime tests**

Assert \`CalculateDelayDays\` reads delay days for \`ObjectSet<PurchaseOrder>(["PO002"])\`, rejects Supplier targets before Mongo lookup, and rejects a supplied \`poId\` as an unknown business parameter. Verify it does not fall back to Mock runtime.

- [ ] **Step 2: Confirm failure**

Run: \`cd app/server && mvn -q -pl appsmith-server,appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=MongoRuntimeDataProviderTest,OntologyFunctionLinkActionExecutorTest -Dsurefire.failIfNoSpecifiedTests=false test\`

Expected: FAIL because Function request carries parameters only and Mongo reads \`poId\`.

- [ ] **Step 3: Implement target-context execution**

Pass the validated Object Set through gateway and plugin. Mongo resolves PurchaseOrders in set order and returns a scalar for one target (a list for future multi-target use). The Demo Function has zero writable parameters.

- [ ] **Step 4: Verify and commit**

Run Step 2 and expect PASS. Commit with \`feat(ontology): run functions against object sets\`.

**Gate:** Scoped reviewer confirms \`poId\` is absent from metadata, definition, and runtime business parameters.

### Task 4: Evolve Replaceable Action Server Transport

**Files:**
- Modify: \`app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyActionServerProtocol.java\`
- Modify: \`app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyActionServerClient.java\`
- Modify: \`app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/actionserver/HttpOntologyActionServerClient.java\`
- Modify: \`app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/api/ActionExecutionService.java\`
- Modify: \`app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/handler/UpdateProductionScheduleHandler.java\`
- Test: Demo-server controller/service/handler tests and \`HttpOntologyActionServerClientTest\`.

**Interfaces:**
- \`ExecuteRequest\` replaces singular target fields with \`OntologyObjectSet targets\` and \`boolean atomic\`.
- \`ExecuteSuccess\` returns ordered \`List<TargetOutcome>\` with target, status, changes, optional error, and audit identity.
- Atomic Demo requests return \`ATOMIC_EXECUTION_UNSUPPORTED\` before handler mutation.

- [ ] **Step 1: Write failing protocol/client/server tests**

Assert serialized request contains \`"targets":{"objectTypeId":"PurchaseOrder","objectIds":["PO002"]}\` and \`"atomic":false\`. Assert non-atomic execution audits one outcome per target (including a missing target failure without hiding other results). Assert atomic execution never calls mutation/audit handlers.

- [ ] **Step 2: Confirm failure**

Run: \`cd app/server && mvn -q -pl demo-action-server,appsmith-server -am -Dtest=ActionExecutionServiceTest,UpdateProductionScheduleHandlerTest,HttpOntologyActionServerClientTest -Dsurefire.failIfNoSpecifiedTests=false test\`

Expected: FAIL because protocol/server use a singular \`objectId\`.

- [ ] **Step 3: Implement typed transport and outcomes**

Evolve local v1 protocol in lockstep. Serialize/deserialize Object Set plus atomic. Execute non-atomic targets in order and retain per-target audit/results. Reject atomic before handler dispatch because Demo server lacks whole-set transactions. Keep the HTTP client workspace-scoped and replaceable.

- [ ] **Step 4: Verify and commit**

Run Step 2 and expect PASS. Commit with \`feat(ontology): execute actions against object sets\`.

**Gate:** Scoped reviewer confirms atomic has no mutation path and errors remain native Query responses.

### Task 5: Wire Owner-Scoped Plugin Metadata and Execution

**Files:**
- Modify: \`app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java\`
- Modify: \`app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyQueryValidator.java\`
- Test: \`app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java\`
- Test: \`app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyActionConfigurationTest.java\`

**Interfaces:**
- \`ONTOLOGY_FUNCTIONS\` and \`ONTOLOGY_ACTIONS\` require \`objectTypeId\` and return owner-compatible capabilities only.
- Selected-capability parameter triggers require owner type and capability.
- Native execution consumes the validated Object Set and metadata atomic flag.

- [ ] **Step 1: Write failing plugin tests**

Assert Supplier selector excludes PurchaseOrder capabilities; parameter metadata rejects an owner/capability mismatch; Function and Action execution receive the normalized Object Set.

- [ ] **Step 2: Confirm failure**

Run: \`cd app/server && mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=OntologyFunctionLinkActionExecutorTest,OntologyActionConfigurationTest -Dsurefire.failIfNoSpecifiedTests=false test\`

Expected: FAIL because triggers are not owner-scoped and Action execution reads singular fields.

- [ ] **Step 3: Implement native wiring**

Require owner type for Function/Action metadata triggers, filter by owner list, and invoke provider/client only after validator success. Pass Action atomic from metadata, not form data. Map per-target outcomes to existing native Query response conventions.

- [ ] **Step 4: Verify and commit**

Run Step 2 and expect PASS. Commit with \`feat(ontology): scope capability queries by owner\`.

**Gate:** Scoped reviewer confirms plugin remains the sole execution entry point and metadata-incompatible targets cannot execute.

### Task 6: Deliver Shared Function and Action Builder/Advanced Editors

**Files:**
- Create: \`app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.ts\`
- Create: \`app/client/src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts\`
- Modify: \`app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.tsx\`
- Modify: \`app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts\`
- Modify: \`app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/function-query.json\`
- Modify: \`app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/action-query.json\`

**Interfaces:**
- Builder fields are \`objectTypeId\`, \`functionId|actionId\`, \`target\`, \`parameters\`, and \`queryMode\`.
- Advanced definition is exactly \`{ target: { source: "SINGLE_OBJECT", objectId: string }, parameters: Record<string,unknown> }\`.
- Owner/capability changes clear target and parameters; mode changes preserve them.

- [ ] **Step 1: Write failing pure and integration tests**

Test Function/Action serialization and hydration, invalid JSON, protected keys, blank object ID, and incompatible metadata. Test that mode switches preserve data while owner/capability changes cause exactly one target/parameter reset.

- [ ] **Step 2: Confirm failure**

Run: \`cd app/client && yarn test ontologyCapabilityQueryDefinition QueryModeSynchronizer --runInBand\`

Expected: FAIL because Function uses the old shape and Action remains a placeholder.

- [ ] **Step 3: Implement shared synchronizer and editor resources**

Implement strict operation-parameterized parsing/serialization/hydration. Editors present Object type, Function/Action, fixed \`SINGLE_OBJECT\` source, Object ID, then dynamic business parameters. Advanced JSON exposes only target/parameters. Include selected owner type in capability metadata requests and selected owner/capability in parameter requests. Follow existing conditional/i18n conventions.

- [ ] **Step 4: Verify and commit**

Run Step 2 and expect PASS, including existing Object Query coverage. Commit with \`feat(editor): configure capability object sets\`.

**Gate:** Scoped reviewer confirms Action is no longer a placeholder, both modes have identical semantics, and protected IDs cannot be edited in Advanced mode.

### Task 7: Integrated Regression, Deployment, and Isolated E2E Evidence

**Files:**
- Create: \`docs/superpowers/verification/2026-08-26-ontology-object-set-function-action.md\`
- Modify tracked deployment/configuration only when necessary. Never commit ignored local service/test-account files.

**Interfaces:**
- Consumes Tasks 1-6 and existing isolated E2E workspace/datasource pin.
- Produces focused automated evidence and browser/API evidence for Function success and Action error/audit behavior.

- [ ] **Step 1: Run focused suites serially**

Run:

\`\`\`bash
cd app/server && mvn -q -pl appsmith-server,appsmith-plugins/celanworksmithOntologyPlugin,demo-action-server -am -Dtest=OntologyProjectImporterTest,OntologySnapshotRuntimeGatewayTest,OntologyActionConfigurationTest,OntologyQueryValidatorTest,OntologyFunctionLinkActionExecutorTest,MongoRuntimeDataProviderTest,ActionExecutionServiceTest,UpdateProductionScheduleHandlerTest,HttpOntologyActionServerClientTest -Dsurefire.failIfNoSpecifiedTests=false test
cd app/client && yarn test ontologyCapabilityQueryDefinition QueryModeSynchronizer --runInBand
\`\`\`

Expected: PASS. Do not run memory-heavy repository-wide suites without a focused failure requiring them.

- [ ] **Step 2: Deploy after focused tests pass**

Use the repository's service procedure to build changed artifacts, restart \`cw-backend\` and \`cw-demo-action-server\`, and confirm \`cw-backend\`, \`cw-demo-action-server\`, \`cw-frontend\`, and \`cw-rts\` are active. Capture health evidence without credentials.

- [ ] **Step 3: Run isolated browser/API regression**

Using the dedicated E2E user/workspace/datasource, create a temporary app and verify owner-first Function selection, Builder target, Advanced hydration, \`CalculateDelayDays\` success, malformed/cross-type native Query error, owner-first Action selection, and non-atomic Action audit identity for the expected missing-production-order Demo-data error. Prove atomic no-mutation through focused server/API test. Keep the isolated account for repeatability unless an explicit recoverable cleanup target is known.

- [ ] **Step 4: Record outcomes and commit**

Record exact commands, results, service status, and the intentional successful-Action limitation caused by absent \`production_orders\` Demo data. Commit only this note with \`docs(ontology): record object set verification\`.

**Gate:** Final reviewer verifies all seven spec checks, atomic no-mutation evidence, and absence of local credentials/identifiers.

## Plan Self-Review

- Spec coverage: Tasks 1-6 cover owner-only metadata, typed homogeneous target sets, \`SINGLE_OBJECT\`, target-context Function execution, Action atomicity/auditing, owner-first Builder/Advanced UX, and native validation. Task 7 covers the seven required verifications.
- Deferred scope: no heterogeneous targets, global capabilities, Object Query/Table/Filter sources, scheduling, retry, progress, or broad Demo data.
- Placeholder scan: no deferred placeholders or unspecified implementation/test work.
- Type consistency: \`OntologyObjectSet\` is the sole runtime target. Canonical definitions use selected \`objectTypeId\` plus \`target\`; Advanced carries only \`target\` and \`parameters\`; Action atomicity comes only from metadata.
