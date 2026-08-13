# CelanWorksmith 第二阶段检查点与第三阶段优化计划

记录日期：2026-08-09  
范围：第二阶段“全面兼容本体”B0-B6，以及第三阶段优化设计  
当前工作区：保留既有 T0-T8、T-Foundation 和 B0-B6 变更；本记录不执行 reset、clean 或覆盖已有改动。

## 一、第二阶段检查点

### 1.1 阶段结论

B0-B6 的基础兼容框架已经落地：本体对象和原生 Query 作为两条平行输入路径，Widget 通过共享 Object Binding、Metadata Selector、Object Query Layer、Execution Layer 和 DataTree 接入本体数据。新增 Object 模式默认用于新建的兼容 Widget；缺少模式字段的旧 DSL 仍归一化为 Query。

本检查点不包含 T9 的发布快照、发布态版本校验、运行时发布兼容和生产 Provider 接入。

### 1.2 B0-B6 交付范围

| 阶段 | 已完成内容 | 验证方式 |
|---|---|---|
| B0 | Widget 兼容矩阵和 Object/Query 边界 | 文档与现有 DSL 检查 |
| B1 | 共享 Object Binding、稳定 ID、元数据选择器、Table/TableV2 | Object Query、Table 定向测试 |
| B2 | FilterList、List、Select、Dropdown、MultiSelect 的 ObjectSet 映射 | 选择、过滤、空/错误/加载测试 |
| B3 | ObjectDetail、JSONForm、Form/Input 本体属性约束 | 表单集成和 Query 回归测试 |
| B4 | Link 查询、Action 参数校验、确认快照、Button 系列执行链 | Action/Link/Saga 定向测试 |
| B5 | Chart、Progress、Statbox 的 Object Property 和 Aggregation Variable 输入 | 可视化、状态、聚合和 Query 测试 |
| B6 | Object metadata schema 注入、自动补全刷新、控件双语提示和稳定 ID 保留 | DataTree、Tern、控件和回归测试 |

### 1.3 当前架构

```text
Widget DSL / Property Pane
          |
          v
Shared Object Binding + Metadata Selector
          |
          +--> Object Query Layer --> Redux/Saga --> Runtime API
          |                                  |
          |                                  +--> loading/ready/empty/error
          |                                  +--> permissionDenied/typeMismatch
          |
          +--> Execution Layer --> Function/Action Saga --> Action API
          |
          v
DataTree: $objects / $functions / $actions / $variables
          |
          v
Autocomplete Tern Definitions + Widget Renderers
```

关键约束：Widget 不直接调用本体 API；配置保存稳定 ID 而不是显示名称；元数据刷新不覆盖用户输入；Query 模式不读取 Object 状态，也不改变原生 Query 绑定。

### 1.4 当前验证结果

- 第二阶段核心回归：52 个测试套件、299 个测试通过。
- B5 可视化定向回归：6 个测试套件、80 个测试通过。
- B6 DataTree、Autocomplete、PostEvaluation、控件定向回归：41 个测试通过。
- 变更文件 Prettier 检查通过，`git diff --check` 通过。
- `yarn check-types` 仍因仓库既有的 design-system、WDS、React JSX 类型和 worker 类型错误失败；未发现该命令输出中针对本阶段核心逻辑的独立错误结论，不能把仓库级类型检查视为通过。
- 回归测试仍有既有 React `act`、DOM 属性和组件 key 警告；这些警告未导致断言失败。

### 1.5 已知边界与后续处理

1. Chart 的 Object 模式支持基础图表和聚合变量单点图；Custom EChart/Fusion Chart 在 Object 模式显示明确的“不兼容”状态，不静默使用 Query 配置。第三阶段或后续可定义 Custom 配置的数据注入契约。
2. Progress 读取单个对象属性时要求 ObjectSet 恰好一行；多对象必须绑定数值 Aggregation Variable，不能任意取第一行。
3. Statbox 支持单对象数值属性或 aggregation-only；对象属性必须通过 metadata 的 INTEGER/DECIMAL 类型校验。
4. 当前自动补全通过 DataTree 非枚举 `__metadata` 暴露空集合的属性 schema；生产手工验收仍需验证浏览器中空集合和全 null 数据的补全表现。
5. 本阶段没有重新执行浏览器端完整人工验收，不能把自动化结果等同于局域网页面验收。

阶段备份：`/home/gavin/backups/CelanWorksmith/stage-20260809-175524/`。备份排除了 `.git`、依赖目录、构建产物和运行日志，保留当前源代码、测试、配置和文档。

## 二、第三阶段优化设计

### 2.1 目标与非目标

第三阶段目标是把“能绑定、能加载、能执行”优化为可理解、可恢复、可定位的编辑体验，重点覆盖状态、命名、配置、反馈和调试。第三阶段仍不进入 T9，不做发布快照、生产 Action Server 接入或多租户权限模型重构。

### 2.2 统一状态契约

所有 Object、Property、Link、Function、Action、Variable 和 Widget 适配器统一使用：

```text
idle -> loading -> ready
                -> empty
                -> error
                -> permissionDenied
                -> typeMismatch
```

状态节点必须包含稳定的 `requestKey`、`updatedAt`、可选 `error.code/message` 和 `canRetry`。加载新数据时保留上次成功数据；只有绑定键发生变化时才清除与旧绑定强相关的选择结果。权限错误不显示普通网络错误，类型错误指出具体 Object Type/Property/expected type。

### 2.3 分步实施计划

每个步骤独立修改、独立测试、独立记录；只有当前步骤的自动化门禁和手工检查通过后才进入下一步。

#### C0：状态和错误基础设施

