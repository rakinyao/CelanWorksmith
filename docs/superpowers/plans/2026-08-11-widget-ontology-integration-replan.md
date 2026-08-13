# CelanWorksmith Widget-Ontology 集成再规划

> 日期：2026-08-11
> 重基线：2026-08-12
> 依据：[docs/superpowers/designs/celanworksmith-widget-ontology-integration-contract.md](/home/gavin/workspace/projects/CelanWorksmith/docs/superpowers/designs/celanworksmith-widget-ontology-integration-contract.md)
> 目标：对照契约，补齐已有 Widget 的 Object 模式缺口，建立统一实现与验证清单。

## 重基线结论

本计划原先将 B7 作为入口，但代码与手工验证已经证明其核心目标完成：新建 Table 默认 Object 模式；绑定本体对象类型后，可通过应用绑定的 Runtime Provider 获取数据，并使用原生 `ReactTableComponent` 渲染。Object 模式已经具备原生 Table 的列配置、搜索、服务端分页、排序和行选择接入点；Query/JS 模式仍保持独立兼容路径。

因此，本计划不再从 B7 开始实现。B7 的 Search、分页和列配置等交互细节转入后续回归缺陷池，不应以旁路或自定义渲染方式修复。本体与原生数据源的基础融合已完成，后续任务目标转为补齐 Widget 覆盖率和体验一致性。

## 当前状态速览

| 模块 | 状态 | 备注 |
|---|---|---|
| 本体工程绑定 | ✅ 完成 | 应用可导入/绑定 YAML 本体工程 |
| 运行时数据读取 | ✅ 完成 | MongoDB 只读 Provider |
| Objects DataTree | ✅ 完成 | `$objects.{Type}.all/byId/_meta` |
| Functions DataTree | ✅ 完成 | `$functions.{Name}.data/run/_meta` |
| Actions DataTree | ✅ 完成 | `$actions.{Name}.run/_meta` |
| Variables DataTree | ✅ 完成 | `$variables.{Name}.data/run/_meta` |
| 应用级缓存隔离 | ✅ 完成 | 按 `applicationId` 刷新 |
| Action 执行链 | ✅ 完成 | 参数校验、确认、成功/失败刷新 |
| Table Object 模式 | ✅ 基础融合完成 | 默认 Object 模式；复用原生 `ReactTableComponent`；Query 模式独立保留 |
| Form Object 模式 | ⚠️ 框架有，字段映射不完整 | `ObjectFormMode` 存在；待完成编辑闭环 |
| FilterList | ⚠️ 数据通，UI 未对齐 | 裸表单元素 |
| ObjectDetail | ⚠️ 数据通，需对齐原生 | 展示属性列表 |
| Chart Object 模式 | ⚠️ 框架有 | 需对齐原生 Chart 数据格式 |
| Progress/Statbox Object 模式 | ⚠️ 框架有 | 需细化属性映射 |
| 自动补全/提示 | ⚠️ 基础有 | 需完善 `$variables` 补全与友好提示 |

## 已完成阶段：B7 Table Object 模式原生渲染对齐

状态：核心实现完成，后续按缺陷验收 Search、分页、排序和列配置细节。

目标：让 Table Object 模式复用原生 Table 组件，获得搜索框、翻页栏、固定表头、列配置面板等全套能力。

### B7.1 已完成的数据转换层
- 文件：`app/client/src/widgets/TableWidget/widget/objectTableUtils.ts`
- 工作：
  - 将 `getObjectTableRows` 输出改为原生 Table 可识别的 `{ id, [columnId]: value }` 行格式。
  - 将 `getObjectTableColumns` 输出改为原生 `primaryColumns` 格式（含 `columnType`、宽度、对齐、是否可见等）。
  - 增加 `id` 列但默认隐藏。

### B7.2 已完成的 ObjectTableMode 改造
- 文件：`app/client/src/widgets/TableWidget/component/ObjectTableMode.tsx`
- 工作：
  - 不再渲染裸 `<table>`。
  - 生成原生 Table 的 `tableData` 和 `primaryColumns` 后，调用 `TableComponent` / `TableComponentV2` 渲染。
  - 保留分页、排序、选择行逻辑，但改为通过 Table 组件自身的 `onPageChange` / `onSort` 回调触发。
  - 保留 `selectedObject` / `selectedObjects` 元属性。

