# T5 Function and Action Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 T4 `$objects` 只读绑定之上，增加通过异步 DataTree 节点执行 CelanWorksmith Function 和 Action 的能力，并让 Action 成功后的对象刷新、状态、错误和输入保留策略可验证。

**Architecture:** Function 和 Action 均通过 Redux Action -> Saga -> `CelanworksmithAPI` -> Runtime API 执行，绝不在同步表达式求值器、React render 或 Widget render 中直接发起网络请求。元数据和执行结果分别进入全局 Redux 状态，再由 DataTree selector 暴露为 `$functions.<id>` 与 `$actions.<id>`；Action 成功时按返回的 `changedObjects[*].typeId` 触发对象类型级刷新并只触发一次 `TRIGGER_EVAL`。

**Tech Stack:** TypeScript, React, Redux, redux-saga, Jest, Spring WebFlux, JUnit 5, `WebTestClient`, 现有 Mock Runtime Provider。

## Global Constraints

- T5 只支持现有 Mock Provider 和现有 Runtime API；`ActionButton`、`ObjectDetail`、`FilterList` 留到 T6。
- Function 节点路径固定为 `$functions.<functionId>.run(parameters)`、`.data`、`._meta`。
- Action 节点路径固定为 `$actions.<actionId>.run(parameters)`、`.data`、`.changedObjects`、`.sideEffects`、`._meta`。
- 状态机固定为 `IDLE -> QUEUED -> RUNNING -> SUCCEEDED|FAILED|CANCELLED`。
- Action 请求固定为单对象 `{ objectTypeId, objectId, parameters }`；T5 不扩展多对象协议。
- Function 只有 `sideEffectFree: true` 的元数据项允许缓存，默认 TTL 为 30 秒；Action 永不缓存。
- 取消只保证客户端状态变为 `CANCELLED` 并阻止成功后的刷新；后端不要求因断开 HTTP 连接而回滚副作用。
- 刷新不覆盖未提交的本地输入；T5 不实现完整冲突解决界面。
- 不修改 Appsmith 原生 Query Action 的协议、状态或执行 Saga。
- 不创建 Git commit；每个任务以测试和手工验收作为检查点，保留当前工作区已有未提交改动。

## File Map

新增的职责边界如下，后续任务只能依赖这里定义的接口：

- `app/client/src/actions/celanworksmithOntologyActions.ts`：Function/Action 元数据加载 Action creator。
- `app/client/src/actions/celanworksmithExecutionActions.ts`：执行、取消、重试及对象刷新 Action creator 和 payload 类型。
- `app/client/src/reducers/celanworksmithOntologyReducer.ts`：全局 Function/Action 元数据状态。
- `app/client/src/reducers/celanworksmithExecutionReducer.ts`：请求状态、结果、错误、缓存和本地输入冲突状态。
- `app/client/src/selectors/celanworksmithSelectors.ts`：元数据、执行状态和受影响对象类型 selector。
- `app/client/src/entities/DataTree/dataTreeCelanworksmithExecution.ts`：生成 `$functions` 和 `$actions` DataTree entity。
- `app/client/src/sagas/CelanworksmithOntologySaga.ts`：去重后的元数据加载 Saga。
- `app/client/src/sagas/CelanworksmithExecutionSaga.ts`：Function/Action 调用、超时、取消、重试、缓存和刷新编排。

既有文件的职责调整如下：

- `app/client/src/api/CelanworksmithAPI.ts`：补齐可取消请求、返回类型和统一 API 错误入口。
- `app/client/src/ce/entities/DataTree/types.ts`：补充 Function/Action entity 和 execution metadata 类型。
- `app/client/src/selectors/dataTreeSelectors.ts`：合并两个新 DataTree namespace，并把 dispatch 入口接到 Appsmith DataTree action dispatcher。
- `app/client/src/ce/utils/autocomplete/entityDefGeneratorMap.ts`：为 `$functions`、`$actions` 生成稳定的 Tern 定义。
- `app/client/src/ce/reducers/index.tsx`、`app/client/src/ce/sagas/index.tsx`：注册新 reducer 和 Saga。
- `app/client/src/pages/AppIDE/components/OntologyExplorer/index.tsx`：移除 Function/Action 的本地请求，改为消费全局元数据；保留现有展示和重试行为。
- `app/client/src/sagas/CelanworksmithObjectsSaga.ts`、`app/client/src/actions/celanworksmithObjectActions.ts`：增加按 Object Type 刷新的明确入口，避免 Action 成功后重复加载所有对象。

