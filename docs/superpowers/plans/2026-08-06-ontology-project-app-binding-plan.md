# T-Foundation Ontology Project 与 App 绑定 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) to implement this plan task-by-task with review checkpoints. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立可版本化的 Ontology Project 导入与 App 绑定能力，并使用独立 MongoDB 只读运行时 Provider 走通“创建 App、绑定本体、读取并展示本体数据”的开发态闭环。

**Architecture:** YAML ZIP 工程包经过校验后导入独立的 `celanworksmith_ontology` Registry；App 只保存 `projectId + projectVersion + providerId` 绑定，不复制本体定义。编辑器通过绑定解析 Ontology Provider 和 RuntimeDataProvider，MongoDB 只读数据库 `celanworksmith_runtime` 模拟未来唯一只读数据源，Widget 继续消费 `$objects` DataTree。

**Tech Stack:** Spring Boot WebFlux、Spring Data Reactive MongoDB、Jackson YAML、React/Redux/Redux-Saga、TypeScript、Jest、JUnit 5、MongoDB、现有 Appsmith Application ACL。

## Global Constraints

- YAML 是交换和版本管理格式，不是生产运行时数据源。
- Ontology Project Registry、Runtime Data Provider 和 Action Provider 必须保持独立边界。
- Runtime 数据使用独立 MongoDB 数据库 `celanworksmith_runtime`，Registry 和 Binding 使用 `celanworksmith_ontology`。
- Widget 不直接访问 Project API、MongoDB 或集合名，只消费现有 DataTree 和 Object Query Layer。
- 已绑定的 `projectId + version` 不可变；修改定义必须生成新版本。
- 旧 App、未绑定 App、原生 Query、`$objects`、`$functions`、`$actions` 和 `$variables` 必须保持兼容。
- 不实现 T9 发布快照、发布校验、真实只读平台同步和生产 Action Server。
- 不执行 `git reset --hard`、`git checkout --`、提交或覆盖工作区中既有 T5-T8 变更。
- 每个任务必须先补定向测试，再实现，再运行该任务的独立验证命令。

---

## 任务范围与依赖

```text
Task 1 YAML 契约与导入器
          |
          v
Task 2 Registry 与 Project API
          |
          +--> Task 3 App Binding API
          |          |
          v          v
Task 4 Mongo Runtime Provider
          |
          v
Task 5 前端绑定与编辑器加载
          |
          v
Task 6 端到端验收与文档
```

Task 1、Task 2、Task 3、Task 4 主要是后端边界，必须按顺序合并到当前工作区；Task 5 依赖后端 API 契约；Task 6 只在前五项通过后执行。

## Task 1: YAML 工程契约与导入器

**目标：** 用可测试的 Java 模型表示 Ontology Project，并从安全的 ZIP 工程包解析出规范化定义。

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/project/OntologyProjectDefinition.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/project/OntologyProjectManifest.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/project/OntologyProjectYamlImporter.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/project/OntologyProjectValidator.java`
- Modify: `app/server/appsmith-server/pom.xml`
- Create: `app/server/appsmith-server/src/main/resources/celanworksmith/ontology-projects/celanworksmith-demo/ontology.yaml`
- Create: `app/server/appsmith-server/src/main/resources/celanworksmith/ontology-projects/celanworksmith-demo/objects/Supplier.yaml`
- Create: `app/server/appsmith-server/src/main/resources/celanworksmith/ontology-projects/celanworksmith-demo/objects/PurchaseOrder.yaml`
- Create: `app/server/appsmith-server/src/main/resources/celanworksmith/ontology-projects/celanworksmith-demo/links/supplier_orders.yaml`
- Create: `app/server/appsmith-server/src/main/resources/celanworksmith/ontology-projects/celanworksmith-demo/functions/CalculateDelayDays.yaml`
- Create: `app/server/appsmith-server/src/main/resources/celanworksmith/ontology-projects/celanworksmith-demo/actions/UpdateProductionSchedule.yaml`
- Create: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/project/OntologyProjectZipFixtures.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/project/OntologyProjectYamlImporterTest.java`
- Test: `app/server/appsmith-server/src/test/resources/celanworksmith/ontology-projects/invalid-path/ontology.yaml`

