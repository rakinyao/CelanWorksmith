# CelanWorksmith 分步实施计划

> 本文基于 `CelanWorksmith_开发规划方案.md`、当前仓库结构和现有开发环境制定。
> 目标是把粗粒度规划拆成若干可独立交付、可独立验证、可设置放行门槛的实施阶段。

## 1. 执行规则

### 1.1 总体原则

1. 每个阶段必须完成“代码实现、自动化测试、手工验证、文档记录”四项内容后才能关闭。
2. 未通过当前阶段验收时，不进入下一阶段；后续阶段不得通过临时旁路掩盖前一阶段的问题。
3. 所有本体能力先以 Mock Provider 打通，再设计真实 Layer 2/3 Provider 的接入，不等待上游系统完成。
4. 新增代码优先放在独立命名空间或独立模块内，减少直接改动 Appsmith 核心流程。
5. 破坏性改动必须有 feature flag、配置开关或数据迁移方案，并保留关闭开关后的原有行为。
6. 每个 API、DTO、表达式和持久化结构都要先确定版本和错误语义，再扩展调用方。

### 1.2 阶段完成定义

一个阶段只有同时满足以下条件，才算完成：

- 阶段内的代码和测试已合并到当前工作分支。
- 阶段验收命令可重复执行并通过。
- 阶段的手工验收记录已写入开发日志或 PR 描述。
- 已知限制、未解决问题和下一阶段前置条件已记录。
- 回滚方式明确，且不会破坏已有 Appsmith 原生能力。

### 1.3 当前工作区注意事项

当前工作区已有未提交改动，包括第一阶段中英双语基础能力和 `CODE_WIKI.md`。执行正式开发前应先：

- 逐项确认并保留现有双语改动，不回退用户已有文件。
- 将当前可运行状态建立为一个基线提交或至少建立可恢复的 Git tag。
- 不把构建产物、日志、临时配置和本地密钥提交到仓库。
- 后续每个阶段使用独立提交，提交信息中包含阶段编号，例如 `T1 ontology mock provider`。

## 2. 当前基线

### 2.1 真实项目结构

| 区域             | 当前实际位置                                                                                                   | 说明                                                                       |
| ---------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| React 前端       | `app/client`                                                                                                   | Yarn workspace，开发服务默认监听 3000                                      |
| Spring Boot 后端 | `app/server/appsmith-server`                                                                                   | 由 `app/server/pom.xml` 管理的 Maven 多模块工程                            |
| 后端构建入口     | `app/server/build.sh`                                                                                          | 使用 Maven，不使用规划文档中的 `./gradlew`                                 |
| Widget 实现      | `app/client/src/widgets`                                                                                       | 每个 Widget 通常包含 `index`、`widget` 和 `component`                      |
| Widget 注册      | `app/client/src/widgets/registry`、`app/client/src/WidgetProvider`                                             | 通过 `registrationHelper` 注册，不存在规划文档中的单一 `WidgetRegistry.ts` |
| Entity Explorer  | `app/client/src/pages/Editor/Explorer`、`app/client/src/components/editorComponents/EntityExplorerSidebar.tsx` | 现有 Pages、Widgets、Actions、JS Actions 等入口                            |
| 前端求值         | `app/client/src/workers/Evaluation`、`app/client/src/workers/common/DataTreeEvaluator`                         | 负责动态绑定和数据树求值                                                   |
| 动态绑定工具     | `app/client/src/utils/DynamicBindingUtils.ts`                                                                  | 负责绑定相关辅助逻辑                                                       |
| Action 编辑树    | `app/client/src/components/editorComponents/ActionCreator`                                                     | `ActionTree` 类型和交互编辑实现                                            |
| 后端 API         | `app/server/appsmith-server/src/main/java/com/appsmith/server/controllers`                                     | WebFlux/Spring Controller                                                  |
| 后端数据源       | `app/server/appsmith-server/src/main/java/com/appsmith/server/datasources`                                     | 原生 Datasource 体系                                                       |
| 后端插件         | `app/server/appsmith-server/src/main/java/com/appsmith/server/plugins`                                         | 原生 Plugin Service 和扩展点                                               |
| RTS 源码         | 当前仓库未发现 `app/rts`                                                                                       | 当前环境中的 RTS 为独立运行进程，不能假定其源码由本仓库维护                |

### 2.2 当前开发环境

当前环境已配置：

- MongoDB：Docker 容器 `appsmith-mongodb`，主机端口 `27017`。
- Redis：Docker 容器 `appsmith-redis`，主机端口 `6379`。
- Nginx：Docker 容器 `wildcard-nginx`，对外暴露 `80`。
- 前端开发服务：`3000`，由 Nginx `/` 代理。
- 后端服务：实际端口由 `PORT` 决定，当前运行环境使用 `8081`；源码默认值为 `8080`。
- RTS：Nginx `/rts` 转发到 `8091`，其源码和启动方式需要单独确认。
- 局域网访问地址：`http://10.10.110.129`。

