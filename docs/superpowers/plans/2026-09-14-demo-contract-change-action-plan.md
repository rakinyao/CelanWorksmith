# Demo Contract Change Action Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish Demo Release 1.2.0 with one atomic `ApplyContractChange` Action and execute it safely through the existing Action Server v1 path against local Demo Runtime data.

**Architecture:** Extend the Release parser/model/mapper so immutable Release JSON becomes the single source of Action metadata. The existing Plugin validates a native `ACTION_QUERY`, then delegates to the workspace-scoped HTTP Action Server client. The Demo Action Server alone mutates Mongo in a transaction, persists audit/replay state, and returns native v1 outcomes.

**Tech Stack:** Java 21, Spring Boot/WebFlux, Reactive MongoDB transactions, PF4J plugin, JUnit 5/Mockito/Reactor Test, RFC 8785 JCS release digest, TypeScript/Jest only if metadata presentation requires a client change.

## Global Constraints

- Preserve `docs/superpowers/fixtures/ontology-model-release-demo-functions-1.1.0.json` unchanged; create immutable `1.2.0` rather than modifying an existing Release.
- Keep the native Appsmith datasource/query/action pipeline. Do not add client ontology execution state, direct Plugin Mongo writes, or an Action Widget.
- `ApplyContractChange` targets exactly one `contract`, has `atomic: true` and `requiresConfirmation: true`, and requires non-zero `DECIMAL changeAmount` plus non-blank `STRING changeReason`.
- The handler may update only `change_amount`, `current_amount`, and `latest_change_at`; `current_amount` must never become negative.
- Preserve user-facing application copy in English and route newly introduced client strings through i18n.
- This is a `DEMO_HANDLER`/Demo Action Server implementation. Keep Release schema and server pinning isolated for replacement after formal contracts are agreed.
- Never add local Demo Runtime records, `ref/`, old build snapshots, or local reports to Git.

## File Structure

| File | Responsibility |
| --- | --- |
| `.../ontology/release/OntologyModelRelease.java` | Typed Action element owned by the Release format. |
| `.../ontology/release/OntologyModelReleaseParser.java` | Strict Action element parsing, parameter validation, and digest verification. |
| `.../ontology/release/OntologyModelReleaseMapper.java` | Maps Release Action metadata into `OntologyProjectDefinition.actions`. |
| `.../ontology/dto/ActionTypeDTO.java` | Project Action metadata, including `maxItems` and confirmation hint. |
| `.../ontology/datasource/OntologyRuntimeSnapshotProjection.java` and `OntologyRuntimeGateway.java` | Carries Action target bound/confirmation metadata to plugin-triggered editor metadata. |
| `docs/superpowers/fixtures/ontology-model-release-demo-actions-1.2.0.json` | Immutable 1.2.0 fixture with Action metadata and canonical digest. |
| `.../OntologyQueryValidator.java` / `OntologyPlugin.java` | Applies Action target bounds and exposes Action metadata without a second execution path. |
| `demo-action-server/.../ActionExecutionService.java` | Executes a one-target atomic request transactionally while retaining existing non-atomic behavior. |
| `demo-action-server/.../ActionExecutionAuditDocument.java` | Retains an allow-listed business parameter summary for audit. |
| `demo-action-server/.../ApplyContractChangeHandler.java` | Validates and updates one Demo Runtime contract. |
| `docs/superpowers/verification/2026-09-14-demo-contract-change-action.md` | Reproducible automated/manual verification and reset procedure. |

---

