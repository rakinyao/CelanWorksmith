# T-Foundation Ontology Project 与 App 绑定设计

记录日期：2026-08-06  
阶段：T-Foundation 第一阶段  
范围：Ontology Project 导入、App 绑定、MongoDB Runtime Data Provider

## 1. 目标

将当前写死在 Mock Provider 中的本体定义和运行时数据拆分为两个可替换的边界：

1. 以 YAML 文件作为 Ontology Project 的交换和版本管理格式。
2. 将 YAML 导入后保存为可查询的版本化 Ontology Project。
3. 创建 App 时可绑定一个 Ontology Project 及其版本。
4. 编辑器根据 App 绑定加载本体元数据。
5. 使用现有 MongoDB 模拟唯一只读运行时数据源。
6. 让 `{{$objects.PurchaseOrder.all}}` 等既有绑定继续工作。

目标闭环：

```text
YAML Ontology Project
        -> Import / Validate
        -> Ontology Project Registry
        -> Create App + App Binding
        -> Ontology Provider
        -> MongoDB Runtime Data Provider
        -> $objects DataTree
        -> Existing Widgets
```

## 2. 非目标

本阶段不实现：

- 本体建设管理平台的实时同步。
- 真实唯一只读数据源平台的接入。
- 生产 Action Server 的审计、审批和设备写回。
- App 发布快照、版本迁移和运行态发布校验。
- 全部 Widget 的本体感知属性面板。
- 用 YAML 直接作为生产运行时数据源。

Action 元数据继续从当前 Ontology Provider 暴露，现有 Mock Action 执行链保留；真实 Action Server 只在本阶段预留 Provider 边界，不作为放行条件。

## 3. 架构原则

### 3.1 定义面、数据面和执行面分离

```text
Ontology Management Platform / YAML
                |
                v
      Ontology Project Registry
                |
                v
       OntologyProvider
                |
                +-- Object/Property/Link metadata
                +-- Function/Action metadata

Read-only data platform / MongoDB simulation
                |
                v
      RuntimeDataProvider
                |
                +-- Object Set query
                +-- Object Instance query
                +-- Link query

CelanWorksmith ActionProvider
                |
                +-- Current Mock execution
                +-- Future Action Server
```

Ontology Project 不保存运行时对象实例；Runtime Data Provider 不定义本体结构；Action Provider 不直接暴露数据库写权限。

### 3.2 App 绑定是 App 级资源

绑定不写入页面 DSL，也不复制完整本体定义到页面。逻辑模型为：

```text
applicationId -> projectId + projectVersion + providerId
```

物理实现使用独立的 CelanWorksmith App Binding 记录，避免修改 Appsmith 核心 Application 文档结构，并保证一个 App 的多个页面共享同一绑定。

### 3.3 Provider 屏蔽物理来源

前端、Widget 和 DataTree 只依赖统一 API 和稳定的 Object DTO。MongoDB 集合名、未来虚拟表名和本体建设管理平台数据库表名都不能进入 Widget 配置。

## 4. Ontology Project 文件标准

### 4.1 目录结构

```text
ontology-project/
├── ontology.yaml
├── objects/
│   ├── Supplier.yaml
│   └── PurchaseOrder.yaml
├── links/
│   └── supplier_orders.yaml
├── functions/
│   └── CalculateDelayDays.yaml
├── actions/
│   └── UpdateProductionSchedule.yaml
└── fixtures/
    └── runtime-data.yaml
```

`fixtures` 仅供开发和测试使用，正式 Project 定义与测试数据分离。

### 4.2 工程索引

`ontology.yaml` 负责工程身份、版本和文件索引：

```yaml
schemaVersion: 1
projectId: celanworksmith-demo
name: CelanWorksmith Demo Ontology
version: 1.0.0
description: Demo ontology for local development
objects:
  - objects/Supplier.yaml
  - objects/PurchaseOrder.yaml
links:
  - links/supplier_orders.yaml
functions:
  - functions/CalculateDelayDays.yaml
actions:
  - actions/UpdateProductionSchedule.yaml
```

导入器以索引为入口读取文件，不扫描目录自动推断定义。所有文件路径必须限制在 Project 根目录内，禁止通过路径穿越读取文件。

### 4.3 Object 定义

Object 文件至少包含稳定身份、显示信息、主键、运行时逻辑表和 Property：

```yaml
schemaVersion: 1
typeId: PurchaseOrder
displayName: Purchase Order
description: Purchase order object
primaryKey: poId
runtimeTable: purchase_orders
properties:
  - propertyId: poId
    displayName: Purchase Order ID
    dataType: STRING
    required: true
  - propertyId: delayDays
    displayName: Delay Days
    dataType: INTEGER
    semanticType: duration.days
```

`runtimeTable` 是逻辑表标识，不是 MongoDB 集合名。Provider 负责将其映射到实际存储。

### 4.4 Link、Function 和 Action