---

### Task 1: 固化运行时契约和错误映射

**Files:**
- Modify: `app/client/src/api/CelanworksmithAPI.ts`
- Modify: `app/client/src/ce/entities/DataTree/types.ts`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/controller/RuntimeController.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/CelanWorksmithExceptionHandler.java` only if current error body cannot preserve the existing `code/message` contract
- Test: `app/client/src/api/__tests__/CelanworksmithAPI.test.ts`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/controller/CelanWorksmithControllerTest.java`

**Interfaces:**
- `CelanworksmithAPI.callFunction(functionId: string, parameters: Record<string, unknown>, signal?: AbortSignal): Promise<ApiResponse<unknown>>`
- `CelanworksmithAPI.executeAction(actionId: string, request: CelanworksmithActionExecutionRequest, signal?: AbortSignal): Promise<ApiResponse<CelanworksmithActionResult>>`
- `CelanworksmithExecutionStatus = "idle" | "queued" | "running" | "succeeded" | "failed" | "cancelled"`
- `CelanworksmithExecutionError = { code: string; message: string }`
- `CelanworksmithExecutionMeta = { status; requestId; executionId?; startedAt?; completedAt?; error?; parametersHash }`

- [ ] **Step 1: Extend the API contract tests first**

  In `CelanworksmithAPI.test.ts`, assert that Function requests serialize exactly as `{ parameters }`, Action requests serialize exactly as `{ objectTypeId, objectId, parameters }`, and the optional `AbortSignal` reaches the underlying request config without changing the current URL paths.

- [ ] **Step 2: Add the shared frontend execution types**

  Define the status, metadata, structured error, Function execution response, Action result, and request payload types in the existing API/type modules. Keep `executionId` optional for Function and required in the existing Action result type.

- [ ] **Step 3: Make API errors safe for the frontend**

  Preserve server error codes such as `INVALID_ARGUMENT`, `FUNCTION_NOT_FOUND`, `ACTION_NOT_FOUND`, `OBJECT_NOT_FOUND`, and provider availability errors. Add a single frontend normalization helper that returns one of `INVALID_ARGUMENT`, `UNKNOWN_FUNCTION`, `UNKNOWN_ACTION`, `UNKNOWN_OBJECT`, `PROVIDER_UNAVAILABLE`, `TIMEOUT`, `NETWORK_ERROR`, or `BACKEND_ERROR`, and never exposes a Java stack trace.

- [ ] **Step 4: Verify backend response/error behavior**

  Extend `CelanWorksmithControllerTest` with Function unknown ID, Function missing parameter, Action success, Action unknown ID, object not found, and object type mismatch cases. Assert the existing `ResponseDTO` success shape and the existing structured error shape; only change the controller/handler if a test demonstrates a contract gap.

- [ ] **Step 5: Run the focused contract tests**

  Run from the repository root:

  ```bash
  cd app/client && yarn jest src/api/__tests__/CelanworksmithAPI.test.ts --runInBand
  cd ../server && ./gradlew :appsmith-server:test --tests com.celanworksmith.controller.CelanWorksmithControllerTest
  ```

  Expected: all existing T4 API tests and the new T5 contract cases pass.

### Task 2: 将 Function/Action 元数据收归全局状态

