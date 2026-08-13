# 全面兼容本体设计

记录日期：2026-08-07  
阶段：第二阶段“全面兼容本体”  
前置检查点：`CelanWorksmith_T-Foundation阶段检查点.md`

## 1. 目标

让本体数据源在 Widget 层具备与原生 Query 相当的输入、展示和交互能力，同时保留 Appsmith 原生 Query 模式。改造按 Widget 类别逐步推进，每个类别都可以独立开发、测试和验收。

本阶段的关键产品目标是：

- 用户可以通过界面选择本体工程中的 Object Type 和 Property，不再手工输入稳定 ID。
- 新建的本体兼容 Widget 默认使用 Object 模式。
- 已有 Query 应用和旧 DSL 继续按 Query 模式运行，不因新增能力改变行为。
- Widget、DataTree、Object Query、Function/Action 和 DSL 配置使用统一的本体绑定契约。
- 元数据刷新、对象删除、权限错误、空数据和类型不匹配都有明确的可见状态。

## 2. 非目标

本阶段不实现：

- T9 的应用发布快照、发布版本、版本迁移和运行态发布校验。
- Layer 2 本体建设平台和 Layer 3 Action Server 的真实接入。
- 在一次迭代中改造所有 Appsmith Widget。
- 替换 Appsmith 原生 Query、Datasource Plugin 或 JSObject 执行链。
- 允许 Widget 直接执行任意 API、SQL、JavaScript 或 MongoDB 查询。

## 3. 设计原则

### 3.1 本体与原生数据源同等级

本体数据源在应用层作为一等数据输入能力存在。Widget 可以选择 Object 模式或 Query 模式，两者在配置、数据树、加载态和错误态上具有清晰的边界。

### 3.2 统一适配层

采用 `Object Binding/Metadata Adapter` 作为共享边界。Widget 只负责自身的展示、交互和 Widget meta 属性，不直接复制本体 API、缓存、查询和执行逻辑。

### 3.3 稳定 ID 与显示名称分离

DSL 和运行时请求保存 Object Type、Property、Link、Action 的稳定 ID。Property Pane 展示 `Purchase Order (PurchaseOrder)`、`Delay Days (delayDays)` 这样的友好标签，显示名称变化不能导致绑定静默切换。

### 3.4 新旧行为隔离

- 新创建的本体兼容 Widget默认 `OBJECT`。
- 已有 Widget 或旧 DSL 缺少模式字段时按 `QUERY` 解释。
- 从旧 DSL 加载时通过归一化/迁移把缺失字段固定为 `QUERY`，防止代码中的新默认值影响旧应用。
- 用户可以显式切换 `OBJECT` 与 `QUERY`；切换时两个模式的配置区域互斥显示。

### 3.5 异步数据节点

Object 查询、Link 查询、Function 和 Action 继续通过既有 `CelanworksmithAPI`、Redux/Saga、Object Query Layer 和 DataTree 完成。React Widget render 和表达式同步求值不直接发起网络请求。

## 4. 统一绑定模型

Widget 对外可以保留现有属性名，例如 Table 的 `dataMode`、`objectTypeId` 和 `objectFilter`，但内部必须归一为统一模型：

```text
BindingMode: OBJECT | QUERY

ObjectBinding:
  objectTypeId?: string
  source?: ALL | FILTER | INSTANCE | LINKED | PROPERTY
  objectPath?: string
  objectIdPath?: string
  filter?: ObjectQueryFilter
  selectedPropertyIds?: string[]
  displayPropertyId?: string
  valuePropertyId?: string
  linkTypeId?: string
  actionId?: string
```

适配器职责：

1. 将 Widget DSL 的公开属性转换为统一 `ObjectBinding`。
2. 根据当前 App 的 Ontology Metadata 校验 Object Type、Property、Link 和 Action。
3. 从显式配置、动态绑定表达式或上游 Widget meta 输出推断类型；顺序固定为显式配置优先，其次推断，无法确定时报错。
4. 将 Object Set、Object Instance、Property 和 Action 参数转换为 Widget 所需的输入形态。
5. 生成结构化配置错误和兼容性状态，不静默改绑或猜测其他对象。

建议新增的共享领域模块：

```text
app/client/src/celanworksmith/widgets/objectBinding/types.ts
app/client/src/celanworksmith/widgets/objectBinding/normalizeObjectBinding.ts
app/client/src/celanworksmith/widgets/objectBinding/objectBindingSelectors.ts
app/client/src/celanworksmith/widgets/objectBinding/objectBindingValidation.ts
```

具体文件名可以在实现计划的 B1 任务中微调，但不能让 Widget 各自拥有一套绑定归一化规则。

## 5. 元数据和 Property Pane 体验

### 5.1 App 级本体上下文

本体工程绑定是 App 级设置。Widget 不重复选择 Project/Version，而是在 Object 配置区域显示当前工程摘要；未绑定时显示绑定入口或明确的未绑定状态。

### 5.2 共享 Object Binding 控件

通过现有 Property Control Registry 增加共享控件，预计包括：

- `数据模式 / Data Mode`：Object、Query 分段切换。
- `本体对象 / Ontology Object`：可搜索的 Object Type 选择器。
- `数据范围 / Object Scope`：Object Set、单实例、Link 结果或 Property，按 Widget 能力显示。
- `显示属性 / Display Property`、`值属性 / Value Property`：从当前 Object Type 的 Property 元数据选择。
- `过滤条件 / Filter`：复用 Object Query 和 FilterList 的结构化条件模型。
- 高级动态绑定入口：允许输入表达式，但保留静态选择器的可读摘要和校验结果。

