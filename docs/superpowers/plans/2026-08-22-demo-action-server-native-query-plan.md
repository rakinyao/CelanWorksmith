# Demo Action Server and Native Query Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make native Ontology Action Queries execute one mutable Demo action through an independently deployable, replaceable HTTP Action Server, while making the Demo Mongo Function Query usable.

**Architecture:** Worksmith continues to validate and invoke native `ACTION_QUERY` actions. A workspace resolver supplies an HTTP implementation of `OntologyActionServerClient`; a separate Spring Boot Demo Action Server receives the versioned request, records an idempotent audit entry, and dispatches a small handler that mutates Demo Mongo data. Widgets remain unchanged and invoke saved Queries through their existing event actions. Mongo-backed Functions remain a read-only Runtime Provider responsibility.

**Tech Stack:** Java 25, Maven reactor, Spring Boot 3.5/WebFlux, Reactor, Reactive MongoDB, JUnit 5, Mockito, MockWebServer, PF4J Ontology plugin, Appsmith native Query/Widget actions.

## Global Constraints

- Preserve the native Appsmith datasource/query/action pipeline; introduce no `$actions`, Redux/Saga action state, or Action Widget.
- Action writes occur only in the independently deployable Demo Action Server, never in `OntologyPlugin` or `MongoRuntimeDataProvider`.
- The transport contract is versioned `v1`, workspace-scoped, and carries generated idempotency keys and audit IDs.
- UI copy remains English and follows existing i18n paths; this phase adds no user-facing UI.
- Demo data is intentionally mutable and extensible, but only `UpdateProductionSchedule` is implemented here.
- `CalculateDelayDays` is the only Mongo-backed Function added in this phase; unsupported Function IDs fail explicitly.
- Use focused Maven tests serially; do not concurrently run memory-heavy frontend or repository-wide suites.
- Keep the existing git identity `gavin <gavin@localhost>` and do not revert user changes.

---

## File Structure

| Path | Responsibility |
| --- | --- |
| `app/server/appsmith-interfaces/.../OntologyActionServerProtocol.java` | Public, serializable v1 HTTP request, success, and domain-error DTOs shared by client and Demo Server. |
| `app/server/appsmith-server/.../ontology/actionserver/HttpOntologyActionServerClient.java` | Converts `OntologyActionServerClient.Request` into v1 HTTP calls with bounded timeout and error mapping. |
| `app/server/appsmith-server/.../ontology/actionserver/WorkspaceActionServerProperties.java` | Binds explicit development workspace-to-endpoint configuration. |
| `app/server/demo-action-server/` | Independent Maven Spring Boot module: controller, audit/idempotency store, handler registry, Mongo mutation code, and its tests. |
| `app/server/appsmith-server/.../MongoRuntimeDataProvider.java` | Mongo-only override for `CalculateDelayDays`. |
| `docs/superpowers/verification/2026-08-22-demo-action-server-native-query.md` | Exact automated results, local service startup, and native Widget manual acceptance evidence. |
| `docs/migration/2026-08-19-windows11-wsl-migration.md` | Development service inventory and safe launch/restart instructions for the new local process. |

### Task 1: Define the Stable v1 Transport Contract

**Files:**
- Create: `app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyActionServerProtocol.java`
- Create: `app/server/appsmith-interfaces/src/test/java/com/celanworksmith/ontology/datasource/OntologyActionServerProtocolTest.java`

**Interfaces:**
- Consumes: `OntologyActionServerClient.Request` fields already constructed by the PF4J plugin.
- Produces: `OntologyActionServerProtocol.ExecuteRequest`, `ExecuteSuccess`, and `DomainFailure` for the HTTP client and the independent Demo Server.

- [ ] **Step 1: Write failing contract-value tests**

