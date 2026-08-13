# CelanWorksmith Widget-Ontology 集成契约

> 版本：2026-08-11
> 适用范围：所有与 CelanWorksmith 本体系统交互的 Widget
> 目标：从“旁路验证”进入“正式融合”，建立统一、可复现的集成规则，避免每个 Widget 重复讨论。

## 0. Object-First / 本体优先原则

- 本体是 CelanWorksmith 的核心数据层；DB、API、Query 等原生 Appsmith 数据源仅作为兼容旁路保留。
- 所有数据展示、输入、控制类 Widget 默认进入 **Object 模式**，由本体元数据驱动字段、列、类型、枚举、关联关系。
- Query/JS 模式仅用于：
  - 过渡兼容已有 Appsmith 应用；
  - 高级用户需要组合多个数据源；
  - 调试或临时脚本。
- 未来将通过 feature flag 或编译时开关隐藏/禁用原生数据源接入，使应用与本体强绑定。

## 1. 数据源平等原则（Ontology 与原生数据源同级）

- 任何数据展示/输入 Widget 都支持两种数据模式：
  - **Object 模式**：直接绑定到本体对象集合或单个对象，元数据驱动渲染。
  - **Query/JS 模式**：与原生 Appsmith 一致，使用 `{{$objects...}}` 或 `{{Query1.data}}` 表达式，完全自由但不享受元数据辅助。
- 从通用组件面板拖入的 Widget 默认 Object 模式；从 Ontology Explorer 拖出字段时自动选择最合适的 Widget 并进入 Object 模式。
- Query 模式配置在属性面板中可折叠、标注为“高级 / 兼容”。

## 2. 渲染复用原则：Ontology 只提供数据适配层，不另造 UI

- Object 模式的目标不是新建一套 UI，而是把本体数据翻译成原生 Widget 能理解的 props。
- 具体映射：
  - **Table Object 模式**：生成原生 `tableData` + `primaryColumns`，复用 `TableComponent` / `TableComponentV2`。
  - **Form Object 模式**：生成原生 `formData` + 字段控件配置，复用 `FormWidget` 字段渲染。
  - **List Object 模式**：生成 `listData`，复用 `ListWidget` / `ListWidgetV2`。
  - **Chart Object 模式**：生成 `chartData` / `seriesData`，复用 Chart 渲染管线。
  - **Text / Input / Select / Progress / Statbox**：绑定到单个本体属性或计算值。
  - **FilterList**：唯一例外——原生 Appsmith 没有“结构化过滤器”组件，因此允许自建 UI，但控件、间距、标签必须遵循 Appsmith 设计系统规范。

## 3. 属性映射规则：元数据生成初始配置，用户修改优先保留

### 3.1 元数据 → Widget 属性初始映射

| 本体元数据字段 | Widget 初始属性 | 说明 |
|---|---|---|
| `id` | 内部标识/列名 | 稳定 ID，不可改 |
| `displayName` | 列标签/字段标签 | 仅作为初始展示 |
| `dataType` | 控件类型/列类型 | STRING → 文本；INTEGER/DECIMAL → 数字/进度；BOOLEAN → 开关；DATETIME → 日期；LINK → 关联对象选择器 |
| `semanticDescription` | 帮助文本/占位符 | 多语言支持 |
| `linkType` | 关联对象选择器 | 用于 Form/Detail 中的 Link 属性 |
| `enumValues` | 下拉选项 | 用于 Select/Radio 类控件 |

### 3.2 用户修改后的策略

- 隐藏、重命名、排序、改控件类型：持久化在 Widget 配置中，后续本体刷新不覆盖。
- 本体新增属性：增量追加到 `primaryColumns` / 字段列表末尾，不破坏已有配置。
- 本体删除属性：在 Widget 中标记为“已删除”，保留配置但渲染时跳过；用户可手动移除。
- 配置保存以 **stable ID** 为键，不以 `displayName` 为键。

## 4. Filter 语义分层：区分三种“过滤”

| 类型 | 作用域 | 过滤发生位置 | 消费方式 |
|---|---|---|---|
| **结构化过滤器** | 跨 Widget | 服务端查询 | `FilterList.filter` → `Table/List ObjectFilter` |
| **Widget 内置过滤** | Widget 内部 | 客户端已加载数据 | 原生 Table 列 Filter / 搜索框 |
| **手动 JS 过滤** | 完全自由 | 客户端 | 用户写 `{{$objects.PurchaseOrder.all.filter(...)}}` |

