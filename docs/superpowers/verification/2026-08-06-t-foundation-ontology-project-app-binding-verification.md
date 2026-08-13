# T-Foundation Ontology Project 与 App 绑定验收记录

记录日期：2026-08-06  
当前分支：`codex/celanworksmith-t5-checkpoint`  
范围：T-Foundation Task 1-6；不包含 T9 发布能力。

## 1. 已实现闭环

```text
Ontology YAML ZIP
  -> 校验与导入
  -> celanworksmith_ontology Registry
  -> App Binding(projectId/version/providerId)
  -> 编辑器绑定门控
  -> Ontology Provider + Mongo Runtime Provider
  -> $objects DataTree
  -> Table/ObjectDetail/Variables/Function Widget 链路
```

关键边界：

- YAML 只作为交换和版本管理格式，运行时不直接读取 YAML。
- Registry/Binding 使用 `celanworksmith_ontology`，运行时模拟数据使用 `celanworksmith_runtime`。
- 浏览器只传 `applicationId`、对象类型和经过校验的查询条件，不传 Mongo 集合名。
- 未绑定旧 App 保留 Mock/Legacy 兼容路径；绑定 App 的 Ontology、Objects、Object Query、Variables、Function Variable 都等待绑定解析并携带 App 上下文。
- App 切换时清理本体、对象、查询和执行缓存，Function 缓存键按 App 隔离。

## 2. 验证命令

### 后端

```bash
cd app/server
mvn -pl appsmith-server -am \
  -Dtest='com.celanworksmith.ontology.project.OntologyProjectYamlImporterTest,com.celanworksmith.ontology.OntologyProjectControllerTest,com.celanworksmith.ontology.MongoOntologyProjectRegistryTest,com.celanworksmith.application.CelanworksmithApplicationBindingControllerTest,com.celanworksmith.application.CelanworksmithApplicationBindingServiceTest,com.celanworksmith.runtime.MongoRuntimeDataProviderTest,com.celanworksmith.runtime.MockRuntimeProviderTest,com.celanworksmith.controller.CelanWorksmithControllerTest' \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

最终 Task 6 指定后端回归：命令退出码 `0`。

### 前端

```bash
cd app/client
./node_modules/.bin/jest --config jest.config.js \
  src/api/__tests__/CelanworksmithAPI.test.ts \
  src/sagas/__tests__/CelanworksmithExecutionSaga.test.ts \
  src/sagas/__tests__/CelanworksmithOntologySaga.test.ts \
  src/sagas/__tests__/CelanworksmithObjectsSaga.test.ts \
  src/sagas/__tests__/CelanworksmithObjectQuerySaga.test.ts \
  src/reducers/celanworksmithApplicationBindingReducer.test.ts \
  src/reducers/celanworksmithExecutionReducer.test.ts \
  src/selectors/celanworksmithApplicationBindingSelectors.test.ts \
  src/pages/AppIDE/components/CelanworksmithApplicationBindingLoader.test.tsx \
  src/pages/AppIDE/components/CelanworksmithApplicationBindingPanel.test.tsx \
  src/pages/AppIDE/components/CelanworksmithVariablesLoader.test.tsx \
  src/pages/AppIDE/components/CelanworksmithOntologyLoader.test.tsx \
  src/pages/AppIDE/components/OntologyExplorer/index.test.tsx \
  src/widgets/TableWidget/component/ObjectTableMode.test.tsx \
  --runInBand --no-cache
```

最终结果：14 个测试套件、89 个测试通过，命令退出码 `0`。

### 格式与类型

```bash
git diff --check
cd app/client
./node_modules/.bin/prettier --check <changed-files>
yarn check-types
```

`git diff --check` 和变更文件 Prettier 检查应通过。当前仓库整体 `yarn check-types` 仍受既有 React/设计系统类型错误以及 T8 相关类型错误影响，不能作为本阶段的通过条件；未发现新增 CelanWorksmith 专属错误。

## 3. API 验收路径

```text
GET  /api/v1/celanworksmith/ontology/projects
GET  /api/v1/celanworksmith/ontology/projects/{projectId}/versions
GET  /api/v1/celanworksmith/ontology/projects/{projectId}/versions/{version}
GET  /api/v1/celanworksmith/applications/{applicationId}/ontology-binding
PUT  /api/v1/celanworksmith/applications/{applicationId}/ontology-binding
GET  /api/v1/celanworksmith/ontology/object-types?applicationId={applicationId}
GET  /api/v1/celanworksmith/runtime/objects/PurchaseOrder?applicationId={applicationId}&limit=10
```

绑定成功后，运行时查询应返回 `PurchaseOrder` 的对象集合；未绑定请求仍走 Mock Provider。Project 版本不可覆盖，Binding 保存前校验 Project/Version 存在且有效。

## 4. 本地数据准备

MongoDB 地址：`mongodb://localhost:27017`。运行时数据脚本和 JSON fixture 位于：

```text
scripts/celanworksmith/seed-runtime-mongodb.js
scripts/celanworksmith/runtime-data/purchase_orders.json
scripts/celanworksmith/runtime-data/suppliers.json
```

执行：

```bash
mongosh mongodb://localhost:27017 scripts/celanworksmith/seed-runtime-mongodb.js
```

当前环境已确认 MongoDB 可连接，但未安装 `mongosh`，因此真实 seed 和浏览器端 Mongo 数据验收仍需手工执行。

## 5. 手工验收清单

- [ ] 新建 App 后，在编辑器根部绑定面板选择 `celanworksmith-demo / 1.0.0` 和 `mongodb-readonly`。
- [ ] 刷新或重新进入 App，确认绑定仍存在。
- [ ] Ontology Explorer 显示 Object、Link、Function、Action。
- [ ] Table Widget Object 模式绑定 `{{$objects.PurchaseOrder.all}}`，显示行和 Columns。
- [ ] ObjectDetail 绑定 `{{$objects.PurchaseOrder.PO001}}`，显示对象属性。
- [ ] Variables、Function Variable 和 Function Action 的绑定上下文不串 App。
- [ ] 模拟无效版本或服务失败，确认错误可见并可 Retry；恢复有效版本。
- [ ] 进入既有未绑定 App，确认旧 Mock/Native Query 路径仍可用。

## 6. 残余风险

- 真实 Mongo Registry/Runtime 集成、`mongosh` seed 和浏览器验收尚未在当前执行中完成。
- 全仓库类型检查受基线类型错误影响；应继续使用定向 Jest、JUnit 和 Prettier 作为当前阶段的自动化门禁。
- Action Server、真实只读数据平台同步、发布快照和 T9 校验仍未实现。