标准启动验证：

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
curl -f http://127.0.0.1:8081/api/v1/health
curl -f http://127.0.0.1:3000/
curl -f http://10.10.110.129/
```

前端使用项目声明的 Node 版本和 Yarn：

```bash
export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"
cd app/client
yarn start
```

后端使用项目 Maven 和 Java 25 工具链。开发环境的实际 `PORT`、MongoDB URL、Redis URL 和加密配置必须通过环境文件或启动命令显式确认。

### 2.3 当前已有双语基线

现有双语改造包含：

- `app/client/src/i18n` 国际化基础设施。
- 登录、注册、密码重置、邮箱验证、用户菜单和部分公共文案。
- `en-US` / `zh-CN`、浏览器语言检测、localStorage 持久化和用户资料 `locale` 字段。
- 前端生产构建已验证成功。

后续计划只把这部分作为基线，不继续扩展全量业务中文化，除非另行安排。

## 3. 阶段总览

| 阶段 | 名称                       | 主要交付物                                              | 依赖       | 放行结果                                |
| ---- | -------------------------- | ------------------------------------------------------- | ---------- | --------------------------------------- |
| T0   | 基线冻结与环境复核         | 可恢复基线、环境记录、验证脚本                          | 无         | 原项目和双语基线可稳定运行              |
| T1   | 本体契约与 Provider 骨架   | DTO、Port、配置切换、错误模型                           | T0         | Mock/Production Provider 可切换         |
| T2   | Mock 本体与运行时服务      | 供应链数据、查询、关联、Function、Action、Reasoning API | T1         | 后端端到端 API 可验证                   |
| T3   | 前端本体 API 与 Explorer   | 本体只读树、详情面板、缓存、权限处理                    | T2         | 编辑器能浏览完整 Mock 本体              |
| T4   | `$objects` 只读绑定        | Object Set/Instance 绑定和依赖更新                      | T2、T3     | Text/Table 能读取本体数据且原绑定不回归 |
| T5   | Function 与 Action 执行链  | Function 调用、Action 触发、刷新和错误态                | T4         | 延期订单链路可执行并可观察              |
| T6   | Object-aware Widget 第一批 | ObjectDetail、FilterList、ActionButton                  | T3、T4、T5 | 无代码完成核心交互链路                  |
| T7   | Table/Form 本体模式        | 既有 Widget 的本体数据模式                              | T6         | Table/Form 可选择 Object Type           |
| T8   | Variable 系统              | ObjectSet、Property、Function、Aggregation Variable     | T4、T5     | 变量依赖图和聚合可用                    |
| T-Foundation | 本体工程导入与 App 绑定 | YAML Registry、App Binding、Mongo Runtime、第一批 Object 联动 | T8 | 创建 App、绑定本体并通过 Object Widget 验收 |
| T-Compatibility | 全面兼容本体 | Object Binding、Metadata Adapter、Widget Compatibility Matrix、按类别兼容原生 Widget | T-Foundation | Object 模式易用且原生 Query 不回归 |
| T9   | 应用固化与发布校验         | DSL 快照、版本、发布、兼容性告警                        | T-Compatibility | 应用可发布并在运行态校验                |
| T10  | Reasoning 与样板应用       | ReasoningPanel、三个验证应用、回归和性能基线            | T5、T6、T9 | 形成可演示的完整闭环                    |

T1 至 T5 是平台主链路；T6 至 T10 依次扩展用户体验和产品化能力。每一阶段都设置独立验收，未通过时只修复当前阶段范围。

## 4. T0：基线冻结与环境复核

### 4.1 目标

建立可重复的开发基线，确认当前 Appsmith 原生功能和双语改造均可启动。此阶段不新增本体业务代码。

### 4.2 实施内容

- 记录当前 Git 分支、提交号、Node、Yarn、Java、Maven 和 Docker 版本。
- 检查 MongoDB replica set、Redis、Nginx、后端、前端和 RTS 的实际状态。
- 固化前端、后端、API 健康检查和数据库连接检查脚本。
- 为本地配置建立脱敏模板，例如 `.env.example`，不提交真实密钥。
- 确认当前双语改造的文件列表和回滚方式。
- 创建基线提交或 tag，明确不包含后续本体代码。

### 4.3 验证

执行：

```bash
git status --short
node --version
yarn --version
java -version
mvn --version
docker ps
curl -f http://127.0.0.1:8081/api/v1/health
curl -f http://10.10.110.129/
```

手工验证：

1. 登录页中英文切换正常。
2. 注册页中英文切换正常。
3. 能登录并进入编辑器，忽略当前已知的非本阶段业务报错。
4. 创建一个最小应用并拖入一个原生 Text Widget。

### 4.4 完成标准

- 所有服务状态和端口有记录。
- 原生登录、注册、编辑器入口可访问。
- 构建基线可重复生成。
- 有一个可恢复的基线提交或 tag。

### 4.5 失败处理

环境、构建或原生编辑器不可用时，停止后续阶段，先修复基线。不得在 T1 中同时修改部署、数据库和本体代码。

## 5. T1：本体契约与 Provider 骨架

### 5.1 目标

定义不依赖真实 Layer 2/3 的稳定契约，并在现有 `appsmith-server` Maven 模块中建立 Mock/Production Provider 切换骨架。

### 5.2 设计调整

粗规划中的 `celanworksmith-ontology` 先不作为独立 Maven module 创建。第一阶段将代码放入现有 `appsmith-server`，使用独立包：

```text
com.celanworksmith.ontology
com.celanworksmith.runtime
```

原因是当前上游 API 尚未冻结，先减少 Maven 模块、依赖和部署复杂度；当契约稳定且需要独立发布时，再拆分 Maven module。

由于当前后端是 WebFlux，Port 方法优先使用 `Mono` / `Flux` 或明确的响应式返回类型，不直接照搬阻塞式 `List` 接口。

### 5.3 契约范围

新增并冻结以下 DTO：

- `ObjectTypeDTO`
- `PropertyDTO`
- `LinkTypeDTO`
- `FunctionDTO`
- `ActionTypeDTO`
- `ObjectInstanceDTO`
- `ObjectSetQuery`
- `ObjectSetResult`
- `ActionResult`
- `ReasoningResult`

除字段外必须明确：

- ID 是否全局唯一，是否允许显示名变化。
- 类型枚举和未知类型的兼容策略。
- `null`、缺失字段和空集合的含义。
- 分页的 `offset/limit` 与最大 `limit`。
- 排序字段白名单和非法过滤条件的错误码。
- Action 的幂等键、执行状态、变更记录和 side effect 结构。
- Function 的输入校验、超时、错误和输出类型。
- Reasoning 的证据、置信度、超时和降级结果。

### 5.4 实施任务

- 创建 Port 和 DTO 包，禁止依赖客户端类型。
- 定义统一的 `CelanWorksmithError`、错误码和 HTTP 映射。
- 定义 `OntologyProvider`、`RuntimeProvider` 配置属性。
- 实现 `@ConditionalOnProperty` 或等价的 Spring Bean 选择逻辑。
- 提供默认 `mock` 配置，避免本地环境因缺少真实上游 URL 无法启动。
- 提供 production Adapter 占位 Bean；占位实现必须返回明确的“未配置/未实现”错误，而不是静默返回空数据。
- 在配置文档中记录 provider 切换方式、启动时行为和健康检查行为。

建议配置：

```yaml
celanworksmith:
  ontology:
    provider: mock
    base-url: ""
  runtime:
    provider: mock
    base-url: ""