**Interfaces:**
- `OntologyProjectYamlImporter.importZip(InputStream zip)` returns `OntologyProjectDefinition` or a structured `CelanWorksmithException`.
- `OntologyProjectValidator.validate(OntologyProjectDefinition definition)` returns a list of validation errors and rejects invalid definitions before persistence.
- `OntologyProjectDefinition` exposes `projectId`, `version`, `schemaVersion`, normalized `ObjectTypeDTO`, `LinkTypeDTO`, `FunctionDTO`, and `ActionTypeDTO` collections.
- `OntologyProjectZipFixtures.validZip()` and `OntologyProjectZipFixtures.zipWithEntry(String path, String content)` create deterministic in-memory ZIP streams for tests; they are test-only and never used by production code.

- [ ] **Step 1: Add failing importer tests** for a valid demo Project, duplicate IDs, missing indexed file, invalid Object/Link reference, unsupported schema version, and `../` ZIP entry traversal.

```java
@Test
void rejectsZipEntryOutsideProjectRoot() {
    InputStream zip = OntologyProjectZipFixtures.zipWithEntry("../escape.yaml", "x");

    assertThatThrownBy(() -> importer.importZip(zip))
        .isInstanceOf(CelanWorksmithException.class)
        .hasMessageContaining("PROJECT_PATH_INVALID");
}
```

- [ ] **Step 2: Run the importer test and confirm it fails**.

Run: `cd app/server && mvn -pl appsmith-server -Dtest=OntologyProjectYamlImporterTest test`

Expected: FAIL because the importer classes and YAML dependency do not exist.

- [ ] **Step 3: Add YAML parsing and normalized domain models** using `jackson-dataformat-yaml` with the version inherited from the Appsmith dependency management.

The importer must read only files listed by `ontology.yaml`, reject absolute paths and `..`, require `schemaVersion: 1`, validate unique IDs, validate Link source/target Object IDs, and map Object Properties to the existing DTO data types.

- [ ] **Step 4: Add the demo YAML Project** with the current `Supplier`, `PurchaseOrder`, `supplier_orders`, `CalculateDelayDays`, and `UpdateProductionSchedule` definitions. Keep runtime fixture data out of these files.

- [ ] **Step 5: Run the importer tests and confirm they pass**.

Run: `cd app/server && mvn -pl appsmith-server -Dtest=OntologyProjectYamlImporterTest test`

Expected: all importer tests pass with invalid packages rejected before any persistence call.

## Task 2: Ontology Registry 与 Project API

**目标：** 将导入后的规范化 Project 保存到独立 MongoDB 数据库，并提供列表、版本查询和 ZIP 导入 API。

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/persistence/CelanworksmithMongoProperties.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/persistence/CelanworksmithMongoConfiguration.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/persistence/OntologyProjectDocument.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/persistence/OntologyProjectSummary.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/persistence/OntologyProjectRegistry.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/persistence/MongoOntologyProjectRegistry.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/service/OntologyProjectService.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/controller/OntologyProjectController.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/CelanWorksmithConfiguration.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/bootstrap/OntologyProjectBootstrap.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/OntologyProjectControllerTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/MongoOntologyProjectRegistryTest.java`

**Interfaces:**
- `OntologyProjectRegistry.list()` returns `Flux<OntologyProjectSummary>`.
- `OntologyProjectRegistry.find(String projectId, String version)` returns `Mono<OntologyProjectDefinition>`.
- `OntologyProjectRegistry.save(OntologyProjectDefinition definition)` rejects an existing `projectId + version` and returns the saved definition.
- `OntologyProjectService.importZip(Part file)` returns `Mono<OntologyProjectSummary>`.
- `OntologyProjectService.get(String projectId, String version)` returns `Mono<OntologyProjectDefinition>`.

- [ ] **Step 1: Add failing service and controller tests** for listing the demo Project, importing a valid ZIP, rejecting a duplicate version, returning a structured not-found error, and refusing an invalid Project.

```java
webTestClient.post()
    .uri("/api/v1/celanworksmith/ontology/projects/import")
    .contentType(MediaType.MULTIPART_FORM_DATA)
    .body(BodyInserters.fromMultipartData("file", OntologyProjectZipFixtures.validZip()))
    .exchange()
    .expectStatus().isCreated();