```java
@Test
void copiesMapsAndRequiresVersionedRequestIdentity() {
    var request = new OntologyActionServerProtocol.ExecuteRequest(
            "v1", "workspace-1", "project-1", "1.0.0", "datasource-1",
            "UpdateProductionSchedule", "PurchaseOrder", "PO001",
            Map.of("newScheduleDate", "2026-09-01"),
            Map.of("metadataSnapshotId", "snapshot-1"), "key-1");

    assertThat(request.contractVersion()).isEqualTo("v1");
    assertThat(request.parameters()).isUnmodifiable();
    assertThatThrownBy(() -> request.parameters().put("x", "y"))
            .isInstanceOf(UnsupportedOperationException.class);
}
```

- [ ] **Step 2: Run the contract test to verify it fails**

Run:
```bash
cd app/server
mvn -q -pl appsmith-interfaces -Dtest=OntologyActionServerProtocolTest test
```

Expected: compilation failure because `OntologyActionServerProtocol` does not exist.

- [ ] **Step 3: Implement immutable public DTOs**

```java
public final class OntologyActionServerProtocol {
    public static final String V1 = "v1";

    public record ExecuteRequest(
            String contractVersion, String workspaceId, String projectId,
            String projectVersion, String datasourceId, String actionId,
            String objectTypeId, String objectId, Map<String, Object> parameters,
            Map<String, Object> context, String idempotencyKey) {
        public ExecuteRequest {
            parameters = parameters == null ? Map.of() : Map.copyOf(parameters);
            context = context == null ? Map.of() : Map.copyOf(context);
        }
    }

    public record ChangedObject(String objectTypeId, String objectId) {}
    public record ChangedProperty(String objectTypeId, String objectId,
            String propertyId, Object newValue) {}
    public record ExecuteSuccess(String contractVersion, String auditId, String status,
            String message, List<ChangedObject> changedObjects,
            List<ChangedProperty> changedProperties) {}
    public record DomainFailure(String contractVersion, String auditId,
            String code, String message) {}
}
```

Require nonblank `contractVersion`, request identity fields, and `idempotencyKey` in the compact constructor. Use `List.copyOf` for successful response lists. Do not add authentication or progress fields.

- [ ] **Step 4: Extend tests for malformed identity and safe response values**

Add assertions that a blank action ID or idempotency key throws `IllegalArgumentException`, and that success/failure DTOs retain their audit ID and safe message exactly.

- [ ] **Step 5: Run the focused contract tests**

Run:
```bash
cd app/server
mvn -q -pl appsmith-interfaces -Dtest=OntologyActionServerProtocolTest test
```

Expected: PASS.

- [ ] **Step 6: Commit the contract**

```bash
git add app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyActionServerProtocol.java \
  app/server/appsmith-interfaces/src/test/java/com/celanworksmith/ontology/datasource/OntologyActionServerProtocolTest.java
git commit -m "feat(ontology): define action server v1 protocol"
```

### Task 2: Configure the Worksmith HTTP Client Per Workspace

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/actionserver/WorkspaceActionServerProperties.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/actionserver/HttpOntologyActionServerClient.java`
- Create: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/actionserver/HttpOntologyActionServerClientTest.java`
- Create: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/actionserver/WorkspaceActionServerPropertiesTest.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/CelanWorksmithConfiguration.java`
- Modify: `app/server/appsmith-server/src/main/resources/application-ce.properties`

**Interfaces:**
- Consumes: Task 1 protocol DTOs and `OntologyActionServerClient`.
- Produces: `WorkspaceActionServerConfigurationResolver` that returns a new `HttpOntologyActionServerClient` only for configured workspace IDs.

- [ ] **Step 1: Write failing adapter tests with MockWebServer**

```java
@Test
void postsTrustedRequestAndMapsSuccess() throws Exception {
    server.enqueue(new MockResponse().setResponseCode(200).setBody("""
      {"contractVersion":"v1","auditId":"audit-1","status":"SUCCEEDED",
       "message":"Production schedule updated.","changedObjects":[],"changedProperties":[]}
      """));

    StepVerifier.create(client.execute(request()))
            .assertNext(result -> assertThat(result.auditId()).isEqualTo("audit-1"))
            .verifyComplete();
    assertThat(server.takeRequest().getPath()).isEqualTo("/api/v1/actions/execute");
}
```

Also write tests for a v1 `DomainFailure` HTTP response mapping to `DomainException`, malformed JSON/a missing audit ID becoming an `IllegalStateException`, and a delayed response producing a timeout error. Use a short injected `Duration` in tests, not sleeps.

- [ ] **Step 2: Run the adapter test to verify it fails**

Run:
```bash
cd app/server
mvn -q -pl appsmith-server -am -Dtest=HttpOntologyActionServerClientTest -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: compilation failure because the adapter does not exist.