```

### 5.5 测试与验收

自动化：

- DTO 序列化/反序列化测试。
- 每个 Port 的契约测试，至少覆盖成功、空结果、非法参数和 Provider 错误。
- Mock 与 production 占位 Bean 的配置加载测试。
- 默认配置启动测试。

手工/API：

```bash
curl -f http://127.0.0.1:8081/api/v1/health
```

启动参数切换到 production 时，服务可以启动，但访问尚未实现的真实 Provider 必须得到结构化错误，不能返回 500 堆栈或假空数据。

### 5.6 放行条件

- 契约文档和 DTO 字段冻结。
- 默认 Mock 配置下后端启动成功。
- Mock/production 选择行为有自动化测试。
- 未修改 Appsmith 原生 Datasource、Action 和 Widget 的行为。

## 6. T2：Mock 本体与运行时服务

### 6.1 目标

实现供应链 Mock 场景，打通本体元数据、对象查询、关联查询、Function、Action 和 Reasoning 的服务端流程。

### 6.2 Mock 模型

实现六个 Object Type：

1. `Supplier`
2. `PurchaseOrder`
3. `ProductionOrder`
4. `DeliveryOrder`
5. `FinancialRecord`
6. `SupplierRating`

实现五个 Link Type：

1. `supplier_orders`
2. `po_production`
3. `po_delivery`
4. `po_finance`
5. `supplier_ratings`

初始化数据规模：

- Supplier：10 条。
- PurchaseOrder：200 条，其中至少 30 条延期。
- ProductionOrder：200 条。
- DeliveryOrder：200 条。
- FinancialRecord：200 条。
- SupplierRating：40 条。

数据生成必须使用固定随机种子或固定 fixture，保证测试结果可重复。场景中至少包含三个多次延期供应商和两个链式延期样本。

### 6.3 服务端实现

建议新增：

```text
com.celanworksmith.ontology.adapter.mock.MockOntologyProvider
com.celanworksmith.runtime.adapter.mock.MockRuntimeProvider
com.celanworksmith.runtime.mock.MockDataStore
com.celanworksmith.runtime.mock.MockDataInitializer
com.celanworksmith.ontology.controller.OntologyController
com.celanworksmith.runtime.controller.RuntimeController
```

`MockDataStore` 至少提供：

- 按 Object Type 查询。
- 按实例 ID 查询。
- 按 Link Type 查找关联对象。
- 对 Action 进行受控更新。
- 重置 fixture 的测试能力。
- 线程安全的读写策略。

### 6.4 REST API

第一版 API 固定在 `/api/v1/celanworksmith`：

```text
GET  /ontology/object-types
GET  /ontology/object-types/{typeId}
GET  /ontology/link-types?sourceTypeId={typeId}
GET  /ontology/functions
GET  /ontology/actions?objectTypeId={typeId}