```

- [ ] **Step 2: Run the focused backend tests and confirm they fail**.

Run: `cd app/server && mvn -pl appsmith-server -Dtest='com.celanworksmith.ontology.OntologyProjectControllerTest,com.celanworksmith.ontology.MongoOntologyProjectRegistryTest' test`

Expected: FAIL because the Registry, controller and Mongo configuration are not implemented.

- [ ] **Step 3: Configure the isolated reactive Mongo template** with properties `celanworksmith.ontology.registry.uri` and `celanworksmith.ontology.registry.database`, defaulting to `mongodb://localhost:27017` and `celanworksmith_ontology`.

The configuration must use a qualified client/template and must not replace Appsmith's default Mongo template. Registry documents must use a unique index over `projectId` and `version`.

- [ ] **Step 4: Implement the Registry and service** so import validates first, stores an immutable normalized definition, and returns a summary without exposing internal persistence fields.

- [ ] **Step 5: Add the Project controller** with these endpoints:

```text
GET  /api/v1/celanworksmith/ontology/projects
GET  /api/v1/celanworksmith/ontology/projects/{projectId}/versions
GET  /api/v1/celanworksmith/ontology/projects/{projectId}/versions/{version}
POST /api/v1/celanworksmith/ontology/projects/import
```

All endpoints must use the existing `ResponseDTO` and `CelanWorksmithExceptionHandler` error shape.

- [ ] **Step 6: Bootstrap the demo Project** from `src/main/resources/celanworksmith/ontology-projects/celanworksmith-demo` only when the configured Registry does not already contain `celanworksmith-demo:1.0.0`; bootstrap must be idempotent.

- [ ] **Step 7: Run focused backend tests and confirm they pass**.

Run: `cd app/server && mvn -pl appsmith-server -Dtest='com.celanworksmith.ontology.OntologyProjectControllerTest,com.celanworksmith.ontology.MongoOntologyProjectRegistryTest' test`

Expected: all tests pass and duplicate imports do not overwrite an existing version.

## Task 3: App Binding 服务

**目标：** 为 App 保存和解析 `projectId + projectVersion + providerId`，并复用 Appsmith Application ACL。

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/application/CelanworksmithApplicationBinding.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/application/CelanworksmithApplicationBindingRequest.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/application/CelanworksmithApplicationBindingDocument.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/application/CelanworksmithApplicationBindingRepository.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/application/CelanworksmithApplicationBindingService.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/application/CelanworksmithApplicationBindingResolver.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/application/CelanworksmithApplicationBindingController.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/context/CelanworksmithOntologyContext.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/adapter/project/OntologyProjectBackedProvider.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/port/OntologyProvider.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/controller/OntologyController.java`
- Create: `app/server/appsmith-server/src/test/java/com/celanworksmith/application/CelanworksmithApplicationBindingControllerTest.java`
- Create: `app/server/appsmith-server/src/test/java/com/celanworksmith/application/CelanworksmithApplicationBindingServiceTest.java`

**Interfaces:**
- `CelanworksmithApplicationBindingService.get(String applicationId)` returns `Mono<CelanworksmithApplicationBinding>` or an explicit unbound empty result.
- `CelanworksmithApplicationBindingService.bind(String applicationId, CelanworksmithApplicationBindingRequest request)` validates Project existence, then upserts one binding record.
- `CelanworksmithApplicationBindingService.unbind(String applicationId)` deletes only the binding record.
- `CelanworksmithApplicationBindingResolver.resolve(String applicationId)` returns the bound `OntologyProjectDefinition` and `providerId` for Ontology/Runtime requests.
- `CelanworksmithOntologyContext` contains `applicationId` and an explicit `legacyDefault` flag for old tests only.

- [ ] **Step 1: Add failing tests** for unbound App, valid binding, invalid Project version, duplicate binding update, read permission, edit permission, and unbind.

```java
webTestClient.put()
    .uri("/api/v1/celanworksmith/applications/app-1/ontology-binding")
    .bodyValue(new CelanworksmithApplicationBindingRequest("celanworksmith-demo", "1.0.0", "mongodb-readonly"))
    .exchange()
    .expectStatus().isOk();