### B7.3 已完成的列配置同步
- 文件：`app/client/src/widgets/TableWidget/widget/index.tsx` / `TableWidgetV2`
- 工作：
  - Object 模式下，当 `objectTypeId` 改变或本体刷新时，用元数据生成初始 `primaryColumns`。
  - 用户已修改过的列配置优先保留；新增属性追加到末尾；删除属性标记为不可见。
  - 属性面板 Columns 区在 Object 模式下可用。

### B7.4 已完成验证与遗留验收
- 自动化验证已覆盖 Object 模式列生成、数据适配、Query 隔离和选择状态契约。
- 手工验证已确认新建 App 绑定本体后，Table Object 模式可显示对象数据；Query 模式 `{{$objects.PurchaseOrder.all}}` 仍可正常显示。
- 后续验收：Search、分页、排序、列配置在 Object 模式下与 Query 模式的交互细节；发现的问题记录为缺陷并定向修复。

## 下一阶段：C10 FilterList UI 改造与 Query 模式联动

目标：FilterList 使用 Appsmith 设计系统控件，布局清晰；明确 Query 模式下的消费方式。

### C10.1 设计系统控件替换
- 文件：`app/client/src/widgets/FilterListWidget/component/index.tsx`
- 工作：
  - 使用 ADS 的 `Select` / `Input` / `Button` 或现有的 `DropdownControl` / `TextInput` 替换裸 `<select>` / `<input>`。
  - 每行条件使用 Flex 布局，统一间距。
  - “Add condition” 与 “Reset” 分组显示。
  - 标签使用中/英双语。

### C10.2 增强过滤能力
- 文件：`app/client/src/widgets/FilterListWidget/widget/filterUtils.ts`
- 工作：
  - 支持多条件组合（AND）。
  - 支持 Link 类型属性的过滤（选择关联对象）。
  - 支持枚举值的下拉选择。

### C10.3 Query 模式联动方案（暂不实现，仅预留接口）
- 在 Query 模式下，FilterList 仍可配置并输出 `filter` 对象。
- 预留 JS 辅助函数：`$objects.PurchaseOrder.query({ filter: FilterList1.filter })`（后续实现）。
- 当前 Query 模式下 Table 不自动消费 FilterList，需在 UI 中提示用户切到 Object 模式。

### C10.4 验证
- 单元测试：过滤条件构建、布局渲染、双语标签。
- 手工测试：多条件过滤、枚举/Link 属性过滤、Table Object 模式联动。

### C10 实施拆分与门禁

C10 不作为单个实现任务执行，按以下顺序拆分。每项完成后必须通过定向测试和 scoped review，才可进入下一项；实现不得新增 Redux reducer、Saga、运行时 Provider 或平行过滤状态。

#### C10.1 ADS 控件与布局
- 文件：`app/client/src/widgets/FilterListWidget/component/index.tsx`、`app/client/src/widgets/FilterListWidget/widget/index.test.tsx`。
- 用 `@appsmith/ads` 的 `Select` / `Option` 替换 Object Type、Property、Operator 和 Boolean Value 的裸 `<select>`，保留稳定的 `aria-label`。
- 保持现有 `objectTypeId`、`filter`、`isValid` meta 发布契约和切换 Object Type 后清空条件的行为。
- 保持双语标签、条件行 Flex 布局，以及 Add condition / Reset 分组；不在本任务增加新条件类型。
- 定向验证：FilterList component/widget 测试、Prettier、该范围 ESLint、`git diff --check`。

#### C10.2 枚举与关联对象条件
- 文件：`app/client/src/widgets/FilterListWidget/component/index.tsx`、`app/client/src/widgets/FilterListWidget/widget/filterUtils.ts` 及各自测试。
- `ENUM` 属性仅允许 `equals`，值从 `property.enumValues` 选择；缺少枚举选项时明确显示不可用状态并保持 filter 无效。
- 带 `referenceTypeId` 的属性作为关联对象 ID 条件，只允许 `equals`，从已加载的目标类型对象集合选择稳定 `id`；目标元数据/数据未就绪时显示加载或空态，不发起新的数据请求。
- 扩展 `FilterCondition.value` 的既有原子值契约，不引入对象或 Link 请求状态；过滤仍由已有 ObjectSet/运行时查询链消费。
- 定向验证：operator/value 校验、枚举和关联对象渲染、结构化 filter 输出。