GET  /runtime/objects/{typeId}
GET  /runtime/objects/{typeId}/{instanceId}
GET  /runtime/objects/{typeId}/{instanceId}/links?linkTypeId={linkTypeId}
POST /runtime/actions/{actionId}/execute
POST /runtime/functions/{functionId}/execute
POST /runtime/reasoning
```

查询参数必须明确过滤 JSON、排序、分页和错误返回。所有编辑器 API 默认继承 Appsmith 登录和权限保护，不允许匿名访问完整业务数据。

### 6.5 硬编码 Function 和 Action

Function 至少实现：

- `CalculateDelayDays`
- `CalculatePenalty`
- `CalculateAdjustedProfit`
- `CalculateMarginRate`
- `CalculateSupplierGrade`

Action 至少实现：

- `UpdateProductionSchedule`
- `UpdateDeliveryDate`
- `UpdateFinancialRecord`
- `NotifyProductionTeam`

Action 执行结果必须返回：成功标志、消息、变更对象、side effects、执行 ID。链式 Action 先在 Mock 中串行执行，明确失败时是否继续后续动作；本阶段不实现分布式事务。

### 6.6 验证

自动化：

- Fixture 数量和关系完整性测试。
- 过滤、排序、分页和不存在对象测试。
- Function 边界值测试，例如未交付订单、负延期天数、收入为 0。
- Action 变更前后状态测试。
- Reasoning 固定文本和证据字段测试。
- Controller HTTP 状态码和错误结构测试。

API 验收：

```bash
curl -f http://127.0.0.1:8081/api/v1/celanworksmith/ontology/object-types
curl -f 'http://127.0.0.1:8081/api/v1/celanworksmith/runtime/objects/Supplier?limit=10'
curl -f 'http://127.0.0.1:8081/api/v1/celanworksmith/runtime/objects/PurchaseOrder?limit=20'
```

Action 验收必须记录一个订单的修改前后 JSON，确保 `changes` 与实际查询结果一致。

### 6.7 放行条件

- 六个 Object Type、五个 Link Type 和固定规模数据全部可查询。
- 查询、关联、Function 和 Action API 均有自动化测试。
- 至少一个延期订单可以完成“计算—修改生产—修改交付—更新财务”的 Mock 链路。
- 重新启动服务后默认数据可重建，且不会依赖上一轮内存状态。

## 7. T3：前端本体 API 与 Entity Explorer

### 7.1 目标

在编辑器左侧 Explorer 中以只读方式展示本体元数据，为后续绑定和 Widget 选择提供统一数据源。

### 7.2 实施范围

新增前端 API 模块，建议放在：

```text
app/client/src/api/CelanWorksmithAPI.ts
app/client/src/api/CelanWorksmithAPI.test.ts
```

API 模块负责：

- Object Types。
- Link Types。
- Functions。
- Actions。
- Object Set 查询。
- Instance 和 Link 查询。
- Function、Action、Reasoning 调用。

状态管理应沿用现有 Redux/Saga 模式，不在每个 Widget 内部重复请求。缓存键至少包含 workspace、provider 版本和元数据类型。

### 7.3 Explorer UI

在现有 `app/client/src/pages/Editor/Explorer` 体系中新增“本体”区域或标签，不破坏 Pages、Widgets、Queries、Actions 和 JS Actions。

树结构：

```text
本体
├── Object Types
│   ├── Supplier
│   ├── PurchaseOrder
│   ├── ProductionOrder
│   ├── DeliveryOrder
│   ├── FinancialRecord
│   └── SupplierRating
├── Link Types
├── Functions
└── Actions
```

交互要求：

- 支持加载中、空数据、权限错误、Provider 错误和重试。
- Object Type 展开显示 properties。
- 点击节点通过现有属性面板机制显示详情。
- 元数据只读，编辑入口显示“请前往本体开发平台”。
- 节点名称同时保留稳定 ID 和 displayName，避免仅靠中文名称定位。

### 7.4 验证

自动化：

- API Client 请求、缓存和错误映射测试。
- Explorer 树展开、空态、错误态和节点选择测试。
- 现有 Explorer 相关 Jest 测试全部通过。

手工：

1. 打开编辑器并看到“本体”入口。
2. 展开后看到六个 Object Type。
3. 点击 Supplier，右侧看到字段类型、必填、只读和派生信息。
4. 切换到 Functions、Actions、Link Types，看到完整元数据。
5. 关闭 Mock Provider 或模拟接口错误，界面有可理解的错误态。

### 7.5 放行条件

- 本体 Explorer 不影响原有 Explorer 操作。
- 元数据只读展示稳定，刷新页面后仍可加载。
- 所有请求通过统一 API Client，不允许组件直接拼接 URL。

## 8. T4：`$objects` 只读绑定

### 8.1 目标

先实现只读对象绑定，支持 Widget 读取 Object Set、Object Instance 和属性，不在本阶段处理 Function、Action 或 `$reason`。

### 8.2 技术策略

粗规划中给出的 `DynamicBindingResolver.ts` 在当前仓库不存在，实际改造入口应先以测试确认：

- `app/client/src/workers/Evaluation`：绑定替换和求值流程。
- `app/client/src/workers/common/DataTreeEvaluator`：数据树生成和求值。
- `app/client/src/utils/DynamicBindingUtils.ts`：绑定辅助逻辑。
- `app/client/src/utils/autocomplete`：编辑器自动补全和类型提示。
- 服务端 `app/server/appsmith-server/src/main/java/com/appsmith/server/onload`：页面加载时的依赖发现。

实施顺序：

1. 先增加表达式解析和 AST/路径识别测试，不立即改求值。
2. 仅识别命名空间，不改变原有 Query、Widget、JSObject 绑定。
3. 先支持确定性路径：
   - `{{$objects.Supplier.all}}`
   - `{{$objects.Supplier.S001}}`
   - `{{$objects.Supplier.S001.name}}`
4. `filter()`、链式方法、异步 Action 和复杂表达式延后处理。
5. 对 Object Set 使用显式异步加载状态，不能在同步求值阶段阻塞主线程。

### 8.3 数据树和依赖

新增对象数据树节点时必须记录：

- Object Type。
- Instance ID（若存在）。
- 属性路径。
- 查询参数和分页信息。
- 请求状态、错误和更新时间。

缓存和依赖更新先采用 Object Type 级别失效，避免过早引入复杂依赖图；T10 再根据性能结果细化到实例级。

### 8.4 自动补全

在现有 autocomplete 体系中增加：

- 输入 `$objects.` 显示 Object Type。
- 输入 `$objects.Supplier.` 显示 `all` 和可用实例入口。
- 输入实例路径后显示 properties。

补全数据来自 T3 的元数据缓存，不另行请求上游。

### 8.5 验证

自动化：

- 解析四类合法路径和非法路径。
- Object Set、Instance、Property 三种返回形态。
- 加载中、空集合、404、权限错误和类型错误。
- 原有 `{{Query.data}}`、`{{Widget.prop}}`、`{{JSObject.fn()}}` 回归测试。
- 数据树依赖列表和重新求值测试。

手工：

1. Text Widget 的 Text 属性输入 `{{$objects.Supplier.S001.name}}`，显示供应商名称。
2. Table Widget 的数据属性输入 `{{$objects.PurchaseOrder.all}}`，显示 Mock 订单集合。
3. 改变 Mock 数据后，相关 Widget 能重新加载或明确显示需要刷新。
4. 原生 Query + Table 示例仍正常工作。

### 8.6 放行条件

- 只读对象绑定可用。
- 原有绑定兼容性测试通过。
- 没有在渲染线程中同步调用后端。
- 绑定错误可以定位到表达式和对象路径。

## 9. T5：Function 与 Action 执行链

### 9.1 目标

在 T4 只读数据能力稳定后，接入 Function 调用、Action 触发、执行状态、错误展示和数据刷新。

### 9.2 Function 调用

支持：

```text
{{$functions.CalculateDelayDays({poId: "PO001"})}}
```

要求：

- 参数从表达式或 Widget 状态安全序列化。
- 输入类型由 Function 元数据校验。
- 结果放入可追踪的数据节点，不直接修改原始 Object Set。
- 超时、错误和取消请求有明确状态。
- 同一只读 Function 请求具备合理缓存策略。

### 9.3 Action 触发

Action 不应作为普通同步表达式求值。应沿用 Appsmith 现有事件触发机制，在 `ActionExecution` 相关 Saga 中增加 CelanWorksmith Action 类型或独立触发适配层。

执行状态至少包括：

```text
IDLE -> QUEUED -> RUNNING -> SUCCEEDED
                         \-> FAILED
                         \-> CANCELLED