### Task 1: Add Release 1.2.0 Action Contract and Mapping

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelRelease.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelReleaseParser.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelReleaseMapper.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/ActionTypeDTO.java`
- Create: `docs/superpowers/fixtures/ontology-model-release-demo-actions-1.2.0.json`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/release/OntologyModelReleaseParserTest.java`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/release/OntologyModelReleaseMapperTest.java`

**Interfaces:**
- Consumes: `OntologyModelRelease.Element`, `PropertyDTO`, and the 1.1.0 fixture.
- Produces: `OntologyModelRelease.Action(domain, name, version, displayName, ownerObjectTypeIds, maxItems, atomic, requiresConfirmation, parameters)` and `ActionTypeDTO(..., maxItems, parameters, requiresConfirmation)`.
- Release Action JSON `spec` must contain exactly `display_name`, `owner_object_type_ids`, `target`, `atomic`, `requires_confirmation`, and `parameters`. `target` contains exactly positive integral `max_items`. Each parameter contains `name`, `type`, `display_name`, `description`, and required/read-only/derived/enum/reference metadata using the same supported types and localized text rules as Release fields.

- [ ] **Step 1: Write failing parser and mapper tests**

Add tests which load `ontology-model-release-demo-actions-1.2.0.json`, assert its version is `1.2.0`, previous digest equals 1.1.0's digest, and mapper output has exactly one Action:

```java
assertThat(definition.actions()).singleElement().satisfies(action -> {
    assertThat(action.id()).isEqualTo("ApplyContractChange");
    assertThat(action.ownerObjectTypeIds()).containsExactly("contract");
    assertThat(action.maxItems()).isEqualTo(1);
    assertThat(action.atomic()).isTrue();
    assertThat(action.requiresConfirmation()).isTrue();
    assertThat(action.parameters()).extracting(PropertyDTO::id)
            .containsExactly("changeAmount", "changeReason");
});
```

Also mutate the fixture action `target.max_items` to `0` and assert the parser rejects it with the Action-target validation error.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
cd app/server
mvn -q -pl appsmith-server -am \
  -Dtest=OntologyModelReleaseParserTest,OntologyModelReleaseMapperTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: failure because Release Actions are currently rejected and mapped to an empty Action list.

- [ ] **Step 3: Implement strict Action Release parsing and mapping**

Add the Action element/model type and parser branch. Reuse field-type/localization validation for parameters but do not require entity runtime mappings. Map all Action fields into `ActionTypeDTO`; update every constructor/call site for the new `maxItems` field. Retain unsupported-kind rejection and existing Function behavior.

Create the 1.2.0 fixture by copying 1.1.0 unchanged, setting `release.version` to `1.2.0`, its `previous_release_digest` to the 1.1.0 digest, then appending:

```json
{
  "kind": "action",
  "domain": "business",
  "name": "ApplyContractChange",
  "version": "1.0.0",
  "spec": {
    "display_name": { "en-US": "Apply contract change", "zh-CN": "登记合同变更" },
    "owner_object_type_ids": ["contract"],
    "target": { "max_items": 1 },
    "atomic": true,
    "requires_confirmation": true,
    "parameters": [
      { "name": "changeAmount", "type": "decimal", "display_name": { "en-US": "Change amount", "zh-CN": "变更金额" }, "description": { "en-US": "Signed contract change amount.", "zh-CN": "本次合同变更金额，可正可负。" }, "required": true, "read_only": false, "derived": false, "enum_values": [] },
      { "name": "changeReason", "type": "string", "display_name": { "en-US": "Change reason", "zh-CN": "变更说明" }, "description": { "en-US": "Reason retained in the action audit record.", "zh-CN": "变更说明仅保存在操作审计中。" }, "required": true, "read_only": false, "derived": false, "enum_values": [] }
    ]
  }
}
```

Compute `release.release_digest` as SHA-256 of the JCS canonical document with only that member removed. Do not hand-edit an approximate digest.

- [ ] **Step 4: Run tests to verify GREEN**

Run the Step 2 command and confirm parser, mapper, existing release tests, and exact Action metadata pass.

- [ ] **Step 5: Commit**

```bash
git add app/server/appsmith-server docs/superpowers/fixtures/ontology-model-release-demo-actions-1.2.0.json
git commit -m "feat(ontology): publish demo contract change action"
```

### Task 2: Project Action Metadata Through Native Query Validation and Editor Metadata

**Files:**
- Modify: `app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyRuntimeGateway.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyRuntimeSnapshotProjection.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyQueryValidator.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyQueryValidatorTest.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java`

**Interfaces:**
- Consumes: Task 1 `ActionTypeDTO.maxItems`, `atomic`, `requiresConfirmation`.
- Produces: `OntologyRuntimeGateway.ActionMetadata(id, displayName, ownerObjectTypeIds, maxItems, atomic, parameters, requiresConfirmation)` and an Action `ValidatedCapabilityQuery` constrained by `maxItems`.

- [ ] **Step 1: Write failing validation/metadata tests**

Add tests proving an Action with `maxItems: 1` rejects an `OBJECT_SET`/multiple-ID target, accepts one `SINGLE_OBJECT` contract target, preserves `atomic: true` in the Action Server request, and exposes `maxItems: 1` plus `requiresConfirmation: true` in `ONTOLOGY_ACTIONS` trigger metadata.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am \
  -Dtest=OntologyQueryValidatorTest,OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: failure because Action metadata currently omits target bound and confirmation attributes.

- [ ] **Step 3: Implement metadata projection and bounded Action validation**

Extend `ActionMetadata` and snapshot projection with the two new fields. Make `validateActionQuery` use the shared `capabilityTarget(..., action.maxItems())` method so Action input follows the same typed ObjectSet rules as Functions; the Release 1.2 Action still accepts only one object due to `maxItems: 1`. Emit `maxItems`, `atomic`, and `requiresConfirmation` with Action dropdown metadata. Do not create an alternate client execution route or alter the saved definition shape.

- [ ] **Step 4: Run tests to verify GREEN**

Run the Step 2 command; verify legacy Action tests remain compatible by updating their fixture constructors with explicit defaults.

- [ ] **Step 5: Commit**

```bash
git add app/server/appsmith-interfaces app/server/appsmith-server app/server/appsmith-plugins/celanworksmithOntologyPlugin
git commit -m "feat(ontology): project action target metadata"
```

### Task 3: Make Single-Target Atomic Demo Action Execution Auditable and Transactional

**Files:**
- Modify: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/api/ActionExecutionService.java`
- Modify: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/audit/ActionExecutionAuditDocument.java`
- Modify: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/audit/ActionExecutionAuditStore.java`
- Modify: `app/server/demo-action-server/src/test/java/com/celanworksmith/demoactionserver/api/ActionExecutionServiceTest.java`
- Modify: `app/server/demo-action-server/src/test/java/com/celanworksmith/demoactionserver/audit/ActionExecutionAuditStoreTest.java`

