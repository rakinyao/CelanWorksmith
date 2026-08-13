# CelanWorksmith T8 基础能力检查点

记录日期：2026-08-06  
检查点范围：T0-T8 基础能力  
当前分支：`codex/celanworksmith-t5-checkpoint`  
Git 基线：`f68625bd1b feat: add object mode to json form`

## 1. 检查点定位

本检查点用于固化 T0-T8 已完成的本体应用基础能力，作为后续“完善与优化”工作的恢复基线。

包含范围：

- T0-T2：开发基线、Mock Ontology、Runtime API 和运行环境。
- T3-T4：Ontology Explorer、对象数据加载、`$objects` 数据树和 Widget 绑定。
- T5：Function/Action 元数据、异步执行、状态、刷新和错误链路。
- T6：ObjectDetail、FilterList、ActionButton 第一批 Object-aware Widget。
- T7：Table/Form Object 模式和共享 Object Query Layer。
- T8：Variable 定义、依赖图、异步加载、求值、持久化和 `$variables` 自动补全。

本检查点不包含 T9 的应用发布固化、发布态快照、版本迁移和运行时兼容性校验，也不代表生产发布版本。

当前工作区仍包含大量未提交的 T5-T8 变更。本次只建立文档检查点，未执行 `git commit`、未创建 tag、未重置或覆盖已有改动。

## 2. 当前能力结论

- 本体数据可以通过统一 Runtime API 进入编辑器 DataTree。
- Function 和 Action 使用异步节点执行，不在同步表达式求值过程中直接发起网络请求。
- Object-aware Widget 复用统一的 API、Redux/Saga、查询和执行链。
- Variable 定义保存在页面 DSL，变量值通过 `$variables.<name>` 暴露给 Widget 表达式。
- ObjectSet、ObjectProperty、Function、Aggregation 四类 Variable 已建立第一版契约和求值链。
- 原生 Query、`$objects`、`$functions`、`$actions` 和既有 Widget 行为保持独立。

## 3. 整体架构

```text
Appsmith Editor / Widget DSL
          |
          v
  AppIDE 根组件加载器
  |       |        |
  |       |        +-- CelanworksmithVariablesLoader
  |       +----------- CelanworksmithObjectsLoader / Metadata Loader
  +------------------- Ontology Explorer
          |
          v
      Redux State
  |        |          |
  |        |          +-- Object Query State
  |        +------------- Objects / Execution State
  +---------------------- Variable Definitions
          |
          v
  DataTree Selectors / PostEvaluationSagas
  |       |        |         |
  |       |        |         +-- $variables
  |       |        +------------ $functions / $actions
  |       +--------------------- $objects
  +----------------------------- Native Query Tree
          |
          v
  Tern Autocomplete Definitions
          |
          v
  Nginx -> Appsmith Backend -> CelanWorksmith Provider
                              |
                              +-- Mock Ontology Provider
                              +-- Mock Runtime Provider
                              +-- MongoDB / Redis
```

### 3.1 分层职责

| 层 | 主要职责 | 当前实现 |
|---|---|---|
| Ontology | Object Type、Property、Link、Function、Action 元数据 | Mock Provider + Ontology API |
| Runtime | 对象查询、关联查询、Function/Action 执行 | Mock Runtime Provider |
| API Client | 统一请求路径、响应包装和错误转换 | `CelanworksmithAPI` |
| Redux/Saga | 加载、查询、执行、刷新、去重和状态管理 | Objects/Object Query/Execution Saga |
| DataTree | 将本体结果暴露给表达式和 Widget | `$objects`、`$functions`、`$actions`、`$variables` |
| Widget | 展示、配置和用户交互 | ObjectDetail、FilterList、ActionButton、Table/Form |
| Persistence | 保存 Variable 定义 | 页面根 DSL 的 `celanworksmithVariables` |
| Autocomplete | 根据当前数据树生成 Tern 定义 | `entityDefGeneratorMap` + `PostEvaluationSagas` |

## 4. 后端模块与依赖

后端 CelanWorksmith 代码位于 `app/server/appsmith-server/src/main/java/com/celanworksmith`：

- `api` / Port：定义 Ontology、Runtime Provider 的输入输出边界。
- `controller`：提供 `/api/v1/celanworksmith` API、认证保护和统一响应包装。
- `dto` / `error`：定义对象、关联、Function、Action、分页和结构化错误模型。
- `provider`：区分 Mock Provider 与未配置的 Production Provider。
- `runtime/mock`：维护 fixture，执行查询、过滤、排序、分页、Function、Action 和 Reasoning。
- `config`：注册 Provider、路由和默认配置。