```

需要记录：

- actionId。
- objectIds。
- 参数摘要，敏感值脱敏。
- executionId。
- changes 和 sideEffects。
- 错误码和可展示消息。

### 9.4 数据刷新策略

Action 成功后按返回的 `changes` 计算受影响的 Object Type，至少支持：

- 当前 Object Set 失效并重新查询。
- 当前 Instance 局部更新。
- 关联对象视情况失效。
- 正在编辑的表单保留用户输入并提示数据已更新。

第一版不实现全局智能依赖图，先用显式刷新 Action 和 Object Type 级别失效保证正确性。

### 9.5 验证

自动化：

- Function 参数和返回值测试。
- Action Saga 状态流转测试。
- 成功、失败、超时、重复提交和取消测试。
- Action 成功后数据树刷新测试。
- 原生 Query Action 执行回归测试。

手工：

1. 在 Text Widget 中调用 `CalculateDelayDays` 并显示结果。
2. 触发 `UpdateProductionSchedule`，看到 loading 和成功提示。
3. 重新查询订单，确认生产订单计划日期变化。
4. 模拟 Action 失败，界面显示错误且不误报成功。

### 9.6 放行条件

- Function 和 Action 不绕过现有权限体系。
- Action 状态可观察、可失败、可重试。
- Action 完成后相关 Widget 数据一致。
- 原生 Query Action 回归测试通过。

## 10. T6：Object-aware Widget 第一批

### 10.1 目标

以新 Widget 为主、少量复用现有基础组件，完成一条不写代码的本体交互链路。第一批不直接重构现有 Table/Form 的全部配置。

### 10.2 ObjectDetail Widget

新增目录：

```text
app/client/src/widgets/ObjectDetailWidget/
```

输入和输出：

- 输入：Object Instance 或对象路径。
- 输入：显示分组和可见属性配置。
- 输出：当前对象、选中关联对象、加载状态、错误状态。

展示能力：

- 基础属性、业务属性、派生属性分组。
- 关联对象 Tab。
- 空对象、字段缺失和权限错误状态。
- 只读展示，Action 编辑放在 ActionButton 中。

### 10.3 FilterList Widget

新增目录：

```text
app/client/src/widgets/FilterListWidget/
```

能力：

- 选择 Object Type。
- 根据 Property 类型生成文本、枚举、日期和数值过滤器。
- 输出结构化 Filter JSON。
- 支持重置、空条件和非法条件提示。

第一版只支持后端已定义的白名单过滤运算符，不执行任意 JavaScript 或字符串拼接查询。

### 10.4 ActionButton Widget

新增目录：

```text
app/client/src/widgets/ActionButtonWidget/
```

能力：

- 选择 Action Type。
- 将当前对象、选中行或 Widget State 映射为 Action 参数。
- 显示执行中、成功、失败和禁用状态。
- Action 成功后触发 Object Type 刷新。

### 10.5 注册和兼容

新 Widget 需通过当前项目的 `widgets/registry` 和 `WidgetProvider/factory/registrationHelper` 注册，并提供：

- Widget DSL 默认值。
- Property pane 配置。
- Widget 运行时组件。
- Widget 类型和版本。
- 导入导出兼容策略。
- Jest 组件测试。

不得直接复制和修改既有 Table/Form 的全部实现；需要复用时通过公共类型、API Client、数据转换器或基础组件复用。

### 10.6 验证

自动化：

- 每个 Widget 的渲染、默认配置、属性配置和错误状态测试。
- Widget 注册和 DSL 导入导出测试。
- ActionButton 与 T5 执行 Saga 的集成测试。
- FilterList 输出 Filter JSON 的测试。

手工链路：

```text
FilterList（状态=DELAYED）
  -> Object-aware Table 或临时 Table 绑定
  -> 选择 PurchaseOrder
  -> ObjectDetail 显示订单和关联对象
  -> ActionButton 触发更新生产排程
  -> 相关数据自动刷新