- [ ] **Step 3: Implement property binding, resolver, and HTTP mapping**

Bind `celanworksmith.action-server.workspaces` to `Map<String, Endpoint>`, where each `Endpoint` has a required absolute `url` and positive `timeoutMillis`. Configure `CelanWorksmithConfiguration` with `@EnableConfigurationProperties` and replace the unconditional failing resolver with:

```java
return workspaceId -> Optional.ofNullable(properties.getWorkspaces().get(workspaceId))
        .map(endpoint -> Mono.just(new HttpOntologyActionServerClient(webClient, endpoint)))
        .orElseGet(() -> Mono.error(new IllegalStateException(
                "Ontology Action Server is not configured for workspace: " + workspaceId)));
```

`HttpOntologyActionServerClient.execute` must build `ExecuteRequest(V1, ...)`, POST it to `/api/v1/actions/execute`, use `.timeout(Duration.ofMillis(endpoint.timeoutMillis()))`, map `2xx` only to a well-formed `ExecuteSuccess`, and map a declared domain-error response to `DomainException(message, auditId)`. Do not retry. Add disabled-by-default properties:

```properties
# Configure only the local workspace that should use the Demo Action Server.
# celanworksmith.action-server.workspaces.<workspace-id>.url=${CELANWORKSMITH_ACTION_SERVER_URL:}
# celanworksmith.action-server.workspaces.<workspace-id>.timeout-millis=3000
```

- [ ] **Step 4: Add resolver configuration tests**

Assert a configured `workspace-1` resolves to the HTTP client and an unknown workspace retains the existing “not configured” error. Assert a blank URL and nonpositive timeout fail startup/property validation rather than silently creating a client.

- [ ] **Step 5: Run focused server tests**

Run:
```bash
cd app/server
mvn -q -pl appsmith-server -am \
  -Dtest=HttpOntologyActionServerClientTest,WorkspaceActionServerPropertiesTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: PASS.

- [ ] **Step 6: Commit the Worksmith adapter**

```bash
git add app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/actionserver \
  app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/actionserver \
  app/server/appsmith-server/src/main/java/com/celanworksmith/CelanWorksmithConfiguration.java \
  app/server/appsmith-server/src/main/resources/application-ce.properties
git commit -m "feat(ontology): configure action server http client"
```

### Task 3: Create the Independently Deployable Demo Action Server

**Files:**
- Modify: `app/server/pom.xml`
- Create: `app/server/demo-action-server/pom.xml`
- Create: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/DemoActionServerApplication.java`
- Create: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/config/DemoActionServerProperties.java`
- Create: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/config/DemoActionServerMongoConfiguration.java`
- Create: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/api/ActionExecutionController.java`
- Create: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/api/ActionExecutionService.java`
- Create: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/audit/ActionExecutionAuditDocument.java`
- Create: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/audit/ActionExecutionAuditStore.java`
- Create: `app/server/demo-action-server/src/test/java/com/celanworksmith/demoactionserver/api/ActionExecutionControllerTest.java`
- Create: `app/server/demo-action-server/src/test/java/com/celanworksmith/demoactionserver/audit/ActionExecutionAuditStoreTest.java`
- Create: `app/server/demo-action-server/src/main/resources/application.properties`

**Interfaces:**
- Consumes: Task 1 v1 protocol only, plus Mongo collections in `celanworksmith_runtime`.
- Produces: `POST /api/v1/actions/execute`, deterministic idempotency/audit persistence, and a standalone bootable artifact. It must not import Appsmith Server or Plugin classes.