```

- [ ] **Step 2: Run binding tests and confirm they fail**.

Run: `cd app/server && mvn -pl appsmith-server -Dtest='com.celanworksmith.application.CelanworksmithApplicationBindingControllerTest,com.celanworksmith.application.CelanworksmithApplicationBindingServiceTest' test`

Expected: FAIL because the binding model, resolver and endpoints are not present.

- [ ] **Step 3: Implement the binding document and repository** in `celanworksmith_ontology`, using a unique index on `applicationId`.

- [ ] **Step 4: Implement ACL checks** by resolving the App with `ApplicationService.findById(applicationId, applicationPermission.getReadPermission())` for GET and `getEditPermission()` for PUT/DELETE. Do not accept a workspace ID or user ID from the request body as an authorization substitute.

- [ ] **Step 5: Implement the binding controller**:

```text
GET    /api/v1/celanworksmith/applications/{applicationId}/ontology-binding
PUT    /api/v1/celanworksmith/applications/{applicationId}/ontology-binding
DELETE /api/v1/celanworksmith/applications/{applicationId}/ontology-binding
```

PUT must validate `providerId` against the supported value `mongodb-readonly`; unknown providers return `INVALID_ARGUMENT`.

- [ ] **Step 6: Make Ontology metadata binding-aware**. Add context-aware default methods to `OntologyProvider` for Object Types, Link Types, Functions and Actions; preserve the existing no-context methods for Mock compatibility. `OntologyController` accepts optional `applicationId`, and `OntologyProjectBackedProvider` resolves the immutable Project definition through `CelanworksmithApplicationBindingResolver`. A request with a valid App binding must never return metadata from the unrelated global Mock Project.

- [ ] **Step 7: Run binding and metadata tests and confirm they pass**.

Run: `cd app/server && mvn -pl appsmith-server -Dtest='com.celanworksmith.application.CelanworksmithApplicationBindingControllerTest,com.celanworksmith.application.CelanworksmithApplicationBindingServiceTest,com.celanworksmith.controller.CelanWorksmithControllerTest' test`

## Task 4: MongoDB Runtime Data Provider

**目标：** 根据 App Binding 和 Ontology Project 的逻辑 `runtimeTable`，从 `celanworksmith_runtime` 只读数据库返回与当前 DTO 完全一致的对象数据。

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/context/CelanworksmithRuntimeContext.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeDataProvider.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeObjectDocument.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/RuntimeTableMapping.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeProperties.java`
- Create: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/RuntimeProviderTestFixtures.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/port/RuntimeProvider.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/controller/RuntimeController.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/CelanWorksmithConfiguration.java`
- Create: `scripts/celanworksmith/seed-runtime-mongodb.js`
- Create: `scripts/celanworksmith/runtime-data/purchase_orders.json`
- Create: `scripts/celanworksmith/runtime-data/suppliers.json`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MongoRuntimeDataProviderTest.java`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MockRuntimeProviderTest.java`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/controller/CelanWorksmithControllerTest.java`

**Interfaces:**
- `CelanworksmithRuntimeContext` contains `applicationId` and an explicit `legacyDefault` flag for old tests only.
- Add context-aware default methods to `RuntimeProvider` while preserving the existing no-context methods for Mock compatibility:

```java
Mono<ObjectSetResult> queryObjects(CelanworksmithRuntimeContext context, String typeId, ObjectSetQuery query);
Mono<ObjectInstanceDTO> getObject(CelanworksmithRuntimeContext context, String typeId, String instanceId);
Mono<ObjectSetResult> getLinks(CelanworksmithRuntimeContext context, String typeId, String instanceId, String linkTypeId, ObjectSetQuery query);
```

- The controller reads optional `applicationId` query parameters and uses context-aware methods when present; legacy requests continue to use the existing Mock path.
- `MongoRuntimeDataProvider` resolves the binding, validates `typeId` and query fields against the Project, maps `runtimeTable` to an allowlisted Mongo collection, and returns `ObjectInstanceDTO`/`ObjectSetResult`.

- [ ] **Step 1: Add failing provider tests** for a bound App, object list, object instance, pagination, property whitelist, invalid sort, unknown Object Type, missing binding, and empty result.