当前 Mock 数据包含六类 Object Type：`Supplier`、`PurchaseOrder`、`ProductionOrder`、`DeliveryOrder`、`FinancialRecord`、`SupplierRating`；五类 Link Type、五个 Function 和四个 Action。Mock Action 变更保存在内存中，后端重启后恢复 fixture。

统一 API 前缀为：

```text
/api/v1/celanworksmith
```

典型接口为 `GET /ontology/object-types`、`GET /ontology/link-types`、`GET /ontology/functions`、`GET /ontology/actions`、`GET /runtime/objects/{typeId}`、`GET /runtime/objects/{typeId}/{objectId}`、`POST /runtime/functions/{functionId}` 和 `POST /runtime/actions/{actionId}`。

直接访问 `/runtime/...` 会返回 404，调试时必须使用完整 API 前缀。

## 5. 前端模块职责

### 5.1 Ontology 与对象加载

- `app/client/src/pages/AppIDE/AppIDE.tsx`：在编辑器根组件挂载本体对象、元数据和 Variable Loader，避免加载依赖用户是否打开 Explorer。
- `app/client/src/pages/AppIDE/components/OntologyExplorer/index.tsx`：展示 Object Type、Link、Function、Action 和 Variables，并处理元数据错误和 Retry。
- `app/client/src/pages/AppIDE/components/CelanworksmithObjectsLoader.tsx`：触发对象类型和实例加载，加载后通知重新求值。
- `app/client/src/api/CelanworksmithAPI.ts`：集中处理 API 请求、参数序列化和响应解析。

### 5.2 DataTree 命名空间

主要文件为：

- `app/client/src/entities/DataTree/dataTreeCelanworksmith.ts`
- `app/client/src/entities/DataTree/dataTreeCelanworksmithExecution.ts`
- `app/client/src/entities/DataTree/dataTreeCelanworksmithVariables.ts`
- `app/client/src/selectors/dataTreeSelectors.ts`
- `app/client/src/ce/entities/DataTree/types.ts`

当前命名空间为 `$objects`、`$functions`、`$actions` 和 `$variables`。对象节点支持：

```text
$objects.PurchaseOrder.all
$objects.PurchaseOrder.PO001
$objects.PurchaseOrder.PO001.orderNumber
```

Function/Action 支持 `.data`、`.run(...)` 和 `_meta.status` 等异步状态字段。

### 5.3 Object-aware Widget

- ObjectDetail：单对象展示、属性分组、Link 关联对象；第一个 Link 预读，其余 Link 懒加载。
- FilterList：根据 Object Type 元数据生成过滤器，输出版本化结构化 Filter JSON。
- ActionButton：校验 Action、Object 和参数，复用 T5 Action 执行链并展示执行状态。
- Table：Object 模式支持 metadata 列、分页、排序、过滤和选择输出；Query 模式保持原有分支。
- JSON Form：Object 模式支持字段类型、required/readOnly、本地编辑和 Action 提交；Query 模式保持原有流程。

### 5.4 Object Query Layer

查询状态按 `widgetId/typeId/query` 隔离，并统一维护：

```text
idle -> loading -> ready
                 -> empty
                 -> error
```

查询层负责分页、排序、过滤白名单校验、稳定查询键、重复请求抑制和刷新期间保留上一份成功结果。Widget 不应自行拼接 Runtime 请求或复制缓存逻辑。

## 6. T8 Variable 契约

### 6.1 定义存储与校验

Variable 定义存储在当前页面根 `CANVAS_WIDGET` 的 `celanworksmithVariables` 字段中。第一版 Schema 版本为 `1`；旧页面缺少该字段时按空数组处理。

每个定义包含：

```text
id, name, kind, version, updatedAt, dependencies, config
```

`kind` 为 `OBJECT_SET`、`OBJECT_PROPERTY`、`FUNCTION` 或 `AGGREGATION`。名称遵守 JavaScript 标识符规则，ID 和名称均不可重复。保存前校验缺失依赖、拓扑排序和循环路径。

### 6.2 四类 Variable

| 类型 | 配置 | 输出 |
|---|---|---|
| `OBJECT_SET` | Object Type、Filter、排序、分页 | 对象数组，复用 Object Query 异步加载 |
| `OBJECT_PROPERTY` | Object Type、Object ID、Property ID | 单个属性值 |
| `FUNCTION` | Function ID、参数对象 | Function 返回值，复用 Function 执行链 |
| `AGGREGATION` | 上游 Variable、`count/sum/avg/min/max`、可选属性 | 聚合结果 |

每个变量节点包含 `_meta.status`：`idle`、`loading`、`ready`、`empty`、`error`，以及 `type`、`updatedAt`、`dependencies` 和可选 `error`。