- [ ] **Step 1: Add failing web/audit tests**

Write a `@WebFluxTest(ActionExecutionController.class)` test that posts a valid `ExecuteRequest` and asserts JSON `contractVersion: "v1"`, `auditId`, `status: "SUCCEEDED"`, and the changed lists. Use a mocked `ActionExecutionService` for controller serialization and error mapping. Write an audit-store test against mocked `ReactiveMongoTemplate` asserting these persisted values:

```java
new ActionExecutionAuditDocument(
        "audit-1", "key-1", "workspace-1", "project-1", "1.0.0",
        "datasource-1", "UpdateProductionSchedule", "PurchaseOrder", "PO001",
        Instant.parse("2026-08-22T00:00:00Z"), null, "RUNNING", null, List.of(), List.of())
```

The test must assert that looking up `key-1` occurs before a new audit is inserted.

- [ ] **Step 2: Run the new module tests to verify they fail**

Run:
```bash
cd app/server
mvn -q -pl demo-action-server -am \
  -Dtest=ActionExecutionControllerTest,ActionExecutionAuditStoreTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: Maven reports that module `demo-action-server` does not exist.

- [ ] **Step 3: Add the reactor module and minimal Spring Boot process**

Add `<module>demo-action-server</module>` after `appsmith-interfaces` in the root reactor. Its POM depends on `com.appsmith:interfaces`, `spring-boot-starter-webflux`, `spring-boot-starter-data-mongodb-reactive`, and Spring Boot test dependencies, and configures `spring-boot-maven-plugin`.

Implement `DemoActionServerApplication` with component scanning rooted at `com.celanworksmith.demoactionserver`. Bind these properties:

```properties
server.address=${DEMO_ACTION_SERVER_ADDRESS:127.0.0.1}
server.port=${DEMO_ACTION_SERVER_PORT:8092}
celanworksmith.demo-action-server.mongo.uri=${CELANWORKSMITH_RUNTIME_MONGODB_URI:mongodb://localhost:27017}
celanworksmith.demo-action-server.mongo.database=${CELANWORKSMITH_RUNTIME_MONGODB_DATABASE:celanworksmith_runtime}
```

Construct an isolated `ReactiveMongoTemplate` and `TransactionalOperator` from
those properties. The existing local Mongo deployment is a replica set, so
`ActionExecutionService` must execute the handler write and terminal audit
update inside that reactive transaction. Do not reuse Appsmith Server’s Spring
context.

- [ ] **Step 4: Implement controller and audit/idempotency state machine**

Implement the controller endpoint and an `ActionExecutionService` with this exact branching order:

```text
validate v1 request identity
  -> find audit by idempotencyKey
       -> terminal audit: return stored success or DomainFailure unchanged
       -> RUNNING audit: return HTTP 409 DomainFailure(code=ACTION_IN_PROGRESS, auditId)
       -> absent: insert RUNNING audit with generated auditId
  -> invoke registered handler
       -> persist SUCCEEDED and safe result summary; return ExecuteSuccess
       -> persist FAILED and safe DomainFailure; return declared domain error
```

Create a unique Mongo index on `idempotencyKey`; on duplicate insert, re-read the record and apply the same terminal/RUNNING branch. The controller returns `200` for `ExecuteSuccess`, `422` for handler/validation domain failure, `409` for `ACTION_IN_PROGRESS`, and `500` only for unexpected server errors. An unexpected error updates the audit to `FAILED` with the safe message `Action execution failed.` before returning `500`; it exposes no internal exception text. Every domain response after audit creation includes its audit ID.

- [ ] **Step 5: Run the focused Demo Server tests**

Run:
```bash
cd app/server
mvn -q -pl demo-action-server -am \
  -Dtest=ActionExecutionControllerTest,ActionExecutionAuditStoreTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: PASS.

- [ ] **Step 6: Commit the independent server skeleton**

```bash
git add app/server/pom.xml app/server/demo-action-server
git commit -m "feat(demo): add action server process and audit store"
```

### Task 4: Implement the Demo Production-Schedule Handler

**Files:**
- Create: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/handler/DemoActionHandler.java`
- Create: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/handler/DemoActionHandlerRegistry.java`
- Create: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/handler/UpdateProductionScheduleHandler.java`
- Create: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/runtime/DemoRuntimeObjectDocument.java`
- Create: `app/server/demo-action-server/src/test/java/com/celanworksmith/demoactionserver/handler/UpdateProductionScheduleHandlerTest.java`
- Modify: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/api/ActionExecutionService.java`
- Modify: `app/server/demo-action-server/src/main/java/com/celanworksmith/demoactionserver/audit/ActionExecutionAuditStore.java`

**Interfaces:**
- Consumes: Task 1 `ExecuteRequest` and Task 3 `ActionExecutionService` state machine.
- Produces: an `UpdateProductionSchedule` handler that updates the referenced `ProductionOrder` and returns `ExecuteSuccess` summaries.

- [ ] **Step 1: Write failing handler tests**

```java
@Test
void updatesReferencedProductionOrderAndReportsChangedProperties() {
    when(template.findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("purchase_orders")))
            .thenReturn(Mono.just(purchaseOrder("PO001", "PR001")));
    when(template.findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("production_orders")))
            .thenReturn(Mono.just(productionOrder("PR001", "2026-09-01", "RESCHEDULED")));

    StepVerifier.create(handler.execute(request("PO001", "2026-09-01")))
            .assertNext(result -> assertThat(result.changedProperties()).contains(
                    new ChangedProperty("ProductionOrder", "PR001", "scheduleDate", "2026-09-01")))
            .verifyComplete();
}
```

Also test unknown action registry lookup, wrong target type, missing/blank `newScheduleDate`, absent PurchaseOrder, absent `productionOrderId`, and absent ProductionOrder. Assert each becomes a domain failure and invokes no write when validation fails.

- [ ] **Step 2: Run handler tests to verify they fail**

Run:
```bash
cd app/server
mvn -q -pl demo-action-server -am \
  -Dtest=UpdateProductionScheduleHandlerTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: compilation failure because the handler/registry do not exist.