Object Type 选项至少显示稳定 ID、displayName 和可选描述；Property 选项至少显示稳定 ID、displayName、dataType、readOnly 和 derived 状态。

### 5.3 状态和反馈

- 加载中：禁用依赖元数据的选择器并显示加载状态。
- 未绑定：显示“请先绑定本体工程”及进入绑定设置的入口。
- 空列表：显示“当前本体工程没有可用对象类型”，而不是显示空白下拉框。
- 请求失败：显示错误原因和重试入口。
- 已删除 ID：保留原配置，显示“对象类型/属性已不存在”的兼容性错误。
- 类型不匹配：指出 Widget、绑定路径、当前类型和期望类型。

## 6. 数据流

```text
App Binding
  -> Ontology/Runtime Metadata Store
  -> Shared Object Binding Control
  -> Widget DSL normalized binding
  -> Object Binding Adapter
  -> Object Query / Execution Saga
  -> DataTree
  -> Widget component and widget meta properties
```

元数据刷新只更新可选项和显示标签，不覆盖用户正在编辑的 Widget 输入值。稳定 ID 仍然存在时保留原配置；稳定 ID 不存在时保留原值并进入错误态，等待用户处理。

## 7. Widget 兼容范围和顺序

### B0：契约和兼容矩阵

先为每个目标 Widget 记录 Query 模式行为、Object 模式默认值、输入形态、属性映射、Link/Action 能力、刷新策略、错误态和 DSL 迁移规则。

### B1：共享适配层和 Table 基准

建设共享 Object Binding 控件、元数据选择器、类型推断、DSL 归一化和 Table/TableV2 接入。新建本体兼容 Table 默认 Object；旧 Table 无模式字段时保持 Query。

### B2：集合和选择类

覆盖 List、Select、Dropdown、MultiSelect 等。支持 Object Set、显示属性、值属性和稳定 ID 输出；Query 模式配置保持原样。

### B3：单对象、表单和输入类

覆盖 ObjectDetail、JSONForm、Form、Text、Input 等。支持 Object Instance、Property 映射、required/readOnly/dataType 到控件的映射。

### B4：关联和动作类

覆盖 Link 导航、ActionButton、Button、Form 提交和菜单动作。支持 Action 目标、参数映射、确认、执行状态、失败原因和成功后的对象刷新。

### B5：统计和可视化类

覆盖 Chart、Statbox、Progress 等。支持 Object Property、Aggregation Variable、派生属性和空结果状态。

### B6：体验和兼容性收口

统一文案、搜索、分组、自动补全、DSL 导入导出、错误展现、旧 Query 回归和性能检查。

## 8. 兼容矩阵字段

每个 Widget 条目至少包含：

```text
Widget
Query mode behavior
Object mode default
Input shape: ObjectSet | ObjectInstance | Property | Aggregation
Object Type selection
Property mapping
Link support
Action support
Refresh behavior
Loading / Empty / Error / Permission / Type mismatch states
DSL migration rule
```

初始重点条目：Table、TableV2、FilterList、ObjectDetail、JSONForm、Form、List、Select、Dropdown、MultiSelect、ActionButton、Button、Chart、Statbox、Progress、Text、Input。

## 9. 错误、刷新和兼容性

- App 未绑定本体：Object 配置不能伪装成可用状态，提供绑定入口。
- Ontology Provider 错误：保留 Widget 当前配置，提供重试；不回退到错误的 Mock 类型。
- Runtime 查询错误：Widget 显示可重试状态，并保留上一次成功数据的策略由 Widget 类别明确记录。
- Property/Type 删除：显示阻断型兼容错误，不自动选择相似字段。
- Action 参数类型变更：在配置阶段显示类型错误，在执行阶段仍由服务端校验。
- 数据刷新：只更新 Object 数据节点和派生状态，不覆盖用户正在编辑或已保存的 Widget 输入值。

## 10. 测试和验收

每个 Widget 类别必须通过四层验证：

1. 归一化、迁移、类型推断和稳定 ID 校验单元测试。
2. 共享 Property Control 的选择、搜索、空态、错误、重试和切换测试。
3. Widget、Saga、DataTree、自动补全和 DSL 导入导出集成测试。
4. 浏览器手工验证 Object 默认模式、Query 切换、元数据刷新、空数据、错误、旧 App 回归和 Widget 联动。

第二阶段总验收至少覆盖：

- 新建本体兼容 Widget 默认 Object。
- 旧 Query Widget 和旧 Query App 不回归。
- Object Type 和 Property 可搜索选择，不手工输入 ID。
- Table/FilterList 联动。
- Form 或 Button 触发 Action。
- Link 导航或关联对象展示。
- 至少一个统计/可视化 Widget。

## 11. 风险控制

| 风险 | 控制措施 |
|---|---|
| 默认 Object 破坏旧应用 | 旧 DSL 缺少模式字段时强制归一为 Query，新建 Widget 才使用 Object 默认值 |
| 每个 Widget 重复实现本体逻辑 | 共享 Adapter、控件、状态和测试先于批量 Widget 接入 |
| 元数据变更导致静默错误 | 使用稳定 ID、显式校验和兼容性错误 |
| Object/Query 配置混淆 | 使用明确分段控件，两个配置区域互斥 |
| Object 数据量过大 | 复用分页、过滤、排序、缓存和按需加载 |
| Widget 改造扩大到不可控范围 | 以兼容矩阵为准，按 B0-B6 设置放行门槛 |

## 12. 阶段交付物

- 本设计文档。
- Widget Compatibility Matrix。
- Object Binding 规范、元数据选择器和 DSL 迁移规则。
- 共享 Property Control 和 Table 基准实现。
- 按 Widget 类别拆分的实现计划与验证记录。
- 不包含 T9 的发布固化代码。