**Files:**
- Create: `app/client/src/actions/celanworksmithOntologyActions.ts`
- Create: `app/client/src/reducers/celanworksmithOntologyReducer.ts`
- Create: `app/client/src/reducers/celanworksmithOntologyReducer.test.ts`
- Create: `app/client/src/sagas/CelanworksmithOntologySaga.ts`
- Create: `app/client/src/sagas/__tests__/CelanworksmithOntologySaga.test.ts`
- Modify: `app/client/src/ce/reducers/index.tsx`
- Modify: `app/client/src/ce/sagas/index.tsx`
- Modify: `app/client/src/selectors/celanworksmithSelectors.ts`
- Modify: `app/client/src/pages/AppIDE/components/OntologyExplorer/index.tsx`
- Modify: `app/client/src/pages/AppIDE/components/OntologyExplorer/index.test.tsx`

**Interfaces:**
- `CelanworksmithOntologyState = { status: "idle" | "loading" | "ready" | "error"; functions: CelanworksmithFunction[]; actions: CelanworksmithAction[]; error?: CelanworksmithObjectError; updatedAt?: number }`
- `getCelanworksmithOntologyState(state): CelanworksmithOntologyState`
- `celanworksmithOntologyLoadRequest(): { type: CELANWORKSMITH_ONTOLOGY_LOAD_REQUEST }`
- `celanworksmithOntologyLoadSuccess(functions, actions): { type: CELANWORKSMITH_ONTOLOGY_LOAD_SUCCESS; payload: { functions; actions } }`
- `celanworksmithOntologyLoadError(error): { type: CELANWORKSMITH_ONTOLOGY_LOAD_ERROR; payload: CelanworksmithExecutionError }`

- [ ] **Step 1: Write reducer transition tests**

  Cover `idle -> loading -> ready`, preservation of the previous metadata on a failed reload, and `error` state with the normalized error. Assert that arrays are replaced atomically so Function and Action lists cannot describe different ontology snapshots.

- [ ] **Step 2: Implement metadata actions and reducer**

  Keep Function and Action metadata in one state slice. Do not put execution results into this reducer and do not duplicate the T4 object items reducer.

- [ ] **Step 3: Write Saga loading tests**

  Assert that one `CELANWORKSMITH_ONTOLOGY_LOAD_REQUEST` performs exactly one `getFunctions` and one unfiltered `getActions` call, dispatches one atomic success, maps a failed API response to the normalized error, and ignores a second request while loading.

- [ ] **Step 4: Implement the metadata Saga and register it**

  Use `takeLeading` for the load request, call both ontology endpoints in parallel, and dispatch one `TRIGGER_EVAL` after success or failure so autocomplete and DataTree can observe the new metadata.

- [ ] **Step 5: Switch OntologyExplorer to selectors**

  Keep its object type/link type display behavior, but read Function and Action arrays and loading/error state from Redux. The component dispatches `celanworksmithOntologyLoadRequest()` on mount/retry and no longer calls `getFunctions()` or `getActions()` directly. Retain the existing object load request for T4 object data.

- [ ] **Step 6: Run metadata tests**

  ```bash
  cd app/client && yarn jest src/reducers/celanworksmithOntologyReducer.test.ts src/sagas/__tests__/CelanworksmithOntologySaga.test.ts src/pages/AppIDE/components/OntologyExplorer/index.test.tsx --runInBand
  ```

  Expected: Explorer still renders the existing Function/Action nodes and retry state, while network ownership is in the Saga.

### Task 3: 实现 Function 异步执行

**Files:**
- Create: `app/client/src/actions/celanworksmithExecutionActions.ts`
- Create: `app/client/src/reducers/celanworksmithExecutionReducer.ts`
- Create: `app/client/src/selectors/celanworksmithSelectors.ts` if Task 2 has not created it; otherwise modify it
- Create: `app/client/src/sagas/CelanworksmithExecutionSaga.ts`
- Create: `app/client/src/sagas/__tests__/CelanworksmithExecutionSaga.test.ts`
- Create: `app/client/src/reducers/celanworksmithExecutionReducer.test.ts`
- Modify: `app/client/src/ce/reducers/index.tsx`
- Modify: `app/client/src/ce/sagas/index.tsx`