```java
StepVerifier.create(provider.queryObjects(RuntimeProviderTestFixtures.context("app-1"), "PurchaseOrder", RuntimeProviderTestFixtures.query(0, 10)))
    .assertNext(result -> assertThat(result.items()).hasSize(10))
    .verifyComplete();
```

- [ ] **Step 2: Run provider tests and confirm they fail**.

Run: `cd app/server && mvn -pl appsmith-server -Dtest='com.celanworksmith.runtime.MongoRuntimeDataProviderTest,com.celanworksmith.controller.CelanWorksmithControllerTest' test`

Expected: FAIL because the Mongo provider and context-aware API are not implemented.

- [ ] **Step 3: Add Mongo runtime properties** with defaults `mongodb://localhost:27017`, database `celanworksmith_runtime`, and provider ID `mongodb-readonly`. Use a separate qualified reactive Mongo template and never use the Appsmith metadata template for runtime collections.

- [ ] **Step 4: Implement read-only document queries**. Use `_id` as object ID, copy `properties` without mutation, map `runtimeTable` through server-side `RuntimeTableMapping`, and apply offset/limit/sort/filter using the existing structured query validation rules.

- [ ] **Step 5: Update RuntimeController** to accept `applicationId` on object and link GET requests while keeping the parameter optional for legacy tests. The controller must not accept a collection name from the client.

- [ ] **Step 6: Add seed data and seed script**. The script must create only `celanworksmith_runtime` collections and insert deterministic `Supplier` and `PurchaseOrder` documents. It must be safe to run repeatedly by using upsert on `_id`.

- [ ] **Step 7: Run provider tests and confirm they pass**.

Run: `cd app/server && mvn -pl appsmith-server -Dtest='com.celanworksmith.runtime.MongoRuntimeDataProviderTest,com.celanworksmith.controller.CelanWorksmithControllerTest,com.celanworksmith.runtime.MockRuntimeProviderTest' test`

- [ ] **Step 8: Seed and manually verify MongoDB**.

Run: `mongosh 'mongodb://localhost:27017/celanworksmith_runtime' scripts/celanworksmith/seed-runtime-mongodb.js`

Expected: the database contains only the runtime simulation collections and the runtime API returns the seeded DTO shape for a bound application.

## Task 5: 前端 App Binding 与编辑器加载

**目标：** 让用户在新 App 创建后的第一步选择 Project/Version，保存 App Binding，并让编辑器按绑定加载本体和 MongoDB Runtime 数据。

**Files:**
- Modify: `app/client/src/api/CelanworksmithAPI.ts`
- Create: `app/client/src/actions/celanworksmithApplicationBindingActions.ts`
- Create: `app/client/src/reducers/celanworksmithApplicationBindingReducer.ts`
- Create: `app/client/src/selectors/celanworksmithApplicationBindingSelectors.ts`
- Modify: `app/client/src/reducers/index.tsx`
- Create: `app/client/src/pages/AppIDE/components/CelanworksmithApplicationBindingLoader.tsx`
- Create: `app/client/src/pages/AppIDE/components/CelanworksmithApplicationBindingPanel.tsx`
- Modify: `app/client/src/pages/AppIDE/AppIDE.tsx`
- Modify: `app/client/src/pages/AppIDE/components/CelanworksmithOntologyLoader.tsx`
- Modify: `app/client/src/pages/AppIDE/components/CelanworksmithObjectsLoader.tsx`
- Modify: `app/client/src/pages/AppIDE/components/OntologyExplorer/index.tsx`
- Modify: `app/client/src/pages/Applications/helpers.ts`
- Modify: `app/client/src/ce/pages/Applications/index.tsx`
- Test: `app/client/src/api/__tests__/CelanworksmithAPI.test.ts`
- Test: `app/client/src/pages/AppIDE/components/CelanworksmithApplicationBindingLoader.test.tsx`
- Test: `app/client/src/pages/AppIDE/components/CelanworksmithApplicationBindingPanel.test.tsx`
- Test: `app/client/src/reducers/celanworksmithApplicationBindingReducer.test.ts`
- Test: `app/client/src/selectors/celanworksmithApplicationBindingSelectors.test.ts`