### 6.3 求值与加载链

1. `CelanworksmithVariablesLoader` 从页面 DSL 读取定义。
2. 只为引用到的 ObjectSet 派发共享 Object Query，使用稳定的 `$variable/<id>` 查询标识。
3. 只为引用到的 Function 派发既有 Function Run Action，并按 Function ID 与参数签名去重。
4. `buildCelanworksmithVariablesDataTree` 按拓扑顺序计算派生变量。
5. `dataTreeSelectors` 将结果合并为 `$variables`，不覆盖其他命名空间。
6. `PostEvaluationSagas` 将变量占位和实际值传给 Tern，刷新自动补全。

变量求值不直接修改其他变量，也不在 React 渲染函数内发起网络请求。

## 7. 关键类与函数索引

| 文件 | 关键符号 | 职责 |
|---|---|---|
| `app/client/src/celanworksmith/variables/variableUtils.ts` | `validateVariableDefinitions` | 校验名称、重复项、缺失依赖、循环并生成拓扑顺序 |
| 同上 | `aggregateValues` | 执行 count、sum、avg、min、max |
| `app/client/src/entities/DataTree/dataTreeCelanworksmithVariables.ts` | `buildCelanworksmithVariablesDataTree` | 从定义、对象、查询和执行状态生成 `$variables` |
| `app/client/src/celanworksmith/variables/variableLoaderUtils.ts` | loader helpers | 提取引用定义、构造查询请求并计算稳定签名 |
| `app/client/src/pages/AppIDE/components/CelanworksmithVariablesLoader.tsx` | `CelanworksmithVariablesLoader` | 触发变量依赖的异步加载 |
| `app/client/src/selectors/celanworksmithVariableSelectors.ts` | Variable selectors | 读取根 DSL、归一化定义和定位根 Widget |
| `app/client/src/selectors/dataTreeSelectors.ts` | `buildDataTreeForAutocomplete` | 合并本体节点与自动补全数据树 |
| `app/client/src/ce/utils/autocomplete/entityDefGeneratorMap.ts` | Variables generator | 为 `$variables.<name>` 生成 Tern 定义 |
| `app/client/src/sagas/PostEvaluationSagas.ts` | autocomplete refresh | 在变量值变化后刷新补全定义 |
| `app/server/.../runtime/mock/MockDataStore.java` | Mock runtime store | Fixture、结构化过滤、查询和 Mock Action 变更 |

## 8. 已知限制与 T9 边界

当前不阻塞基础能力检查点的问题：

- 全仓库 TypeScript 检查仍受 Appsmith 原有 design-system、WDS 和 JSX 类型环境错误影响；本阶段采用定向测试和变更模块检查。
- 前端构建日志保留 BetterBugs `worker_threads`、chunk circular dependency、InjectManifest watch 等既有 warning。
- Explorer 测试有既有 React `act` 警告；Maven 有 Java 弃用和多个 SLF4J provider warning。
- Appsmith datasource template 的 PF4J 插件错误仍是已知环境问题，不属于 T8 Variable 链路。

后续完善范围包括 Variables 高级编辑、批量导入、依赖图可视化、原生 Table 样式复用、跨页多选、复杂 Form 字段、动态属性面板和统一的本体数据源适配层。

T9 负责发布态 Variable/Widget 绑定快照、版本迁移、兼容性告警、云端运行态本体版本校验和应用发布固化。本检查点不提前实现这些内容。

## 9. T-Foundation Ontology Project 绑定扩展

在本检查点之上已完成第一阶段工程化扩展：

- Ontology YAML 工程经过导入校验后保存到独立 Registry，Project 版本不可覆盖。
- App 保存 `projectId`、`projectVersion` 和 `providerId` 绑定；编辑器根组件加载 Binding 并显示绑定面板。
- 绑定态 Ontology、Objects、Object Query、Variables 和 Function Variable 请求使用 `applicationId`；未绑定旧 App 保留 Legacy/Mock 兼容路径。
- Mongo Runtime Provider 使用独立的 `celanworksmith_runtime` 数据库和服务端逻辑表白名单，Widget 仍只消费 `$objects` DataTree。
- App 切换清理对象、本体、查询和执行缓存；Function 缓存按 App 隔离。

详细自动化结果、API 路径、运行命令和手工验收清单见：
`docs/superpowers/verification/2026-08-06-t-foundation-ontology-project-app-binding-verification.md`。

本体工程导入、创建 App 绑定、重新打开 App、Table Object Mode 和 FilterList/Table 联动已完成手工验收。详细结果见 `CelanWorksmith_T-Foundation阶段检查点.md`。旧未绑定 App 的兼容性仍作为后续回归项保留。