**Interfaces:**
- `celanworksmithFunctionRun(functionId: string, parameters: Record<string, unknown>, requestId?: string)`
- `celanworksmithFunctionCancel(requestId: string)`
- `celanworksmithFunctionRetry(functionId: string, parameters: Record<string, unknown>)`
- `CelanworksmithFunctionExecutionState = { data?: unknown; meta: CelanworksmithExecutionMeta; lastSuccessfulRequestId?: string }`
- `CelanworksmithExecutionState = { functions: Record<string, CelanworksmithFunctionExecutionState>; actions: Record<string, CelanworksmithActionExecutionState>; requests: Record<string, CelanworksmithRequestState>; functionCache: Record<string, { data: unknown; expiresAt: number }> }`

- [ ] **Step 1: Write Function reducer transition tests**

  Assert that a run creates `requestId`, transitions through `queued` and `running`, stores successful `data`, preserves the previous successful `data` on failure, records normalized errors, and marks cancellation without changing the prior data.

- [ ] **Step 2: Implement request IDs and parameter hashing**

  Generate a collision-resistant client `requestId` for every run. Hash a stable, sorted JSON representation of parameters, and use `functionId + parametersHash` as the cache key. The hash is metadata only and must not be sent as authorization or trust data.

- [ ] **Step 3: Write Function Saga tests before implementation**

  Cover successful API response, failed API response, one transient retry followed by failure, timeout, cancellation, and a cache hit for `sideEffectFree: true` within 30 seconds. Cover cache bypass for `sideEffectFree: false`.

- [ ] **Step 4: Implement the Function Saga**

  Validate the Function ID and required/basic parameter types against the ontology selector before calling the API. Dispatch `QUEUED`, then `RUNNING`; call `CelanworksmithAPI.callFunction`; use `race` with the configured timeout; map errors; dispatch success/failure/cancelled; and dispatch `TRIGGER_EVAL` after the reducer contains the new state. A cancelled task must not dispatch success or trigger any object refresh.

- [ ] **Step 5: Implement bounded Function caching**

  Only cache successful results for metadata `sideEffectFree === true`; expire entries after 30 seconds; do not cache failures or Actions. A cache hit still updates the entity metadata with a new request ID and `SUCCEEDED` status without making an HTTP call.

- [ ] **Step 6: Run Function tests**

  ```bash
  cd app/client && yarn jest src/reducers/celanworksmithExecutionReducer.test.ts src/sagas/__tests__/CelanworksmithExecutionSaga.test.ts --runInBand
  ```

  Expected: all Function state, retry, timeout, cancellation, and cache cases pass.

### Task 4: 实现 Action 异步执行和状态机