**Interfaces:**
- Add API methods:

```ts
listOntologyProjects(): Promise<ApiResponse<CelanworksmithOntologyProjectSummary[]>>;
listOntologyProjectVersions(projectId: string): Promise<ApiResponse<CelanworksmithOntologyProjectVersion[]>>;
getApplicationOntologyBinding(applicationId: string): Promise<ApiResponse<CelanworksmithApplicationBinding | null>>;
saveApplicationOntologyBinding(applicationId: string, request: CelanworksmithApplicationBindingRequest): Promise<ApiResponse<CelanworksmithApplicationBinding>>;
```

- `CelanworksmithApplicationBindingState` exposes `idle | loading | ready | unbound | error`, current binding, project list, version list, and a retry action.
- `CelanworksmithApplicationBindingLoader` dispatches binding load once per current `applicationId` and does not load Object/Variable data until binding is `ready` or explicit legacy compatibility mode is selected.
- `CelanworksmithApplicationBindingPanel` accepts `applicationId`, project options, selected version, `onSave`, and `onRetry`; it displays the binding error without crashing the editor.

- [x] **Step 1: Add failing API and reducer tests** for project listing, binding load, binding save, unbound state, structured error, and application ID changes.

```ts
expect(CelanworksmithAPI.getApplicationOntologyBinding("app-1"))
  .resolves.toMatchObject({ data: null });
```

- [x] **Step 2: Run frontend focused tests and confirm they fail**.

Run: `cd app/client && ./node_modules/.bin/jest --config jest.config.js src/api/__tests__/CelanworksmithAPI.test.ts src/reducers/celanworksmithApplicationBindingReducer.test.ts src/selectors/celanworksmithApplicationBindingSelectors.test.ts --runInBand --no-cache`

Expected: FAIL because the API methods and binding state do not exist.

- [x] **Step 3: Implement API types and methods**. Every runtime object request emitted by the existing loaders and Object Query Layer must include the current `applicationId`; no request may include a Mongo collection name.

- [x] **Step 4: Implement binding state and Loader**. On `unbound`, keep the editor usable and render the binding panel; on `error`, show Retry; on `ready`, dispatch existing Ontology and Objects load actions with the application context.

- [x] **Step 5: Add the binding panel to Ontology Explorer**. The first version may bind immediately after Appsmith creates the App, before opening or during the first editor visit, without rewriting Appsmith's core application creation modal. Existing unbound Apps remain in compatibility mode.

- [x] **Step 6: Update AppIDE loaders** so Ontology, Objects, Variables and Object Query use the binding's `applicationId` and do not race before binding resolution. Keep the existing `$objects` shape unchanged.

- [x] **Step 7: Add create-flow handoff**: Appsmith's existing successful-create route preserves the new App ID; the AppIDE root now mounts the binding panel immediately, and binding failures leave the App intact with Retry.

- [x] **Step 8: Run frontend focused tests and confirm they pass**.

Run: `cd app/client && ./node_modules/.bin/jest --config jest.config.js src/api/__tests__/CelanworksmithAPI.test.ts src/reducers/celanworksmithApplicationBindingReducer.test.ts src/selectors/celanworksmithApplicationBindingSelectors.test.ts src/pages/AppIDE/components/CelanworksmithApplicationBindingLoader.test.tsx src/pages/AppIDE/components/CelanworksmithApplicationBindingPanel.test.tsx src/pages/AppIDE/components/OntologyExplorer/index.test.tsx --runInBand --no-cache`

## Task 6: 端到端验收、回归与文档

**目标：** 证明第一阶段闭环可用，并记录可重复的环境准备、手工测试和故障定位路径。