- Object 模式 Widget 统一暴露 `objectFilter` 属性，接受：
  - `{{FilterList1.filter}}`（推荐）
  - 手动 JS 对象 `{ typeId, conditions: [...], version: 1 }`
- Query 模式不自动消费 `FilterList.filter`，因为 Query 模式绑定的是静态 JS 表达式。如需联动，可后续扩展 `{{$objects.PurchaseOrder.query({ filter: FilterList1.filter })}}` 或切到 Object 模式。

## 5. Action / Function / Link 绑定规则

### 5.1 Function
- 只读计算，作为异步数据节点暴露。
- 展示：绑定 `{{$functions.X.data}}`。
- 触发：事件里写 `{{$functions.X.run(params)}}`。
- 执行后刷新：通过 `celanworksmithExecution` reducer 的 `RUNTIME_CACHE_CLEARED` 机制，按 `applicationId` 定向刷新，保留用户输入。

### 5.2 Action
- 有副作用，绑定到事件（onClick / onSubmit）。
- 执行前：参数校验、确认对话框、禁用状态。
- 执行中：进度反馈。
- 执行后：成功/失败提示、局部刷新。

### 5.3 Link
- 作为属性类型的一种，Object 模式下：
  - 展示：显示关联对象名/摘要。
  - 选择：弹出 Ontology 对象选择器。
  - 写入：提交时把关联对象 ID 写回。

## 6. 各 Widget 与本体集成映射表

### 6.1 集合类 Widget

| Widget | Object 模式能力 | 已验证 | 待补齐 |
|---|---|---|---|
| **Table** | 选择 Object Type，自动加载服务端分页数据，支持搜索、排序、选择行、多选和列配置 | 已完成 Object 模式到原生 `ReactTableComponent` 的数据适配与渲染复用；保留 Query 模式 | 搜索、分页等交互细节纳入后续缺陷验收，不改变集成契约 |
| **List** | 选择 Object Type，绑定对象列表 | 已部分支持 | 对齐原生 List 渲染与模板 |
| **FilterList** | 选择 Object Type，配置条件，输出 `filter` 对象 | 数据链路已通 | C10：使用设计系统控件、优化布局、Query 模式联动 |

### 6.2 单对象/单属性 Widget

| Widget | Object 模式能力 | 已验证 | 待补齐 |
|---|---|---|---|
| **ObjectDetail** | 选择单个对象，展示属性列表 | 数据链路已通 | 对齐原生 Form/Detail 渲染，支持 Link 选择 |
| **Form Object 模式** | 选择 Object Type，自动生成字段 | 已部分支持 | 完整字段映射、校验、提交 Action 绑定 |
| **Text** | 绑定单个属性或 Function 结果 | 已验证 | 完善自动补全提示 |
| **Input / InputGroup** | 绑定单个属性 | 已部分支持 | 按 dataType 选择子类型 |
| **Select / MultiSelect** | 绑定枚举或 Link 属性 | 已部分支持 | 支持枚举值和 Link 对象选择 |
| **Progress** | 绑定数值属性，显示进度 | 已部分支持 | 对齐数值范围语义 |
| **Statbox** | 绑定数值属性或聚合值 | 已部分支持 | 对齐聚合语义 |
| **Chart** | 绑定对象集合，配置 X/Y 轴 | 已部分支持 | 对齐原生 Chart 数据格式 |
| **ActionButton** | 触发 Action，绑定参数 | 已验证 | 成功/失败刷新与提示 |

### 6.3 默认模式与空态

- 所有新增 Widget 默认 Object 模式；属性面板中 Query 模式折叠。
- 未绑定本体的 Widget 空态显示：
  - 中文：请先选择本体对象类型
  - 英文：Select an ontology object type
- Ontology Explorer 拖出字段时：
  - 字符串/数字/日期属性 → Input/Text/DatePicker
  - 布尔属性 → Switch
  - 枚举属性 → Select
  - Link 属性 → ObjectDetail / Select with object picker
  - 集合 → Table / List / FilterList

## 7. FilterList 与 Object 集合 Widget 协作规范