**Files:**
- Modify: `app/client/src/actions/celanworksmithExecutionActions.ts`
- Modify: `app/client/src/reducers/celanworksmithExecutionReducer.ts`
- Modify: `app/client/src/sagas/CelanworksmithExecutionSaga.ts`
- Modify: `app/client/src/sagas/__tests__/CelanworksmithExecutionSaga.test.ts`
- Modify: `app/client/src/reducers/celanworksmithExecutionReducer.test.ts`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MockRuntimeProviderTest.java`

**Interfaces:**
- `celanworksmithActionRun(actionId: string, request: CelanworksmithActionExecutionRequest, requestId?: string)`
- `celanworksmithActionCancel(requestId: string)`
- `celanworksmithActionRetry(actionId: string, request: CelanworksmithActionExecutionRequest)`
- `CelanworksmithActionExecutionState = { data?: CelanworksmithActionResult; changedObjects: CelanworksmithObjectInstance[]; sideEffects: Record<string, unknown>[]; meta: CelanworksmithExecutionMeta }`
- `CelanworksmithRequestState = { requestId; kind: "function" | "action"; entityId; status; parametersHash; startedAt?; completedAt?; error?; abortController?: AbortController }`

- [ ] **Step 1: Add Action transition tests**

  Cover successful `QUEUED -> RUNNING -> SUCCEEDED`, Action failure, timeout, cancellation, and retry. Assert success stores `data`, `changedObjects`, `sideEffects`, and `executionId` in the paths defined by the design.

- [ ] **Step 2: Add duplicate-submission tests**

  Dispatch two runs for the same Action while the first is `RUNNING`; assert only one API call occurs and the second request is rejected with a client `DUPLICATE_REQUEST` state without changing the running request.

- [ ] **Step 3: Implement Action validation and execution**

  Validate known Action ID, `objectTypeId` compatibility, required/basic parameter types, and `objectId` presence from ontology metadata. Then call `executeAction` through the same timeout/error/cancellation machinery as Function, but without cache.

- [ ] **Step 4: Preserve backend authority**

  Add provider/controller tests for missing `objectId`, missing required Action parameter, wrong object type, unknown Action ID, and successful `executionId/changedObjects/sideEffects`. Frontend validation must be an early user feedback path, not a replacement for these backend checks.

- [ ] **Step 5: Run Action tests**

  ```bash
  cd app/client && yarn jest src/reducers/celanworksmithExecutionReducer.test.ts src/sagas/__tests__/CelanworksmithExecutionSaga.test.ts --runInBand
  cd ../server && ./gradlew :appsmith-server:test --tests com.celanworksmith.runtime.MockRuntimeProviderTest --tests com.celanworksmith.controller.CelanWorksmithControllerTest
  ```

  Expected: duplicate clicks are suppressed, failed requests can be retried, and all server-side validation cases remain structured.

### Task 5: 将执行状态接入 DataTree 和自动补全

**Files:**
- Create: `app/client/src/entities/DataTree/dataTreeCelanworksmithExecution.ts`
- Create: `app/client/src/entities/DataTree/dataTreeCelanworksmithExecution.test.ts`
- Modify: `app/client/src/ce/entities/DataTree/types.ts`
- Modify: `app/client/src/selectors/dataTreeSelectors.ts`
- Modify: `app/client/src/ce/utils/autocomplete/entityDefGeneratorMap.ts`
- Modify: `app/client/src/utils/autocomplete/__tests__/dataTreeTypeDefCreator.test.ts`
- Modify: `app/client/src/ce/sagas/index.tsx` or the existing evaluation integration only where required to expose the dispatcher

**Interfaces:**
- `CelanworksmithFunctionEntity = { run: (parameters?: Record<string, unknown>) => string; data?: unknown; _meta: CelanworksmithExecutionMeta; ENTITY_TYPE: "CELANWORKSMITH_FUNCTION" }`
- `CelanworksmithActionEntity = { run: (request: CelanworksmithActionExecutionRequest) => string; data?: CelanworksmithActionResult; changedObjects: CelanworksmithObjectInstance[]; sideEffects: Record<string, unknown>[]; _meta: CelanworksmithExecutionMeta; ENTITY_TYPE: "CELANWORKSMITH_ACTION" }`
- `generateCelanworksmithExecutionDataTree(state, dispatch): { $functions: Record<string, CelanworksmithFunctionEntity>; $actions: Record<string, CelanworksmithActionEntity> }`

- [ ] **Step 1: Write DataTree shape tests**

  Build state with one Function and one Action and assert the exact paths `$functions.CalculateDelayDays.data`, `$functions.CalculateDelayDays._meta`, `$actions.UpdateProductionSchedule.changedObjects`, `$actions.UpdateProductionSchedule.sideEffects`, and `$actions.UpdateProductionSchedule._meta.executionId` exist. Assert `run(parameters)` dispatches the corresponding Redux request and returns its `requestId`.

- [ ] **Step 2: Add entity type constants and generator definitions**

  Add `CELANWORKSMITH_FUNCTION` and `CELANWORKSMITH_ACTION` to `ENTITY_TYPE`. Generate only metadata-backed IDs, retain empty/default result fields for not-yet-run entities, and never execute HTTP from the generator.

- [ ] **Step 3: Connect the dispatcher at the DataTree boundary**

  Reuse the Appsmith DataTree action-dispatcher pattern: keep the Redux state serializable, inject a narrow `run` dispatcher only at the unevaluated DataTree boundary, and ensure the evaluator can clone/inspect the entity without invoking `run`. The dispatcher must call `celanworksmithFunctionRun` or `celanworksmithActionRun` and return the generated `requestId`.

- [ ] **Step 4: Add autocomplete definitions**

  Extend `entityDefGeneratorMap` so `$functions.<id>` and `$actions.<id>` expose `run`, `data`, `_meta`, and Action-specific result properties. Define parameter types from ontology metadata and preserve the existing `$objects` definitions. Unknown metadata IDs must not appear in autocomplete.

- [ ] **Step 5: Update the DataTree selector**

  Merge `$functions` and `$actions` next to `$objects` in `getUnevaluatedDataTree`, and update the post-evaluation Tern refresh path so execution state changes refresh definitions only once. Do not make `TRIGGER_EVAL` call the object loader by itself.

- [ ] **Step 6: Run DataTree/autocomplete tests**

  ```bash
  cd app/client && yarn jest src/entities/DataTree/dataTreeCelanworksmithExecution.test.ts src/utils/autocomplete/__tests__/dataTreeTypeDefCreator.test.ts src/selectors/dataTreeSelectors.test.ts --runInBand
  ```

  Expected: the expressions can be entered and autocomplete shows the new namespaces without regressing `$objects`.

### Task 6: 实现 Action 成功后的对象类型级刷新

**Files:**
- Modify: `app/client/src/actions/celanworksmithObjectActions.ts`
- Modify: `app/client/src/reducers/celanworksmithObjectsReducer.ts`
- Modify: `app/client/src/sagas/CelanworksmithObjectsSaga.ts`
- Modify: `app/client/src/sagas/CelanworksmithExecutionSaga.ts`
- Modify: `app/client/src/sagas/__tests__/CelanworksmithObjectsSaga.test.ts`
- Modify: `app/client/src/sagas/__tests__/CelanworksmithExecutionSaga.test.ts`
- Modify: `app/client/src/reducers/celanworksmithObjectsReducer.test.ts`

**Interfaces:**
- `celanworksmithObjectTypesRefreshRequested(typeIds: string[]): { type: CELANWORKSMITH_OBJECT_TYPES_REFRESH_REQUESTED; payload: string[] }`
- `celanworksmithObjectTypeRefreshStart(typeId: string)` and existing `celanworksmithObjectTypeLoadSuccess/error`
- `getChangedObjectTypeIds(changedObjects: CelanworksmithObjectInstance[]): string[]`

- [ ] **Step 1: Write refresh-scope tests**

  Given an Action result changing `ProductionOrder` and `DeliveryOrder`, assert only those two type IDs are loaded. Given duplicate changed objects or an empty list, assert IDs are deduplicated and no unnecessary request is made.

- [ ] **Step 2: Add explicit type-level refresh actions**

  Extend the existing object Saga with a refresh request that preserves unaffected type state and marks only affected types loading. Keep initial editor/page lifecycle loading behavior unchanged.

- [ ] **Step 3: Trigger refresh only after coherent Action success**

  In the execution Saga, wait until Action success is reduced, extract `changedObjects[*].typeId`, dispatch the scoped refresh, await its completion, then dispatch exactly one `TRIGGER_EVAL`. Failure, timeout, cancellation, and `sideEffects`-only Actions must not refresh object data.

- [ ] **Step 4: Keep T4 loader boundaries single-owned**

  Remove or gate any duplicate root Loader/object Saga metadata request discovered during implementation. The object Saga remains the sole owner of `$objects` fetches; the execution Saga only requests the affected type IDs.

- [ ] **Step 5: Verify Table and `$objects` behavior**

  Extend reducer/Saga tests to assert that a successful `UpdateProductionSchedule` updates `$objects.ProductionOrder.all`, while an unrelated `Supplier` collection remains unchanged. Retain the existing T4 manual binding `$objects.PurchaseOrder.all` as a regression case.

- [ ] **Step 6: Run scoped refresh tests**

  ```bash
  cd app/client && yarn jest src/sagas/__tests__/CelanworksmithObjectsSaga.test.ts src/sagas/__tests__/CelanworksmithExecutionSaga.test.ts src/reducers/celanworksmithObjectsReducer.test.ts --runInBand
  ```

  Expected: Action success refreshes only affected Object Types and evaluation is triggered once after data is coherent.

### Task 7: 固化重试、输入保留和冲突状态边界

**Files:**
- Modify: `app/client/src/reducers/celanworksmithExecutionReducer.ts`
- Modify: `app/client/src/actions/celanworksmithExecutionActions.ts`
- Modify: `app/client/src/sagas/CelanworksmithExecutionSaga.ts`
- Create: `app/client/src/utils/celanworksmithInputPreservation.ts`
- Create: `app/client/src/utils/celanworksmithInputPreservation.test.ts`
- Modify: `app/client/src/sagas/__tests__/CelanworksmithExecutionSaga.test.ts`

**Interfaces:**
- `CelanworksmithInputState = { path: string; localValue: unknown; remoteValue: unknown; dirty: boolean; conflict: boolean; updatedAt: number }`
- `preserveCelanworksmithLocalInput(current, remote): CelanworksmithInputState`
- `celanworksmithInputCommitted(path, serverValue)` and `celanworksmithInputRefreshObserved(path, remoteValue)`

- [ ] **Step 1: Write input policy tests**

  Assert these exact cases: read-only/unmodified input adopts remote data; modified focused or unfocused input keeps local data; successful submission adopts server data and clears dirty; failed submission keeps local data; external remote change while dirty sets `conflict: true` and never silently overwrites local data.

- [ ] **Step 2: Implement a framework-independent preservation helper**

  Keep the helper pure and keyed by binding path. Do not add a complete conflict-resolution UI or alter native widget value reducers in T5; expose `dirty`, `remoteValue`, and `conflict` through the CelanWorksmith execution state for T6 controls.

- [ ] **Step 3: Add controlled transient retry**

  Retry one transient Function/Action failure only when the request has not been cancelled and the normalized error is `NETWORK_ERROR`, `PROVIDER_UNAVAILABLE`, or `TIMEOUT`. Persist retry count in request state; after one retry, require explicit `retry` dispatch. Never retry invalid arguments or business failures.

- [ ] **Step 4: Verify no refresh/input regression**

  Add Saga tests proving a failed Action keeps the previous object data and local value, a successful Action updates remote object data after scoped refresh, and no second refresh occurs from `TRIGGER_EVAL`.

- [ ] **Step 5: Run policy tests**

  ```bash
  cd app/client && yarn jest src/utils/celanworksmithInputPreservation.test.ts src/sagas/__tests__/CelanworksmithExecutionSaga.test.ts --runInBand
  ```

  Expected: dirty values survive refresh and only the approved one-time transient retry occurs.

### Task 8: 集成回归和运行环境验收

**Files:**
- Modify: `app/client/src/utils/autocomplete/__tests__/dataTreeTypeDefCreator.test.ts` only for final regression coverage
- Modify: `app/client/src/workers/Evaluation/__tests__/Actions.test.ts` only if the new entity types expose a native Action regression
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/controller/CelanWorksmithControllerTest.java` for final endpoint coverage
- Create: `docs/superpowers/verification/2026-08-04-t5-function-action-verification.md`