```

### 10.7 放行条件

- 三个新 Widget 可拖拽、保存、重新打开和运行。
- 链路不依赖手写 JavaScript。
- 失败 Action 不会造成 UI 假刷新。
- 原有 Widget 的拖拽、保存、导入导出无回归。

## 11. T7：Table/Form 本体模式

### 11.1 目标

在 ObjectDetail、FilterList、ActionButton 稳定后，把本体数据能力集成到既有 Table/Form 工作流中。

### 11.2 Table 模式

在现有 Table Widget 的数据配置中新增 Object Set 数据源模式，要求：

- 与 Query 数据源模式并列，默认不改变既有模式。
- 选择 Object Type 后自动生成属性列。
- 使用 displayName 展示列名，使用稳定 property ID 绑定数据。
- 服务端分页、排序和过滤使用 T2 API。
- 行选择输出标准化 `selectedObject`。
- 行级 Action 绑定使用 T5 Action 执行链。

### 11.3 Form 模式

在现有 Form 或 JSON Form 能力上新增 Object Type 模式，要求：

- STRING、INTEGER、DECIMAL、DATETIME、BOOLEAN 有明确控件映射。
- `required` 自动映射必填。
- `readOnly` 自动禁用。
- 表单数据到 Action 参数的映射可查看、可修改。
- 提交前进行客户端校验，服务端再次校验。

### 11.4 验证

1. Table 选择 `PurchaseOrder` 后显示全部合法字段。
2. Table 可以分页、排序、按状态过滤。
3. 选中行后 ObjectDetail 接收到标准对象。
4. Form 选择 Supplier 后自动生成字段。
5. 提交表单触发指定 Action，并在成功后刷新数据。
6. 旧 Query Table/Form 应用继续可打开、编辑和运行。

### 11.5 放行条件

- Object 模式和 Query 模式相互隔离。
- 既有 Table/Form 快照、导入导出和运行时测试通过。
- 自动生成的列和表单字段在元数据变化后有明确升级策略。

## 12. T8：Variable 系统

> 当前状态：T8.1-T8.5 已完成，T8.6 自动化/环境验证记录见 [`docs/superpowers/verification/2026-08-06-t8-variable-system-verification.md`](docs/superpowers/verification/2026-08-06-t8-variable-system-verification.md)。发布态快照、版本迁移和运行时兼容性留待 T9。

### 12.1 目标

引入显式 Variable 体系，统一管理 Object Set、属性、Function 和聚合结果，避免把复杂逻辑全部塞进 Widget 配置或绑定表达式。

### 12.2 第一版 Variable 类型

- `ObjectSetVariable`：Object Type 加过滤、排序和分页。
- `ObjectPropertyVariable`：某个 Object Instance 的某个属性。
- `FunctionVariable`：Function 调用结果。
- `AggregationVariable`：Object Set 的 count、sum、avg、min、max。

每个 Variable 必须包含：

- 稳定 ID 和显示名。
- 类型和输出类型。
- 配置值。
- 依赖列表。
- 加载状态和错误。
- 版本和更新时间。

### 12.3 依赖和求值

第一版使用显式有向无环图：

- 创建和保存时检测循环依赖。
- 上游变化使下游失效。
- 仅对被 Widget 或其他 Variable 引用的节点求值。
- 记录最后一次求值错误和依赖路径。
- 不允许 Variable 修改其他 Variable。

### 12.4 Explorer 与绑定

在本体 Explorer 中增加 Variables 区域，复用 T3 的元数据和 T4/T5 的 API。绑定支持：

```text
{{$variables.myObjectSet}}
{{$variables.delayCount}}
```

复杂表达式先不支持赋值语法；变量通过属性面板创建和配置，避免引入新的脚本语言。

### 12.5 验证

1. 创建过滤后的 PurchaseOrder ObjectSet Variable。
2. 创建依赖它的 `delayCount` Aggregation Variable。
3. Text Widget 显示 `{{$variables.delayCount}}`。
4. 修改过滤条件，delayCount 自动更新。
5. 创建循环依赖时保存失败并指出依赖链。
6. 刷新页面后 Variable 配置和结果可恢复。

### 12.6 放行条件

- Variable 配置持久化格式已固定并有迁移版本：已完成 V1 页面 DSL 字段和旧页面空状态兼容；发布态迁移留待 T9。
- 依赖图无循环且有自动化测试：已完成。
- Object Set 查询不会重复请求到不可控数量：已完成稳定查询键和 Function 输入签名去重。
- Variable 不影响原有 DataTree 和 Query 执行：已完成定向回归测试；全量类型检查仍受仓库既有 design-system 类型问题影响。

## 12.7 T-Foundation：本体工程导入与 App 绑定

> 当前状态：已完成。详细检查点见 [`CelanWorksmith_T-Foundation阶段检查点.md`](CelanWorksmith_T-Foundation阶段检查点.md)。

本阶段完成以下工程化闭环：

- YAML 本体工程导入、版本化 Registry 和 App Binding。
- 新建 App 选择并绑定 `celanworksmith-demo:1.0.0`。
- 绑定关系持久化，重新打开 App 后本体数据恢复。
- MongoDB 模拟运行时 Provider 为 Object Widget 提供 `PurchaseOrder` 数据。
- Table Object Mode 与 FilterList Object Query 联动，`Delay Days gt 1` 返回 2 条记录。

本阶段不等同于所有原生 Widget 已完成本体兼容，也不进入 T9 发布固化。下一阶段先建立 Widget Compatibility Matrix、统一 Metadata Adapter 和 Object Binding 契约，再按 Widget 类别扩展。

第二阶段的设计和实施计划：

- [`docs/superpowers/specs/2026-08-07-full-ontology-widget-compatibility-design.md`](docs/superpowers/specs/2026-08-07-full-ontology-widget-compatibility-design.md)
- [`docs/superpowers/plans/2026-08-07-full-ontology-widget-compatibility-plan.md`](docs/superpowers/plans/2026-08-07-full-ontology-widget-compatibility-plan.md)

## 13. T9：应用固化与发布校验

### 13.1 目标

实现本体应用的草稿、版本、发布和运行时校验，不改变 Appsmith 原有应用发布流程，先通过扩展字段或独立快照保存本体绑定信息。

### 13.2 快照内容

发布时快照至少包含：

- 应用 ID、版本号和发布人。
- 页面和 Widget DSL 版本。
- Object Type、Property、Link Type 的稳定 ID。
- Function 和 Action ID 及版本。
- Variable 定义和依赖图。
- Provider 类型和上游契约版本。
- 发布时的元数据摘要。

不要只保存 displayName；名称变化不能导致绑定丢失。

### 13.3 状态和权限

状态：

```text
DRAFT -> REVIEWING -> PUBLISHED
  ^          |            |
  +----------+------------+