#### C10.3 Query 模式边界与可发现性
- 文件：`app/client/src/widgets/FilterListWidget/widget/index.tsx`、`app/client/src/widgets/FilterListWidget/widget/index.test.tsx`，必要时补充集成契约与手工验证记录。
- Query 模式仍不发布/自动应用本体 filter，明确渲染双语边界提示：FilterList 的结构化条件只能由 Object 模式集合 Widget 通过 `objectFilter` 消费。
- 提示引导用户切换到 Object 模式，不承诺或伪实现 `$objects.<Type>.query(...)`。
- 定向验证：Query 模式无 meta 发布、提示存在、Object 模式行为未回归。

#### C10 阶段验收
- 自动化：三个短任务的定向 Jest 测试、格式化、范围 ESLint 和 `git diff --check`。
- 手工：绑定本体工程后，选择 Object Type，添加 STRING、ENUM、关联对象条件；将 `{{FilterList1.filter}}` 绑定到 Table Object 模式的 `objectFilter` 并确认结果；切换 Query 模式确认明确提示且不自动改变 Query Table。
- 结束时记录已知范围：Query 模式的未来辅助查询 API 仍是后续能力，不属于 C10。

## 第三阶段：单对象/表单类 Widget 完善

### D1 ObjectDetail 原生渲染对齐
- 文件：`app/client/src/widgets/ObjectDetailWidget/widget/index.tsx` / `component/index.tsx`
- 工作：
  - 使用原生 Form 字段控件展示属性。
  - Link 属性显示关联对象摘要，点击弹出对象选择器。
  - 支持字段分组、隐藏、排序。

### D2 Form Object 模式字段映射
- 文件：`app/client/src/widgets/FormWidget/widget/index.tsx`
- 工作：
  - 按 `dataType` 自动生成子字段 Widget（Input/Text/Select/Switch/DatePicker/Number）。
  - 支持枚举值生成 Select 选项。
  - Link 属性生成对象选择器字段。
  - 提交时收集字段值并触发 Action 或调用运行时 create/update API。
  - 字段校验规则从元数据读取（required、min/max、pattern）。

### D3 自动补全与提示完善
- 文件：`app/client/src/entities/DataTree/dataTreeCelanworksmithVariables.ts` 及相关 autocomplete 配置
- 工作：
  - 修复 `$variables.` 输入时的自动补全提示。
  - 统一 `$objects` / `$functions` / `$actions` / `$variables` 的补全提示格式。

### D1/D2 实施拆分与门禁

D1 与 D2 共享 `fieldMetadataLayout`、对象绑定验证、Link Redux 缓存和 Action 执行链，但不得合并为一个实现任务。每项仅修改所属 Widget 与其定向测试；禁止为详情或表单创建独立的对象加载、Link 加载、表单执行或刷新状态。

#### D1.1 ObjectDetail 详情展示对齐
- 文件：`app/client/src/widgets/ObjectDetailWidget/component/index.tsx`、`component/index.styled.tsx` 与定向测试。
- 以 ADS 展示原语和语义化详情结构替换裸文本/自定义展示区域，复用 `getFieldLayout` 已提供的字段分组、隐藏、排序与 displayName。
- 空、无效对象、类型不匹配、元数据不可用和权限状态必须保持可读、无崩溃；不改 Link 请求策略。

#### D1.2 ObjectDetail Link 选择交互对齐
- 文件：`app/client/src/widgets/ObjectDetailWidget/component/index.tsx` 与定向测试。
- 将 Link tab、搜索、选择和重试控件迁移到 ADS 原语或现有标准控件；保留懒加载首个 Link、按需加载其它 Link、选择回写 `selectedLinkedObject*` 的契约。
- 本任务不实现 Link 写回或新的对象选择请求；只展示已有 Link reducer 缓存。

#### D2.1 Form Object 字段映射
- 文件：`app/client/src/widgets/JSONFormWidget/component/ObjectFormMode.tsx` 及定向测试。
- 保持 `fieldMetadataLayout` 的分组/隐藏/排序和 `fieldMetadataLayout` 到控件类型映射；将 ENUM/BOOLEAN/数值/日期字段统一到设计系统控件。
- `referenceTypeId` 字段只使用已加载对象缓存选择稳定 ID；数据不可用时保留明确状态，不发起平行请求。