**Files:**
- Create: `docs/superpowers/verification/2026-08-06-t-foundation-ontology-project-app-binding-verification.md`
- Modify: `CelanWorksmith_分步实施计划.md`
- Modify: `CelanWorksmith_T8基础能力检查点.md`
- Modify: `README.md` or `app/server/README.md` only if the final run commands are not documented in an existing location
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/controller/CelanWorksmithControllerTest.java`
- Test: `app/client/src/widgets/TableWidget/component/ObjectTableMode.test.tsx`

**Interfaces:**
- Backend verification uses the exact Project, Binding, and Runtime API paths from Tasks 2-4.
- Browser verification uses the existing Table/ObjectDetail widgets and these bindings:

```text
{{$objects.PurchaseOrder.all}}
{{$objects.PurchaseOrder.PO001}}
```

- [x] **Step 1: Run all focused backend regression tests**.

Run:

```bash
cd app/server
mvn -pl appsmith-server -am \
  -Dtest='com.celanworksmith.ontology.project.OntologyProjectYamlImporterTest,com.celanworksmith.ontology.OntologyProjectControllerTest,com.celanworksmith.ontology.MongoOntologyProjectRegistryTest,com.celanworksmith.application.CelanworksmithApplicationBindingControllerTest,com.celanworksmith.application.CelanworksmithApplicationBindingServiceTest,com.celanworksmith.runtime.MongoRuntimeDataProviderTest,com.celanworksmith.runtime.MockRuntimeProviderTest,com.celanworksmith.controller.CelanWorksmithControllerTest' \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Expected: all listed tests pass with no new failures.

- [x] **Step 2: Run all focused frontend regression tests**.

Run:

```bash
cd app/client
./node_modules/.bin/jest --config jest.config.js \
  src/api/__tests__/CelanworksmithAPI.test.ts \
  src/reducers/celanworksmithApplicationBindingReducer.test.ts \
  src/selectors/celanworksmithApplicationBindingSelectors.test.ts \
  src/pages/AppIDE/components/CelanworksmithApplicationBindingLoader.test.tsx \
  src/pages/AppIDE/components/CelanworksmithApplicationBindingPanel.test.tsx \
  src/pages/AppIDE/components/OntologyExplorer/index.test.tsx \
  src/widgets/TableWidget/component/ObjectTableMode.test.tsx \
  --runInBand --no-cache
```

Expected: all listed tests pass; existing React `act` warnings may remain but no new assertion or runtime error is allowed.

- [x] **Step 3: Run formatting and diff checks**.

Run: `git diff --check` and the repository-configured Prettier/ESLint commands for changed files.

Expected: no whitespace errors and no new ESLint errors. Existing baseline warnings must be listed rather than silently ignored.

- [ ] **Step 4: Perform browser acceptance**.

1. Seed `celanworksmith_runtime` with the checked-in `mongosh` script.
2. Open `http://10.10.110.129/` and create a new App.
3. In the first binding panel, select `celanworksmith-demo` version `1.0.0` and provider `mongodb-readonly`.
4. Reopen the App and confirm the binding is still present.
5. Open Ontology Explorer and confirm Object, Link, Function and Action metadata load.
6. Bind a Table Widget to `{{$objects.PurchaseOrder.all}}` and confirm seeded rows and Columns appear.
7. Bind ObjectDetail to `{{$objects.PurchaseOrder.PO001}}` and confirm the object renders.
8. Change the binding to an invalid version and confirm structured error plus Retry; restore the valid version.
9. Open an existing unbound App and confirm native Query/Table behavior still works.

- [x] **Step 5: Record verification evidence** in `docs/superpowers/verification/2026-08-06-t-foundation-ontology-project-app-binding-verification.md`, including API responses, test counts, service ports, known warnings, and any residual limitations.

- [x] **Step 6: Update the plan/status documents** to mark only the verified T-Foundation substeps complete. Do not mark T9 complete or introduce publish-state behavior.

## Self-Review Checklist

- [ ] Every new API has a backend test and a frontend client/reducer test where applicable.
- [ ] `applicationId` is the only app context accepted by the runtime path; collection names never come from the browser.
- [ ] `celanworksmith_ontology` and `celanworksmith_runtime` are isolated from Appsmith's default database.
- [ ] Project version immutability is enforced before App Binding is saved.
- [ ] Mock Provider remains available for legacy tests and unbound Apps.
- [ ] The plan contains no T9 publish or production Action Server implementation.
- [ ] No existing T5-T8 changes are reverted or overwritten.

## Execution Handoff

This plan is designed for Subagent-Driven execution: one short-lived worker per task, followed by independent test execution and review before the next task. The implementation session should start at Task 1 and stop at each task's verification gate; do not batch all six tasks into one long-running worker.