**Interfaces:**
- Manual validation uses existing Button/Text/Table widgets and the fixed expressions:

  ```text
  $functions.CalculateDelayDays.run({ poId: "PO001" })
  $functions.CalculateDelayDays.data
  $actions.UpdateProductionSchedule.run({ objectTypeId: "PurchaseOrder", objectId: "PO001", parameters: { newScheduleDate: "2026-03-15" } })
  $objects.ProductionOrder.all
  ```

- [ ] **Step 1: Run frontend focused suites**

  ```bash
  cd app/client && yarn jest src/api/__tests__/CelanworksmithAPI.test.ts src/reducers/celanworksmithOntologyReducer.test.ts src/reducers/celanworksmithExecutionReducer.test.ts src/reducers/celanworksmithObjectsReducer.test.ts src/entities/DataTree/dataTreeCelanworksmithExecution.test.ts src/sagas/__tests__/CelanworksmithOntologySaga.test.ts src/sagas/__tests__/CelanworksmithExecutionSaga.test.ts src/sagas/__tests__/CelanworksmithObjectsSaga.test.ts src/pages/AppIDE/components/OntologyExplorer/index.test.tsx --runInBand
  ```

- [ ] **Step 2: Run frontend type and lint checks for changed modules**

  ```bash
  cd app/client && yarn check-types
  yarn eslint src/api/CelanworksmithAPI.ts src/actions/celanworksmithOntologyActions.ts src/actions/celanworksmithExecutionActions.ts src/reducers/celanworksmithOntologyReducer.ts src/reducers/celanworksmithExecutionReducer.ts src/selectors/celanworksmithSelectors.ts src/entities/DataTree/dataTreeCelanworksmithExecution.ts src/sagas/CelanworksmithOntologySaga.ts src/sagas/CelanworksmithExecutionSaga.ts
  ```