- FilterList 输出结构：
  ```json
  {
    "typeId": "PurchaseOrder",
    "conditions": [
      { "propertyId": "delayDays", "operator": "gt", "value": 0 }
    ],
    "version": 1
  }
  ```
- Object 模式 Table/List 接受 `objectFilter` 绑定，内部将其转换为运行时查询参数。
- 当 FilterList 的 `objectTypeId` 与 Widget 的 `objectTypeId` 不一致时，Widget 应忽略该 filter 并显示提示。
- 未选择 Object Type 的 FilterList 不输出有效 filter，Widget 按无过滤处理。

## 8. Action 执行与局部刷新规范

- Action 参数来源：
  - 常量值
  - 当前 Widget 属性/元属性
  - 选中的 Object 属性：`{{ObjectDetail1.selectedObject.properties.name}}`
  - 其他 Widget 值
- 执行成功：
  - 清除相关 Object Type 运行时缓存（按 `applicationId` + `typeId`）。
  - 触发依赖该 Object Type 的 Widget 重新查询。
  - 保留用户正在编辑的输入值。
- 执行失败：
  - 显示错误信息（权限错误与普通错误区分）。
  - 不刷新数据，不覆盖用户输入。

## 9. 自动补全与 DataTree 规范

- `$objects` 节点：按绑定工程展开所有 Object Type，每个 Object Type 暴露 `all` / `byId` / `_meta`。
- `$functions` 节点：按绑定工程展开，每个 Function 暴露 `data` / `run` / `_meta`。
- `$actions` 节点：按绑定工程展开，每个 Action 暴露 `run` / `confirm` / `_meta`。
- `$variables` 节点：按绑定工程展开，每个 Variable 暴露 `data` / `run` / `_meta`。
- 自动补全提示使用 `displayName`（多语言），内部绑定使用 `id`。

## 10. 迁移与兼容性

- 已有 Appsmith 应用不受影响，Query 模式继续可用。
- 新拖入 Widget 默认 Object 模式，用户可手动切换。
- 保存的 Widget 配置应向后兼容：切换模式时不丢失另一模式的配置。
- 未来版本可通过 feature flag 隐藏 Query 模式入口，但配置数据保留。

## 11. 实施基线与后续工作

截至 2026-08-12，B0-B6 已完成；B7 的核心目标已完成：Table Object 模式使用本体元数据生成列配置，使用运行时 Provider 查询数据，并复用原生 Table 渲染、搜索、分页、排序和行选择管线。当前已确认的 Search 等交互细节属于后续验证缺陷，不回退为旁路实现。

本体目前与 DB/API/Query 在 Widget 数据消费层同级：Object 模式通过 `Ontology Project -> Runtime Provider -> Redux/DataTree -> Widget` 进入原生 Widget 渲染管线；Query/JS 模式继续保留为兼容路径。本体尚未实现为 Appsmith 的 Datasource Plugin 或 Query 实体，这不是本阶段的完成条件。

下一阶段从 C10 开始，并按以下顺序推进：C10 -> D1/D2 -> D3 -> E1/E2/E3 -> F1/F2/F3/F4。第三阶段 C0-C9 已完成的共享状态、显示名称、Action 反馈等能力作为上述任务的公共前置能力复用，不重复建设。

所有契约实施任务均受 [Subagent 执行通用约束](../process/subagent-execution-constraints.md) 约束。该约束要求短任务、代码修改串行、只读调查可并行、测试基础设施独立、定向审查与有限修复轮次，确保本体集成的契约演进可恢复、可审查且不因长任务失控。

### 已知后续验收项

- Object 模式 Table 的 Search、分页、排序、列配置与 Query 模式的交互细节。
- FilterList 的设计系统控件、枚举与 Link 条件输入，以及 Object 模式联动提示。
- ObjectDetail/Form 的原生控件映射、Link 选择和编辑提交闭环。
- 其它 Widget 的 Object 模式渲染一致性、加载/空态/权限状态和自动补全体验。

## 12. 后续工作清单入口

本契约的具体实施清单见：
[docs/superpowers/plans/2026-08-11-widget-ontology-integration-replan.md](/home/gavin/workspace/projects/CelanWorksmith/docs/superpowers/plans/2026-08-11-widget-ontology-integration-replan.md)