- Link 定义来源 Object、目标 Object、关系方向、关联键和显示名称。
- Function 定义稳定 ID、参数、返回类型和调用能力；不在 YAML 中保存执行代码。
- Action 定义稳定 ID、版本、目标 Object、参数、返回结构和刷新提示；不在 YAML 中保存数据库写入逻辑。

执行代码和数据写回分别归属 Runtime Provider 与未来 Action Server。

## 5. 服务端领域模型

### 5.1 Ontology Project Registry

Registry 保存导入后的规范化 Project：

```text
projectId
name
version
schemaVersion
status: ACTIVE | INVALID
source: YAML | MANAGEMENT_PLATFORM
definition
createdAt
updatedAt
```

同一个 `projectId + version` 必须不可变。修改定义必须生成新版本，避免已经绑定的 App 产生隐式变化。

第一阶段使用当前 MongoDB 实例中的独立数据库 `celanworksmith_ontology` 保存 Registry 和 App Binding；它与 Appsmith 业务数据库及 `celanworksmith_runtime` 数据库隔离。未来接入本体建设管理平台时，只替换 Registry Provider，不改变 App Binding 和应用侧 API。

### 5.2 App Binding

Binding 保存：

```text
applicationId
projectId
projectVersion
providerId: mongodb-readonly
status: READY | ERROR
error
createdAt
updatedAt
```

绑定时校验 Project 和版本存在且状态为 `ACTIVE`。删除或停用被 App 使用的版本时必须拒绝，不能让已有 App 静默失去本体。

### 5.3 Provider 接口

服务端保留或扩展以下边界：

```text
OntologyProvider
  getProject(applicationId)
  getObjectTypes(applicationId)
  getLinkTypes(applicationId)
  getFunctions(applicationId)
  getActions(applicationId)

RuntimeDataProvider
  queryObjects(applicationId, typeId, query)
  getObject(applicationId, typeId, objectId)
  queryLinks(applicationId, linkTypeId, sourceId, query)

ActionProvider
  execute(applicationId, actionId, request)
```

现有 API 可保持兼容：未携带 `applicationId` 的内部 Mock 测试继续使用默认 Demo Project；编辑器发出的正式请求必须携带当前 App 上下文。

## 6. MongoDB 运行时模拟

### 6.1 数据库隔离

使用现有 MongoDB 实例的独立数据库：

```text
mongodb://localhost:27017/celanworksmith_runtime
```

该数据库只模拟唯一只读数据源，不使用 Appsmith 自身业务数据库，也不允许 CelanWorksmith 业务 API直接修改对象集合。

### 6.2 文档形态

每个逻辑运行时表使用文档表示对象实例：

```json
{
  "_id": "PO001",
  "objectTypeId": "PurchaseOrder",
  "properties": {
    "poId": "PO001",
    "delayDays": 0,
    "supplierId": "S001"
  },
  "updatedAt": "2026-08-06T00:00:00Z"
}
```

MongoDB 集合名由 Provider 配置或映射表决定，不由前端传入。查询只允许使用 Ontology Project 中声明的 Property、排序字段和分页范围。

### 6.3 兼容当前 Mock Provider

第一阶段保留当前 MockDataStore，新增 MongoDB Provider 后通过配置选择：

```text
CELANWORKSMITH_RUNTIME_PROVIDER=mongodb
CELANWORKSMITH_RUNTIME_MONGODB_URI=mongodb://localhost:27017
CELANWORKSMITH_RUNTIME_MONGODB_DATABASE=celanworksmith_runtime
```

默认开发配置可以继续使用 Mock Provider，切换到 MongoDB Provider 作为本阶段手工验收模式。两种 Provider 必须返回相同的 `ObjectInstanceDTO`、`ObjectSetResult` 和结构化错误。

## 7. API 与数据流

### 7.1 Project API

建议增加：

```text
GET  /api/v1/celanworksmith/ontology/projects
GET  /api/v1/celanworksmith/ontology/projects/{projectId}/versions
GET  /api/v1/celanworksmith/ontology/projects/{projectId}/versions/{version}
POST /api/v1/celanworksmith/ontology/projects/import
```

Import API 接收一个 multipart ZIP 工程包。ZIP 根目录必须包含 `ontology.yaml`，其余 YAML 文件只能位于索引引用的 Project 子目录内。服务端完成 ZIP 条目路径限制、Schema 校验、引用校验和版本唯一性校验后，才写入 Registry。

### 7.2 App Binding API

```text
GET  /api/v1/celanworksmith/applications/{applicationId}/ontology-binding
PUT  /api/v1/celanworksmith/applications/{applicationId}/ontology-binding
DELETE /api/v1/celanworksmith/applications/{applicationId}/ontology-binding
```

`PUT` 请求包含 `projectId`、`projectVersion` 和 `providerId`。接口必须校验当前用户对 App 的权限，并检查绑定的 Project 版本。