**Interfaces:**
- Consumes: v1 `ExecuteRequest.atomic`, one-object target, and `parameters`.
- Produces: atomic requests with exactly one target are passed through one reactive Mongo transaction; audit records include a safe allow-listed `parameterSummary` map; non-atomic multi-target behavior remains unchanged.

- [ ] **Step 1: Write failing service/audit tests**

Add tests that an atomic single-target request invokes `transactionalOperator.transactional(...)`, creates one audit, dispatches once, and replays the same stored terminal result without a second dispatch. Add a test that atomic requests with more than one ID return `INVALID_REQUEST` before audit creation. Add audit mapping test that `parameterSummary` contains `changeReason` and `changeAmount` but does not serialize `context`.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
cd app/server
mvn -q -pl demo-action-server -am \
  -Dtest=ActionExecutionServiceTest,ActionExecutionAuditStoreTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: failure because all atomic requests are currently rejected and audit documents have no parameter summary.

- [ ] **Step 3: Implement the minimal atomic path**

Keep non-atomic `concatMap` execution unchanged. For `atomic: true`, require exactly one target and execute `createAndExecute` under the existing transaction operator; reject more than one ID with a declared `INVALID_REQUEST` failure. Retain existing idempotency lookup before handler dispatch. Add `parameterSummary` to audit documents and store only the handler-approved `changeAmount` and `changeReason` fields for `ApplyContractChange`; all other actions store an empty map. Keep failures and successful outcomes in the established v1 envelope.

- [ ] **Step 4: Run tests to verify GREEN**

Run the Step 2 command and confirm current non-atomic per-target behavior remains green.

- [ ] **Step 5: Commit**

```bash
git add app/server/demo-action-server
git commit -m "feat(demo): support atomic action audit execution"
```

### Task 4: Implement the Contract Change Demo Handler

**Files:**
- Create: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/handler/ApplyContractChangeHandler.java`
- Modify: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/config/DemoActionServerRequestProperties.java`
- Modify: `app/server/demo-action-server/src/main/resources/application.properties`
- Create: `app/server/demo-action-server/src/test/java/com/celanworksmith/demoactionserver/handler/ApplyContractChangeHandlerTest.java`
- Modify: `app/server/demo-action-server/src/test/java/com/celanworksmith/demoactionserver/api/ActionExecutionControllerTest.java`

**Interfaces:**
- Consumes: `ExecuteRequest(actionId="ApplyContractChange", targets=ObjectSet("contract", [id]), atomic=true, parameters)` and Task 3 transaction/audit behavior.
- Produces: one v1 `TargetOutcome` with changed object `contract` and changed properties `change_amount`, `current_amount`, `latest_change_at`.

- [ ] **Step 1: Write failing handler/controller tests**

Add handler tests for a positive amount and a negative amount, asserting Mongo `$set` writes exactly `properties.change_amount`, `properties.current_amount`, and `properties.latest_change_at`; assert changed-property values and target type `contract`. Add tests for missing object, zero/non-decimal amount, blank reason, and negative resulting `current_amount`, each with no write. Add controller test with the configured 1.2.0 pin and `atomic: true` verifying response outcomes and audit ID.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
cd app/server
mvn -q -pl demo-action-server -am \
  -Dtest=ApplyContractChangeHandlerTest,ActionExecutionControllerTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: failure because no handler is registered and the local request pin is not 1.2.0.