```

要求：

- 发布权限沿用 Appsmith workspace/application 权限。
- 已发布版本只读运行，编辑必须创建新草稿。
- 发布操作可审计。
- 发布失败不能生成半成品版本。

### 13.4 兼容性校验

重新打开或运行已发布应用时检查：

- Object Type 是否存在。
- Property 是否存在且类型兼容。
- Link Type 目标是否兼容。
- Function/Action 是否存在且版本可用。
- Variable 依赖是否仍可求值。

问题分为阻断错误和非阻断告警。每个告警必须定位到页面、Widget、绑定或 Variable。

### 13.5 验证

1. 构建采购监控台并保存草稿。
2. 发布生成可查询版本快照。
3. 运行模式不可编辑页面结构，但交互正常。
4. 修改 Mock Object Type 删除一个属性。
5. 重新打开应用看到准确兼容性告警。
6. 创建新草稿修复绑定后可以再次发布。

### 13.6 放行条件

- 快照可导出、可恢复且版本可追踪。
- 发布和运行权限正确。
- 本体变更不会静默破坏已发布应用。
- 原有 Appsmith 应用发布流程无回归。

## 14. T10：Reasoning、样板应用与系统验收

### 14.1 目标

将 LLM 软推理能力作为独立可选能力接入，并用三个完整样板应用验证平台闭环。

### 14.2 ReasoningPanel

新增 ReasoningPanel 或 ObjectDetail 的 AI Tab：

- 输入当前 Object Instance 和自然语言问题。
- 显示 answer、evidence、confidence、耗时和错误状态。
- Mock Provider 返回固定文本和固定证据。
- 真实 LLM Provider 未配置时显示降级提示，不影响普通对象查询和 Action。
- 对问题、对象和返回结果做权限检查和敏感信息处理。

第一版不允许前端直接携带 LLM 密钥；调用必须经过后端 Runtime Provider。

### 14.3 三个样板应用

#### 采购监控台

- FilterList：按订单状态过滤。
- Table：显示延期采购订单。
- ObjectDetail：显示订单、生产、交付和财务关联。
- ActionButton：更新生产排程。

验证重点：Object Set、过滤、行选择、关联查询和刷新。

#### 影响分析器

- 选中延期订单。
- 展示生产、交付和财务影响。
- 触发 Action 链。
- 展示 Reasoning 结果。

验证重点：跨本体导航、Action changes/sideEffects 和推理证据。

#### 供应商评级看板

- Supplier 和 SupplierRating Table。
- Aggregation Variable。
- Chart 或统计 Widget。
- Supplier 风险和评级展示。

验证重点：历史数据聚合、派生属性和多应用共享本体。

### 14.4 最终验收

自动化回归：

- 后端单元测试、Controller 测试和 Provider 契约测试。
- 前端新增 Widget、Explorer、DataTree、Saga 测试。
- 原有核心 Query、Action、Widget 测试。
- 前端生产构建。
- API smoke test。

手工回归：

1. 登录并进入编辑器。
2. 新建应用并浏览本体。
3. 使用 FilterList、Table、ObjectDetail、ActionButton 完成链路。
4. 保存、重新打开、发布并进入运行态。
5. 破坏 Mock 元数据并验证告警。
6. 切换回原生 Query 数据源验证原有能力。
7. 关闭 Reasoning Provider，确认基础功能仍正常。

性能基线：

- Object Set 首屏请求耗时。
- 分页、排序和过滤耗时。
- Explorer 元数据加载耗时。
- Action 执行和刷新耗时。
- 绑定数量增加后的浏览器内存和请求数量。

性能基线先记录，不在没有数据前设定过高优化目标；发现 N+1 或明显阻塞后再建立 T11 优化任务。

## 15. 跨阶段质量要求

### 15.1 API 和安全

- 所有新增 API 使用统一 `/api/v1/celanworksmith` 前缀。
- 复用现有身份认证、workspace/application 权限和审计机制。
- 对 `typeId`、`propertyId`、`actionId`、过滤条件和排序字段做白名单校验。
- 不允许把任意 JavaScript、SQL 或模板表达式作为 Mock 查询条件直接执行。
- 日志中不记录密码、Token、完整用户数据和敏感 Action 参数。
- 生产 Adapter 必须有超时、重试上限、熔断或明确失败策略。

### 15.2 数据和版本

- 稳定 ID 与显示名称分离。
- 所有 DSL 和快照结构带 schema/version 字段。
- DTO 变更保持向后兼容，破坏性变更升级 API 或 schema 版本。
- Mock fixture 与生产适配器都通过同一 Port 契约测试。
- 不把 Mock 数据写入 Appsmith 真实业务集合，除非有单独的数据迁移设计。

### 15.3 前端兼容

- 新增本体模式默认关闭或仅对明确配置的应用启用。
- 原生 Query、JSObject、Widget 绑定和 Action 不改变语义。
- 新 Widget 必须支持 DSL 导入导出和版本迁移。
- 加载中、空数据、权限错误、上游错误、超时和部分失败都必须有 UI 状态。
- 不在 Widget 组件中复制 API、缓存和 Action 执行逻辑。

### 15.4 可观测性

新增能力至少记录：

- Provider 类型和调用耗时。
- 请求成功/失败计数。
- Object Type、Function、Action 的稳定 ID。
- executionId 和发布版本。
- 错误码、重试次数和超时原因。

日志和指标中使用稳定 ID，不依赖中文显示名称。

## 16. 关键待确认问题

以下事项不阻塞 T0/T1 的 Mock 契约工作，但在对应阶段开始前必须确认：

1. Layer 2/3 的真实 API 是否 REST、GraphQL、WebSocket 或组合协议？
2. Object Type、Property、Link、Function、Action 的 ID 和版本由哪一层生成？
3. 上游是否提供增量变更订阅？没有订阅时采用轮询还是手动刷新？
4. Action 是否要求事务、幂等、审批或二次确认？
5. Object Set 的过滤表达式有哪些合法运算符和最大复杂度？
6. Function 是否允许异步执行，是否有副作用？
7. Reasoning 的模型、部署位置、数据脱敏、审计和费用边界是什么？
8. 已发布应用绑定的本体变更由谁审批，哪些变更可自动兼容？
9. CelanWorksmith 的应用权限是否完全复用 Appsmith 权限，还是要增加 Object Type/Action 级权限？
10. RTS 的源码、协议和生命周期由哪个仓库负责？
11. 当前 `PORT=8081` 的开发部署方式是否长期保留，还是恢复源码默认 `8080`？
12. 本体 Mock 数据后续是否需要持久化，还是始终作为演示 fixture？

每个问题在进入相关阶段时形成一条决策记录，包含选择、备选方案、影响和回滚方式。

## 17. 建议的首个执行批次

当前不立即进入 Widget 或绑定引擎改造。建议按以下顺序启动：

1. 完成 T0，建立当前双语基线和开发环境记录。
2. 先完成 T1 的 DTO、Port、错误模型和配置骨架。
3. 对 T1 做一次 API/契约评审，确认上述待确认问题中与契约有关的项目。
4. 完成 T2，并用 curl 和自动化测试验证供应链 Mock API。
5. T2 通过后再开始 T3 Explorer，确保前端不是基于未验证的假接口开发。

T0 至 T2 的交付物应足以回答一个关键问题：在不依赖真实上游 Layer 2/3 的前提下，CelanWorksmith 是否能稳定提供一套可查询、可关联、可执行、可测试的本体运行时契约。只有答案为“是”，才进入绑定引擎和 Widget 体验层开发。
