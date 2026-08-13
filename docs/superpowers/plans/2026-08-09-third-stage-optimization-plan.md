# CelanWorksmith 第三阶段优化实施计划

本计划基于 `CelanWorksmith_第二阶段检查点与第三阶段优化计划.md` 的 C0-C9 设计，按独立、可验证任务执行。已有 T0-T8、B0-B6 变更是前置基线，不能重置或覆盖。

## 全局约束

- Query 模式、旧 DSL 和原生 Appsmith 行为保持独立，不以本体模式替代它们。
- 统一状态必须保留刷新前最后一次成功数据；绑定键改变时才清理强相关选择值。
- 权限错误必须独立于普通网络/服务错误展示，类型错误必须包含对象类型、属性和期望类型。
- 配置序列化保存稳定 ID，显示层可以使用 `displayName` 和中文名称。
- 所有新增行为必须有定向 Jest 测试、Prettier 和 `git diff --check` 证据；仓库级类型检查若被既有错误阻断，必须记录原因并提供 changed-file 证据。
- 不实现 T9 发布快照、生产 Provider、生产 Action Server、任意 Custom Chart 通用注入协议或未经权限裁剪的大模型上下文。

## Task 1：C0 共享状态与错误契约

- 定义共享 `OntologyLoadState`、状态节点、错误码、错误到用户文案的映射，以及带稳定 `requestKey`、`updatedAt`、`canRetry` 的契约。
- 覆盖 `idle -> loading -> ready/empty/error/permissionDenied/typeMismatch`，支持旧成功数据在刷新、错误和权限失败期间保留。
- 为错误归一化和状态矩阵添加纯函数测试；不直接重构所有 reducer。

## Task 2：C0 状态入口接入与重试

- 将 ObjectSet、Object Query、Link、Execution、Variable、Ontology/Metadata 的状态接入共享契约或提供兼容适配层。
- 暴露统一 Retry Action/selector 入口，至少覆盖对象、查询、Link、元数据和变量加载失败。
- 补 reducer/selector/Saga 回归测试，确保权限分类、刷新保留旧值、Query 隔离和重试行为正确。

## Task 3：C1 显示名称与稳定 ID

- Object Type、Property、Link、Action、Function 同时支持显示名、中文名和稳定 ID 搜索。
- 元数据删除或缺失时显示 `missing / 已删除`，不按同名替换；配置序列化只保留 ID。

## Task 4：C2 字段元数据映射

- 根据 `group/order/hidden/readOnly/derived/dataType` 生成字段布局。
- 建立 STRING、INTEGER/DECIMAL、BOOLEAN、ENUM、DATETIME、REFERENCE 的默认控件映射及只读/派生约束。

## Task 5：C3 Action 执行反馈

- 同一 Action 执行中防重复触发，展示进度、request ID 和 execution ID。
- 将参数错误、权限错误、服务错误、业务拒绝区分展示，保留最后一次成功结果。

## Task 6：C4 Action 局部刷新

- 根据 `changedObjects`、`changedProperties`、`links` 计算最小刷新集合。
- 仅刷新受影响查询、Link、Variable 和 Widget 元数据，保留编辑中的输入、未提交表单值和 Widget 配置。

## Task 7：C5 绑定提示与自动补全

- 提供缺失绑定的具体修复提示；自动补全只暴露可用节点并显示路径、返回类型、状态和稳定 ID。
- 覆盖空集合、全 null、错误恢复、跨 Widget `$objects/$variables`。

## Task 8：C6 Link 展开与关联对象选择

- 支持 Link 显示名、目标类型、基数、懒加载/预读、空集、权限和重试。
- 关联选择器支持目标类型搜索，返回对象 ID，并保留展开和选择状态。

## Task 9：C7 表单校验与错误定位

- 统一 required、dataType、ENUM、REFERENCE、范围和 Action 参数校验。
- 错误绑定字段、表单摘要和 Action 请求，聚焦第一个可修复错误，禁止绕过 readOnly/derived。

## Task 10：C8-C9 向导、调试和语义辅助

- C8 展示 App、Ontology Project/Version、Provider、对象类型、加载状态以及脱敏请求调试信息，支持单节点重试、清缓存和复制稳定绑定信息。
- C9 展示 `description/semanticType/examples`，实现权限过滤、脱敏、版本和缓存失效规则，不把敏感值或未授权字段提供给大模型辅助。

每个任务必须通过任务审查后才进入下一个任务；全部任务完成后再进行一次整体验证和第三阶段检查点记录。