- [ ] **Step 3: Implement explicit action dispatch and atomic mutation**

Define:

```java
public interface DemoActionHandler {
    String actionId();
    Mono<OntologyActionServerProtocol.ExecuteSuccess> execute(
            OntologyActionServerProtocol.ExecuteRequest request, String auditId);
}
```

The registry maps `actionId()` to exactly one handler and emits `UNKNOWN_ACTION` for no match. `UpdateProductionScheduleHandler` requires `actionId == "UpdateProductionSchedule"`, `objectTypeId == "PurchaseOrder"`, and nonblank `newScheduleDate`; it reads `purchase_orders` by `_id`, reads `productionOrderId` from properties, then uses `findAndModify` on `production_orders` to set `properties.scheduleDate` and `properties.status = "RESCHEDULED"`. Return only `ProductionOrder` changed-object/property summaries and the English message `Production schedule updated.`.

Use the `TransactionalOperator` created in Task 3 so the ProductionOrder mutation and terminal audit update commit together on the local replica set. Do not modify the target PurchaseOrder unless its action definition later explicitly requires it.

- [ ] **Step 4: Wire handler result and failure persistence**

Have `ActionExecutionService` use the registry, store the terminal success lists/message, and convert handler validation/object-not-found failures into the v1 `DomainFailure` with stable codes such as `INVALID_ACTION_REQUEST`, `TARGET_NOT_FOUND`, and `RELATED_OBJECT_NOT_FOUND`. Confirm the audit changes to `FAILED` before returning the failure.

- [ ] **Step 5: Run handler and Demo Server regression tests**