- 定义共享 `OntologyLoadState`、错误码到用户文案的映射和 Retry Action 契约。
- 统一 ObjectSet、Link、Execution、Variable 和 Metadata 的 loading/empty/error/permissionDenied/typeMismatch 展示入口。
- 补 reducer/selector/Saga 测试，验证刷新期间保留上一份成功结果和权限错误分类。
- 门禁：状态矩阵测试、Query 回归、错误重试测试。

#### C1：显示名称和稳定 ID 展示

- Object Type、Property、Link、Action 和 Function 统一显示 `displayName / 中文名称`，辅助信息显示稳定 ID。
- 缺失或删除的 ID 保留为 `missing / 已删除`，不自动替换为同名新 ID。
- 搜索同时匹配显示名、中文名和稳定 ID；配置序列化只保存 ID。
- 门禁：重复显示名、删除元数据、切换工程和刷新保留值测试。

#### C2：字段分组、隐藏、排序和默认控件

- 根据 Property metadata 的 `group/order/hidden/readOnly/derived/dataType` 生成字段配置。
- 建立 STRING、INTEGER/DECIMAL、BOOLEAN、ENUM、DATETIME、REFERENCE 的默认控件映射。
- 只读和派生字段默认不可编辑；隐藏字段不出现在默认布局但仍可通过显式配置恢复。
- 门禁：字段顺序、分组、删除字段、只读校验和旧 Form DSL 回归。

#### C3：Action 执行反馈

- Action 执行期间禁用同一 Action 的重复触发，显示进度和 request/execution ID。
- 参数错误在触发前定位到具体字段；权限错误、服务错误和业务拒绝分别展示。
- 保留最后一次成功结果，失败不覆盖成功数据。
- 门禁：重复点击、取消/失败、确认快照、Action Button/FormButton/MenuButton 测试。

#### C4：Action 成功后的局部刷新

- 从 Action 响应的 `changedObjects`、`changedProperties` 和 `links` 计算最小刷新集合。
- 只刷新受影响的 Object Query、Link Query、Variable 依赖和 Widget 元数据，不触发全页重载。
- 正在编辑的输入值、未提交表单值和 Widget 配置不被刷新覆盖。
- 门禁：成功局部刷新、无关 Widget 不刷新、失败保留、变量依赖刷新测试。

#### C5：绑定提示和自动补全

- Property Pane 提供缺失 Object Type、Property、Link、Action 和 Variable 的具体修复提示。
- 自动补全只广告当前已绑定且可用的节点；loading/error/permission 节点不进入可执行建议。
- 提示对象路径、返回类型、状态字段和稳定 ID；补全刷新由 metadata、runtime 和 variable 变更触发。
- 门禁：空集合 schema、全 null、变量变更、错误恢复、跨 Widget `$objects/$variables` 测试。

#### C6：Link 展开和关联对象选择

- Link 控件显示 Link displayName、目标 Object Type 和基数；支持懒加载、预读、空集、权限和重试。
- 关联对象选择器支持目标 Object Type 搜索、Property 显示和值 ID 返回。
- 保留当前展开 Link 和已选关联对象，Link 元数据刷新不重置用户选择。
- 门禁：多 Link、切换对象、空关联、权限拒绝、缓存和重试测试。

#### C7：表单校验和错误定位

- 统一 required、dataType、ENUM、REFERENCE、范围和 Action 参数校验。
- 错误同时绑定到字段、表单摘要和 Action 请求；焦点跳转到第一个可修复错误。
- readOnly/derived 字段不可通过 DSL 或事件绕过校验提交。
- 门禁：每种 dataType、跨字段错误、Action 参数、Query Form 回归测试。

#### C8：本体绑定向导和调试面板

- 绑定向导展示当前 App、Ontology Project/Version、Provider、Object Type 和加载状态。
- 调试面板展示请求键、API 路径、脱敏参数、缓存命中、耗时、响应状态、错误码和刷新原因。
- 提供单节点 Retry、清除缓存和复制稳定绑定信息；不展示 MongoDB 连接细节或敏感参数。
- 门禁：未绑定、绑定中、绑定失败、切换版本、权限失败和重试测试。

#### C9：语义描述和大模型辅助

- UI 在 Object、Property、Link、Action 和字段控件中展示 `description/semanticType/examples`，并区分用户可见文案与稳定 ID。
- 将经过权限过滤的语义元数据作为大模型辅助上下文，不把运行时敏感值、连接信息或未授权字段发送到辅助能力。
- 设计语义描述版本和缓存失效规则，避免 schema 更新后继续使用旧解释。
- 门禁：描述缺失、多语言描述、权限过滤、schema 更新和脱敏测试。

### 2.4 开发顺序和放行规则

```text
C0 状态契约
  -> C1 名称/ID
  -> C2 字段映射
  -> C3 Action 反馈
  -> C4 局部刷新
  -> C5 绑定/补全
  -> C6 Link
  -> C7 Form 校验
  -> C8 向导/调试
  -> C9 语义/大模型辅助
```

每一步必须提交设计记录、变更文件清单、定向 Jest、Prettier、`git diff --check` 和手工验证内容。若仓库级类型检查仍被既有依赖阻断，必须同时提供 changed-file 定向类型证据，不得把失败隐藏为通过。

### 2.5 第三阶段暂不实现的内容

- T9 发布态快照、发布版本和运行时兼容校验。
- 真实本体建设管理平台、唯一只读数据源和 Action Server 的生产适配器。
- 任意 Custom Chart 配置的通用本体数据注入协议。
- 未经权限裁剪的运行时数据或语义信息进入大模型上下文。