### 7.3 App 创建流程

第一版可以在现有 App 创建成功后立即完成绑定，用户体验上仍属于同一个创建向导：

```text
填写 App 名称和工作区
        -> 选择 Ontology Project / Version
        -> 创建 App
        -> 保存 Binding
        -> 打开编辑器
```

若 App 创建成功但 Binding 保存失败，App 保留为未绑定状态，向导显示可重试错误，不删除已创建的 App。

### 7.4 编辑器加载流程

```text
AppIDE mount
  -> fetch application binding
  -> fetch bound ontology metadata
  -> load object data through MongoDB RuntimeDataProvider
  -> build $objects DataTree
  -> trigger evaluation and autocomplete refresh
```

Project 不存在、版本无效、Provider 不可用和数据查询失败必须分别显示结构化错误；元数据失败不能导致编辑器白屏。

## 8. 前端改造边界

- 增加 Ontology Project 列表和版本选择状态。
- 在创建 App 流程加入可选的 Project/Version 选择。
- 增加 App Binding Loader，先加载绑定再加载 Ontology。
- 现有 `CelanworksmithOntologyLoader`、`CelanworksmithObjectsLoader` 和变量 Loader 改为读取当前 App 上下文。
- 保持 `$objects`、`$functions`、`$actions`、`$variables` 的表达式契约不变。
- 对未绑定 App 保留当前 Mock 默认行为，避免既有测试和旧 App 失效。
- Ontology Explorer 显示当前 Project、版本、Provider 和加载状态。

Widget 不直接访问 Project API 或 MongoDB API，只继续消费 DataTree 和统一 Widget 查询层。

## 9. 错误与安全

- YAML 必须进行 Schema、引用、重复 ID、版本和路径安全校验。
- Project 版本采用不可变策略，禁止覆盖已被 App 绑定的版本。
- App Binding API 继承 Appsmith App 权限校验。
- Runtime 查询由服务端根据绑定解析 Object Type，不信任前端传入的集合名。
- MongoDB 运行时账号只授予 `celanworksmith_runtime` 数据库读权限。
- 过滤、排序和分页继续使用 Object metadata 白名单校验。
- 未绑定 App 不得读取任意 Project 或运行时集合。
- 错误响应继续使用现有 CelanWorksmith 结构化错误模型。

## 10. 迁移与兼容

- 现有 Mock Ontology 作为内置 `celanworksmith-demo` Project 导入数据保留。
- 现有未绑定 App 继续使用兼容模式，不强制补绑定。
- 现有 `$objects`、Function、Action、Object Query 和 Widget DSL 不改名、不改表达式格式。
- 旧页面没有 Project/Binding 字段时按未绑定状态处理。
- T8 的 `celanworksmithVariables` 页面 DSL 字段保持不变；变量通过现有对象和 Function 状态继续工作。

## 11. 分阶段交付

### T-Foundation.1：Project 文件与导入校验

交付 YAML 示例工程、Schema、导入器、引用校验和 Project Registry 单元测试。

### T-Foundation.2：App Binding 服务

交付绑定数据模型、API、权限校验、版本校验和未绑定兼容模式。

### T-Foundation.3：MongoDB Runtime Provider

交付独立运行时数据库、种子数据、只读查询、Object DTO 转换和 Provider 定向测试。

### T-Foundation.4：创建 App 与编辑器加载

交付创建向导中的 Project 选择、Binding 保存、编辑器绑定加载、Ontology Explorer 状态和错误重试。

### T-Foundation.5：端到端验收

验证创建 App、绑定 Project、重新进入 App、读取 MongoDB Object、Table 展示 `$objects.PurchaseOrder.all`，并回归未绑定旧 App。

每个子阶段都必须独立测试和记录，前一阶段未通过时不进入下一阶段。

## 12. 放行标准

- 一个 YAML Project 可以成功导入并被查询。
- 同一个 Project 的版本可以被列出和选择。
- 新建 App 可以绑定 Project 和版本。
- 刷新、重新登录或重新进入 App 后绑定不丢失。
- 编辑器能显示绑定 Project 的 Object、Property、Link、Function、Action。
- MongoDB Runtime Provider 能返回 `PurchaseOrder` 对象集合和单实例。
- `{{$objects.PurchaseOrder.all}}` 可以在 Table Widget 中显示数据。
- 绑定不存在的 Project/Version 时显示结构化错误并允许重试。
- 未绑定旧 App 的 Query 和既有本体兼容模式不回归。
- 全部新增代码有前后端定向测试，且 `git diff --check` 通过。

## 13. 后续设计入口

本阶段完成后，再单独设计第二阶段的 Widget Compatibility Matrix 和统一 Metadata Adapter。第二阶段不直接扩展所有 Widget，而是先定义通用绑定契约，再按 Table、Form、Detail、Select、List、Chart 等类别逐步接入。