## 9. 验证证据

### 9.1 本次重新执行

前端定向 Jest：8 个测试套件、17 个测试通过，0 失败，0 错误。命令：

```bash
cd app/client
./node_modules/.bin/jest --config jest.config.js \
  src/celanworksmith/variables/variableUtils.test.ts \
  src/celanworksmith/variables/variableLoaderUtils.test.ts \
  src/entities/DataTree/dataTreeCelanworksmithVariables.test.ts \
  src/selectors/celanworksmithVariableSelectors.test.ts \
  src/selectors/dataTreeSelectors.test.ts \
  src/pages/AppIDE/components/CelanworksmithVariablesLoader.test.tsx \
  src/pages/AppIDE/components/OntologyExplorer/VariablesSection.test.tsx \
  src/pages/AppIDE/components/OntologyExplorer/index.test.tsx \
  --runInBand --no-cache
```

后端定向 Maven：12 个测试通过，0 失败，0 错误，`BUILD SUCCESS`。命令：

```bash
cd app/server
mvn -pl appsmith-server -am \
  -Dtest='com.celanworksmith.controller.CelanWorksmithControllerTest,com.celanworksmith.runtime.MockRuntimeProviderTest' \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

工作区 `git diff --check` 通过。

### 9.2 服务探针

2026-08-06 验证结果：Nginx `127.0.0.1:80` 返回 HTTP `200`；前端 `0.0.0.0:3000`、后端 `127.0.0.1:8081`、RTS `127.0.0.1:8091`、MongoDB `127.0.0.1:27017`、Redis `127.0.0.1:6379` 均在监听；未认证 Object Runtime API 返回 HTTP `401`，认证保护正常。

局域网入口：`http://10.10.110.129/`。

## 10. 手工回归入口

Object/Function 基础绑定：

```text
Table Data: {{$objects.PurchaseOrder.all}}
Text: Delayed {{$functions.CalculateDelayDays.data}} days
Button onClick: {{$functions.CalculateDelayDays.run({ poId: "PO005" })}}
```

预期：按钮执行完成后 Text 显示 `Delayed 8 days`；使用 `PO001` 应显示 `Delayed 0 days`；不存在的对象 ID 不应覆盖上一次成功的 `.data`，失败原因通过 `_meta` 查看。

Variable 基础绑定：

```text
Table Data: {{$variables.delayedOrders}}
Text: Delayed orders: {{$variables.delayedOrderCount}}
```

建议顺序：创建 `PurchaseOrder` 的 `delayDays gt 0` ObjectSet，再创建其 `count` Aggregation，修改过滤条件，刷新页面确认定义恢复，最后验证缺失依赖和循环依赖被阻止保存。

## 11. 后续开发约束

1. 继续开发前确认 T5-T8 变更仍存在，不使用 `git reset --hard`、`git checkout --` 或覆盖式清理。
2. 若前端出现 502，优先检查 `3000` 前端进程；502 通常表示 Nginx 上游前端进程退出。
3. 新增 Widget 或绑定能力必须复用 `CelanworksmithAPI`、Object Query Layer、Execution Saga 和 DataTree。
4. 修改 `$objects`、`$functions`、`$actions` 或 `$variables` 契约时，同步更新类型、自动补全、求值和定向测试。
5. 先统一本体数据源/元数据适配层，再扩展更多原生 Widget，避免逐个 Widget 建立独立绑定实现。
6. 每个后续优化阶段都应有独立文档、自动化测试和浏览器手工验证项，验证通过后再进入下一阶段。

## 12. 关联文档

- [`CelanWorksmith_分步实施计划.md`](CelanWorksmith_分步实施计划.md)
- [`CelanWorksmith_T5阶段检查点.md`](CelanWorksmith_T5阶段检查点.md)
- [`CelanWorksmith_T4阶段总结.md`](CelanWorksmith_T4阶段总结.md)
- [`docs/superpowers/verification/2026-08-05-t6-t7-stage-summary.md`](docs/superpowers/verification/2026-08-05-t6-t7-stage-summary.md)
- [`docs/superpowers/verification/2026-08-06-t8-variable-system-verification.md`](docs/superpowers/verification/2026-08-06-t8-variable-system-verification.md)
- [`docs/superpowers/plans/2026-08-06-t8-variable-system-plan.md`](docs/superpowers/plans/2026-08-06-t8-variable-system-plan.md)
- [`CelanWorksmith_T-Foundation阶段检查点.md`](CelanWorksmith_T-Foundation阶段检查点.md)