#### D2.2 Form Object 校验与提交链
- 文件：`app/client/src/widgets/JSONFormWidget/component/ObjectFormMode.tsx`、`FormWidget/widget/index.tsx` 和定向测试。
- 复用 `objectActionValidation`、既有 Form 元属性发布与 `celanworksmithActionRun`；完善必填、枚举、类型错误的字段级定位和 Action 成功/失败后的编辑值策略。
- 不新建执行 Saga、刷新 Reducer 或运行时 create/update API。

#### D1/D2 阶段验收
- 自动化：每个短任务的 Jest、Prettier、范围 ESLint、`git diff --check`；阶段末运行 ObjectDetail、JSONForm、FormWidget 的相关套件。
- 手工：ObjectDetail 绑定单对象并检查分组、隐藏字段和 Link 选择；Form 绑定单对象，编辑字符串/数值/枚举/布尔/关联对象字段，验证必填报错、Action 成功刷新和失败时保留编辑值。

## 第四阶段：数值/图表/控制类 Widget

### E1 Progress / Statbox
- 文件：`app/client/src/widgets/ProgressWidget/widget/index.tsx` / `StatboxWidget/widget/index.tsx`
- 工作：
  - 按 dataType 选择数值属性。
  - 支持聚合值（count、sum、avg、max、min）。
  - Statbox 支持 Object 模式和聚合变量。

### E2 Chart Object 模式
- 文件：`app/client/src/widgets/ChartWidget/widget/index.tsx`
- 工作：
  - 对齐原生 Chart 数据格式（`seriesData`、`chartData`）。
  - 支持选择 X 轴属性、Y 轴属性/聚合。
  - 支持按 Link 或枚举分组。

### E3 ActionButton 完善
- 文件：`app/client/src/widgets/ActionButtonWidget/widget/index.tsx`
- 工作：
  - 成功/失败提示。
  - 执行中禁用与进度反馈。
  - 参数绑定支持 Link 对象和嵌套属性。

## 第五阶段：跨 Widget 一致性与体验优化

### F1 空态与加载态统一
- 统一各 Widget 的 loading、error、empty、permission-denied 状态。
- 使用 Skeleton 或 EmptyState 组件。

### F2 属性面板默认折叠
- Query 模式配置默认折叠。
- Object 模式配置置顶。

### F3 本体绑定向导与调试面板
- 在 App 创建流程中提示绑定本体工程。
- 调试信息以“开发者模式”开关控制，不默认展示。

### F4 大模型语义描述展示
- 在属性面板/helpText 中展示 `semanticDescription`（多语言）。
- 为 LLM 辅助生成保留结构化语义上下文。

## 重基线后的执行顺序与验证策略

执行顺序：C10 → D1/D2 → D3 → E1/E2/E3 → F1/F2/F3/F4

所有后续任务必须遵守 [Subagent 执行通用约束](../process/subagent-execution-constraints.md)。特别是：代码修改按任务串行，只有只读调查可以并行；测试基础设施独立拆分；每项实现以短任务、定向测试和 scoped review 为门禁；无法在时间盒内进入定向验证的任务必须按 `BLOCKED` 规则重新拆分，不得扩大范围后原样重试。

第三阶段优化计划中的 C0-C9 已经提供共享加载状态、显示名称、字段元数据、Action 反馈与局部刷新、自动补全、Link、表单校验、绑定调试和语义展示能力。后续任务必须先复用这些能力；仅在发现契约缺口时补充其定向测试和实现，不重新创建平行的状态或执行链。

每阶段完成后：
1. 子代理实现核心代码。
2. 子代理门禁：Prettier、ESLint、定向 Jest 测试。
3. 独立子代理审查代码是否符合契约。
4. 修复审查问题。
5. 手工验证关键用例。
6. 建立阶段检查点。

## 当前入口：C10

下一个待实施阶段为 **C10：FilterList UI 改造与 Query 模式联动边界**。该阶段重点是将结构化过滤器改造成符合 Appsmith 设计系统的 Object-first 控件，并清晰呈现 Query 模式不自动消费 `FilterList.filter` 的既定边界。

后续单项实施计划将从 C10 生成，并采用短任务、定向测试、独立审查和手工验证的节奏执行。