Run:
```bash
cd app/server
mvn -q -pl demo-action-server -am \
  -Dtest=ActionExecutionControllerTest,ActionExecutionAuditStoreTest,UpdateProductionScheduleHandlerTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: PASS.

- [ ] **Step 6: Commit the Demo mutation handler**

```bash
git add app/server/demo-action-server
git commit -m "feat(demo): execute production schedule action"
```

### Task 5: Make `CalculateDelayDays` Read from Mongo Demo Data

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeDataProvider.java`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MongoRuntimeDataProviderTest.java`

**Interfaces:**
- Consumes: the pinned `OntologyProjectDefinition`, `FunctionExecutionRequest`, and existing Mongo object mapping.
- Produces: `Mono<Object>` from `executeFunction(definition, "CalculateDelayDays", request)` without falling back to `MockDataStore`.

- [ ] **Step 1: Write failing Mongo Function tests**

```java
@Test
void calculatesDelayDaysFromPinnedMongoPurchaseOrder() {
    when(template.findOne(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
            .thenReturn(Mono.just(document("PO001", "DELAYED", 4)));

    StepVerifier.create(provider.executeFunction(
                    RuntimeProviderTestFixtures.binding().project(),
                    "CalculateDelayDays", new FunctionExecutionRequest(Map.of("poId", "PO001"))))
            .expectNext(4)
            .verifyComplete();
}
```

Add tests that `poId` is required, a missing Mongo object fails, and an unknown function ID fails without calling the inherited mock provider.

- [ ] **Step 2: Run the Function test to verify it fails**

Run:
```bash
cd app/server
mvn -q -pl appsmith-server -am \
  -Dtest=MongoRuntimeDataProviderTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: the test fails because the inherited implementation reads the empty `MockDataStore`.

- [ ] **Step 3: Implement the provider override**

Override `executeFunction(OntologyProjectDefinition definition, String functionId, FunctionExecutionRequest request)`. Require a nonnull definition and `poId`, resolve `PurchaseOrder` through the pinned definition, fetch the Mongo document from its resolved collection, and convert `properties.delayDays` to the integer return value. Return explicit `CelanWorksmithException` errors for unsupported IDs, missing input, missing object, or invalid nonnumeric delay data. Do not call `super.executeFunction` in this override.

- [ ] **Step 4: Run focused runtime provider tests**

Run:
```bash
cd app/server
mvn -q -pl appsmith-server -am \
  -Dtest=MongoRuntimeDataProviderTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: PASS.

- [ ] **Step 5: Commit the Mongo Function support**

```bash
git add app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeDataProvider.java \
  app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MongoRuntimeDataProviderTest.java
git commit -m "fix(ontology): execute demo function from mongo"
```

### Task 6: Verify Native Query Integration and Development Operation

**Files:**
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java`
- Create: `scripts/migration/cw-demo-action-server.service`
- Modify: `docs/migration/2026-08-19-windows11-wsl-migration.md`
- Create: `docs/superpowers/verification/2026-08-22-demo-action-server-native-query.md`

**Interfaces:**
- Consumes: Tasks 1-5 and existing `OntologyPlugin.OntologyPluginExecutor` behavior.
- Produces: regression evidence that plugin results remain native Query results, plus reproducible local startup and manual checks.

- [ ] **Step 1: Extend the plugin regression test before deployment**

Add a test using the existing `RecordingActionServer` that returns a v1-shaped body:

```java
actionServer.response = new OntologyActionServerClient.Result(
        Map.of("status", "SUCCEEDED", "message", "Production schedule updated.",
               "changedObjects", List.of(Map.of("objectTypeId", "ProductionOrder", "objectId", "PR001"))),
        "audit-123");

ActionExecutionResult result = execute(gateway, actionServer, "ACTION_QUERY", definition);
assertTrue(result.getIsExecutionSuccess());
assertEquals("audit-123", ((Map<?, ?>) result.getBody()).get("auditId"));
assertEquals("SUCCEEDED", ((Map<?, ?>) result.getBody()).get("status"));
```

Keep the existing domain failure and malformed audit-ID tests. Add no Widget tests or alternate execution state: their absence is intentional and asserted by unchanged native Query behavior.

- [ ] **Step 2: Run the plugin test to verify the regression test passes after Tasks 1-5**

Run:
```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am \
  -Dtest=OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: PASS. The body contains Action Server response fields plus `auditId`; no direct Mongo client is introduced into the plugin.

- [ ] **Step 3: Add a tracked development service template**

Create `scripts/migration/cw-demo-action-server.service` with `WorkingDirectory=/home/gavin/workspace/projects/CelanWorksmith/app/server`, a Java/Maven launch command for the `demo-action-server` module, `DEMO_ACTION_SERVER_PORT=8092`, and `Restart=on-failure`. Order it after network and Mongo availability; make `cw-backend.service` depend on it only after the local workspace endpoint is configured. Do not commit host-specific `.env` files.

- [ ] **Step 4: Deploy and check services serially**

Install the template into `~/.config/systemd/user/cw-demo-action-server.service`, then run:

```bash
systemctl --user daemon-reload
systemctl --user enable --now cw-demo-action-server
systemctl --user restart cw-backend
systemctl --user status cw-demo-action-server cw-backend --no-pager
curl -fsS http://127.0.0.1:8092/actuator/health
curl -fsS http://127.0.0.1:8081/api/v1/health
```

Expected: both health checks return success. If the workspace endpoint has not been configured, Actions must fail with the existing “not configured” error rather than silently using a default server.

- [ ] **Step 5: Perform and record native manual acceptance**

Write the verification document with exact commands/results and this manual flow:

1. In a fresh or existing app, create an Ontology `ACTION_QUERY` for `UpdateProductionSchedule`, target a seeded PurchaseOrder, and pass a valid `newScheduleDate`.
2. Trigger it from an existing Button, Table row event, or Form submit with `{{ActionQuery.run()}}`; confirm normal Query loading/result state includes `auditId`, message, and changed ProductionOrder summary.
3. Explicitly run the related Object Query and verify the ProductionOrder’s `scheduleDate` and `status` changed.
4. Submit a missing/invalid date and an absent target; confirm native Query errors include an audit ID where applicable and that Mongo records did not change.
5. Run `CalculateDelayDays` for a seeded PurchaseOrder and confirm its scalar result equals `delayDays` in Mongo.
6. Repeat an identical request through the service test/client with the same idempotency key; confirm only one mutation and the stored terminal result. Confirm an in-progress key returns `ACTION_IN_PROGRESS`.

Update the migration document service table and recovery instructions to include port `8092` and `cw-demo-action-server`. State that it is development-only and that future public Action Servers replace it through workspace configuration.

- [ ] **Step 6: Run final focused verification and commit documentation**

Run, one command at a time:
```bash
cd app/server
mvn -q -pl appsmith-interfaces,appsmith-server,demo-action-server,appsmith-plugins/celanworksmithOntologyPlugin -am \
  -Dtest=OntologyActionServerProtocolTest,HttpOntologyActionServerClientTest,WorkspaceActionServerPropertiesTest,ActionExecutionControllerTest,ActionExecutionAuditStoreTest,UpdateProductionScheduleHandlerTest,MongoRuntimeDataProviderTest,OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
git diff --check
git status --short
```

Expected: all selected tests pass, no whitespace errors, and only intended files are modified. Then commit:

```bash
git add app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java \
  scripts/migration/cw-demo-action-server.service \
  docs/migration/2026-08-19-windows11-wsl-migration.md \
  docs/superpowers/verification/2026-08-22-demo-action-server-native-query.md
git commit -m "docs: verify demo action server workflow"
```

## Plan Self-Review

- Spec coverage: Tasks 1-4 implement the replaceable v1 Action Server boundary, Demo audit/idempotency, and the one mutable Demo action; Task 5 addresses the Mongo Function gap; Task 6 preserves native Query/Widget usage and records deployment/manual evidence.
- Scope: bulk data generation, Supplier lead-time workflows, async execution, retries, authorization, progress, automatic invalidation, legacy Builder state, and an Action Widget are explicitly absent.
- Consistency: all transport code uses `OntologyActionServerProtocol.V1`, `POST /api/v1/actions/execute`, `UpdateProductionSchedule`, `PurchaseOrder`, `newScheduleDate`, and `auditId` consistently.