- [ ] **Step 3: Run backend T5 suites**

  ```bash
  cd app/server && ./gradlew :appsmith-server:test --tests com.celanworksmith.controller.CelanWorksmithControllerTest --tests com.celanworksmith.runtime.MockRuntimeProviderTest
  ```

- [ ] **Step 4: Start the development services**

  Start the existing backend and frontend using the repository's documented development commands. Confirm MongoDB at `mongodb://localhost:27017` and Redis at `redis://localhost:6379` are reachable, and confirm the frontend proxy reaches the backend without `502` or RTS errors before testing T5.

- [ ] **Step 5: Perform the manual Button/Text/Table acceptance flow**

  Verify Function success and visible data, invalid-parameter error with prior data retention, Action `RUNNING` then `SUCCEEDED`, duplicate-click suppression, explicit retry after failure, affected `$objects` refresh, preservation of an unsubmitted input, and unchanged native Query Action execution.

- [ ] **Step 6: Record evidence and remaining scope**

  Write test commands, observed responses, service URLs, and any environment-only failure in `docs/superpowers/verification/2026-08-04-t5-function-action-verification.md`. Mark T5 complete only when all acceptance criteria in the approved design document are evidenced; record T6 Widget work as out of scope.

## Verification Matrix

| Design requirement | Implemented/verified by |
| --- | --- |
| Async Function DataTree node | Tasks 3 and 5 |
| Async Action DataTree node | Tasks 4 and 5 |
| Global Function/Action metadata | Task 2 |
| Status, request ID, execution ID, errors | Tasks 1, 3, and 4 |
| Client and backend validation | Tasks 1, 3, and 4 |
| Timeout, cancellation, duplicate suppression, retry | Tasks 3, 4, and 7 |
| Side-effect-free Function cache only | Task 3 |
| `changedObjects` scoped refresh | Task 6 |
| One coherent `TRIGGER_EVAL` | Task 6 and Task 7 |
| Unsaved input preservation/conflict marker | Task 7 |
| Native Query Action regression | Task 8 |
| Manual Button/Text/Table verification | Task 8 |

## Plan Self-Check

- Spec coverage: all sections of `docs/superpowers/specs/2026-08-04-t5-function-action-execution-design.md` map to Tasks 1-8 and the Verification Matrix.
- Placeholder scan: every implementation step specifies concrete files, interfaces, behavior, and verification commands.
- Type consistency: `CelanworksmithExecutionMeta`, `CelanworksmithExecutionState`, `CelanworksmithRequestState`, `CelanworksmithFunctionEntity`, and `CelanworksmithActionEntity` are defined before their consuming tasks.
- Scope check: no T6 Widget implementation, multi-object Action contract, polling, WebSocket, global dependency graph, or `$reason` integration is included.
- Worktree safety: the plan does not instruct a destructive reset or a Git commit; execution must work with the existing dirty workspace.
