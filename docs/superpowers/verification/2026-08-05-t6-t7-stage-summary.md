# T6/T7 阶段总结

记录日期：2026-08-05

## 1. 阶段结论

T6 Object-aware Widget 第一批和 T7 Table/Form Object 模式的第一版实现已完成。当前代码保持既有 Query 模式默认行为，并将本体模式接入统一的 Redux/Saga 异步数据链。工作区基于 `codex/celanworksmith-t5-checkpoint`，业务代码已形成连续提交；收尾格式调整保留在当前工作区，未创建新的合并提交。

## 2. T6 已交付

- ObjectDetail：单对象绑定、属性分组、Link metadata 和关联对象查询、首个 Link 预读、其余 Link 懒加载、局部 Retry，以及关联对象选择输出。
- FilterList：metadata 驱动的属性过滤器、类型与运算符校验、版本化 Filter JSON、外部属性同步和刷新重算。
- ActionButton：单对象和参数校验、ontology Action 选择、复用 T5 Action 执行链、运行/成功/失败状态、结果与错误元数据。
- 所有 Widget 均通过 `CelanworksmithAPI` 与 Redux/Saga 访问运行时，不在渲染组件中直接构造 API 请求。

## 3. T7 已交付

- Shared Object Query Layer：以 `widgetId/typeId/query` 隔离查询状态，支持 loading、ready、empty、error，并在刷新期间保留上一页成功结果。
- 查询安全校验：Object Type metadata 存在性、分页范围、排序属性白名单、Filter JSON 版本/typeId/propertyId/operator 白名单。
- Table Object 模式：metadata 列、服务端分页、排序、FilterList 过滤、`selectedObject`/`selectedObjects` 输出；`QUERY` 模式仍走原生 Table 分支。
- JSON Form Object 模式：STRING、INTEGER、DECIMAL、DATETIME、BOOLEAN 字段，required/readOnly 约束，本地编辑值，复用 T5 Action 提交链和状态输出；`QUERY` 模式保持原有 schema/sourceData/onSubmit 流程。
- 本轮收尾修复了对象身份切换、配置类型不匹配、Table 查询变更后的旧选择、ActionButton 跨 Widget 状态污染和非法排序方向校验。

## 4. 验证结果

本次最终定向回归：

- T6/T7 相关 16 个 Jest suite、71 个测试通过。
- Table/JSON Form 属性配置回归 2 个 suite、5 个测试通过。
- Prettier 检查通过。
- ESLint 0 errors；保留 30 个 JSX/performance 或 named-use-effect warnings，未作为本阶段错误处理。
- `git diff --check` 通过当前工作区检查。

全仓库 TypeScript 检查仍受仓库既有 design-system/WDS/JSX 类型错误影响，不能作为本阶段完整通过依据；本阶段以定向 Jest、Prettier、ESLint 和手工/API 验证为准。

## 5. 已知边界

- Object Table 当前是独立轻量渲染分支，尚未复用原生 Table 的完整列样式、工具栏和复杂交互。
- `selectedObjects` 当前只输出当前页选中对象的第一版集合，跨页多选仍待增强。
- Object Form 当前使用浏览器原生输入控件，后续可接入 JSON Form 内部 FieldRenderer；复杂的提交成功后服务端字段变换仍需浏览器端场景验证。
- Table/Form/ObjectDetail/FilterList/ActionButton 的 Object Type、Action 仍以稳定 ID 或文本绑定为主，动态属性面板选择控件属于后续增强。
- 当前 UI 文案继续沿用英文；业务全量中文化不在本阶段范围。

## 6. 后续建议

下一阶段优先补充浏览器端验收：用 `PurchaseOrder` 验证 Table 分页/排序/FilterList 联动，用已有 Action 验证 Form 提交成功与失败状态，用对象切换验证 Form 输入隔离。随后再根据实际使用反馈决定是否完善原生 Table 样式复用、跨页多选和动态属性面板。