- [ ] **Step 3: Implement bounded contract mutation**

Implement `DemoActionHandler` with ID `ApplyContractChange`. Read one object from the Demo Runtime `contract` collection, parse stored decimal values without floating-point arithmetic, reject invalid values with stable declared domain codes, calculate new values using `BigDecimal`, and atomically `findAndModify` the three permitted properties. Use an injected `Clock` or server time source for an ISO-8601 `latest_change_at` value. Return exactly one successful v1 outcome. Extend request properties only as needed to configure the immutable Release 1.2.0 pin; do not accept wildcard projects, versions, or snapshots.

- [ ] **Step 4: Run tests to verify GREEN**

Run the Step 2 command, then run the Task 3 command to prove the handler works through the action service's atomic/idempotency path.

- [ ] **Step 5: Commit**

```bash
git add app/server/demo-action-server
git commit -m "feat(demo): apply contract change action"
```

### Task 5: Verify Release Import, Native Query, and Demo Recovery Workflow

**Files:**
- Create: `docs/superpowers/verification/2026-09-14-demo-contract-change-action.md`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/LocalReleaseJsonOntologyProjectImporterTest.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java`

**Interfaces:**
- Consumes: the 1.2.0 fixture, snapshot Action metadata, and Action Server v1 success/failure semantics from Tasks 1-4.
- Produces: automated importer/plugin evidence and a Chinese manual procedure that uses existing seed/reimport operations without committing runtime data.

- [ ] **Step 1: Write failing import/execution integration tests**

Add importer test asserting a local 1.2.0 import produces a pinned snapshot containing `ApplyContractChange`; add Plugin test that a valid saved `ACTION_QUERY` creates an Action Server request with `actionId`, contract ObjectSet, `atomic=true`, and exactly the two parameters. Add a test that a multiple-object target is rejected before resolving the Action Server.

- [ ] **Step 2: Run tests to verify RED**

Run:

```bash
cd app/server
mvn -q -pl appsmith-server,appsmith-plugins/celanworksmithOntologyPlugin -am \
  -Dtest=LocalReleaseJsonOntologyProjectImporterTest,OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: failure until Tasks 1-2 complete; after Tasks 1-2, this step becomes the regression gate for the combined import/execution contract.

- [ ] **Step 3: Record exact verification and reset steps**

Write the verification document in Chinese. It must state the fixture path, successful import expectation, Builder configuration, a positive and negative amount execution, explicit Contract Query refresh, audit ID inspection, repeated same-idempotency-key replay, rejected invalid cases, and the existing Demo Runtime reimport/reset method. State that no production data is used or exported.

- [ ] **Step 4: Run final focused verification**

Run:

```bash
cd app/client
yarn jest src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts src/components/formControls/CapabilityTargetBindingControl.test.tsx --runInBand --watch=false

cd ../server
mvn -q -pl appsmith-interfaces,appsmith-plugins/celanworksmithOntologyPlugin,demo-action-server -am \
  -Dtest=OntologyModelReleaseParserTest,OntologyModelReleaseMapperTest,LocalReleaseJsonOntologyProjectImporterTest,OntologyQueryValidatorTest,OntologyFunctionLinkActionExecutorTest,ActionExecutionServiceTest,ActionExecutionControllerTest,ApplyContractChangeHandlerTest \
  -Dsurefire.failIfNoSpecifiedTests=false test

git diff --check
```

Expected: all selected suites pass and the diff has no whitespace errors. If the known broad `appsmith-server` test-compilation environment errors recur, record them separately with their exact command and preserve focused module evidence.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/verification app/server/appsmith-server app/server/appsmith-plugins/celanworksmithOntologyPlugin
git commit -m "docs(ontology): verify demo contract change action"
```

## Plan Self-Review

- Spec coverage: Tasks 1-2 implement immutable Release 1.2.0 and native metadata/query validation; Tasks 3-4 implement atomic Demo Action Server write, audit, and idempotency; Task 5 covers import, native execution, manual refresh, and reset evidence.
- Placeholder scan: no deferred implementation placeholders are present; all Action IDs, fields, constraints, tests, and commands are concrete.
- Consistency: every task uses `ApplyContractChange`, `contract`, `changeAmount`, `changeReason`, `maxItems: 1`, `atomic: true`, and `requiresConfirmation: true`.
