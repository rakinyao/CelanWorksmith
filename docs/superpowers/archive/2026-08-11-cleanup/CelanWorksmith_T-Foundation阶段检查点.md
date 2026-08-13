# CelanWorksmith T-Foundation 阶段检查点

记录日期：2026-08-07  
检查点范围：本体工程导入、App 绑定、MongoDB 模拟运行时和第一批 Object-aware Widget 联动  
下一阶段：第二阶段“全面兼容本体”设计与实施  
Git 状态：当前工作区仍有前序 T0-T8 及工程化改造未提交变更；本检查点不执行 `git commit`、不创建 tag、不重置工作区。

## 1. 检查点结论

本阶段的开发目标已经通过手工验收，可以作为后续“全面兼容本体”工作的恢复基线。

已验证的完整链路：

```text
Ontology YAML Project
  -> Ontology Registry
  -> 新建 App 绑定 Project/Version
  -> App 重新打开后恢复绑定
  -> Ontology Provider / MongoDB Runtime Provider
  -> Object DataTree
  -> Table Object Mode
  -> FilterList Object Query
  -> Table Widget 消费过滤结果
```

## 2. 本阶段交付范围

- YAML 本体工程可以导入并保存到独立的 `celanworksmith_ontology` Registry。
- App 保存 `projectId`、`projectVersion` 和 `providerId` 绑定关系。
- 编辑器进入时加载绑定状态，并在未绑定状态显示工程选择入口。
- 绑定后的 Ontology、Object Metadata 和 Runtime Object 请求使用当前 `applicationId`。
- MongoDB 模拟只读运行时使用独立数据库 `celanworksmith_runtime`。
- Table Widget 支持 Object 模式，可选择 Object Type。
- FilterList 支持 Object Type、属性和过滤条件，并可向 Table Widget 暴露过滤结果。
- 原生 Datasource/Query 模式仍作为独立路径保留。

## 3. 手工验收记录

### 3.1 App 绑定

验证步骤：

1. 新建 App，进入本体页。
2. 在绑定工程选择框中选择 `celanworksmith-demo:1.0.0`。
3. 点击绑定。
4. 重新打开该 App，再次进入本体页。

实际结果：

- 工程可以选择并绑定。
- 绑定后不再出现 App 级错误页。
- 重新打开 App 后，本体数据可以正常加载，绑定关系保持。

### 3.2 Table Object Mode

配置：

```text
Widget: Table1
Data Mode: Object
Object Type: PurchaseOrder
```

实际结果：

- `PurchaseOrder` 对象列表可以加载并显示。

### 3.3 FilterList 与 Table 联动

配置：

```text
Widget: FilterList1
Object Type: PurchaseOrder
Property: Delay Days
Operator: gt
Value: 1

Table Data: FilterList1.filter
```

实际结果：

- Table Widget 正常消费 FilterList 的过滤结果。
- 返回 2 条记录。
- `Delay Days` 分别为 `4` 和 `8`，符合过滤条件 `Delay Days > 1`。

## 4. 已解决的阶段性问题

### 4.1 重复绑定入口

根组件和 Ontology Explorer 曾同时渲染绑定面板，导致本体页出现两个入口。现已保留 Ontology Explorer 中的绑定入口，并移除 AppIDE 根组件的重复渲染。

### 4.2 工程列表为空

问题根因是开发环境 `ontology_projects` 集合为空，而不是前端下拉框渲染延迟。已恢复 `celanworksmith-demo:1.0.0` 工程到本地 Registry；工程定义来自仓库 YAML 文件，不恢复旧的硬编码 Mock Provider 数据。

### 4.3 绑定后 App 崩溃

问题根因是 Ontology Explorer 在未绑定状态提前返回，绑定成功后才执行后续 Hook，造成 React Hook 顺序变化。现已将 Hook 移到条件渲染之前，并增加绑定状态切换回归测试。

## 5. 自动化与环境证据

最近一次前端定向回归：

```text
3 个测试套件通过，8 个测试通过，0 失败
```

覆盖 Ontology Explorer、绑定面板、绑定加载器和绑定状态切换。测试中仍有既有 React `act` 警告，不影响断言结果。

格式检查：

```text
Prettier check: passed
git diff --check: passed
```

当前本地 Registry 数据核验：

```text
Project: celanworksmith-demo
Version: 1.0.0
Object Types: 2
Functions: 1
Actions: 1
```

开发服务当前保持运行，前端入口返回 HTTP `200`。本阶段使用的运行时 Provider 是 MongoDB 模拟 Provider，不代表已完成 Layer 2/3 真实平台接入。

## 6. 当前边界与未完成内容

- 目前只完成第一批 Object-aware Widget 和 Table/FilterList 联动，不代表所有 Appsmith Widget 已兼容本体。
- 尚未建立完整的 Widget Compatibility Matrix 和统一 Metadata Adapter。
- 尚未覆盖 Select、List、Chart、原生输入控件、复杂 Form 字段和更多展示控件的本体映射。
- 本体工程 Registry 和运行时数据目前使用本地 MongoDB 模拟；未来需要替换为本体建设管理平台和唯一只读数据源 Provider。
- 不进入 T9 的应用固化、发布快照、版本迁移和运行时发布校验。

## 7. 第二阶段放行原则

进入“全面兼容本体”前，必须遵循以下原则：

1. 本体数据源与原生 Datasource 在应用层保持同等级的数据输入能力。
2. Widget 通过统一 Object Binding/Metadata Adapter 获取本体数据、属性元数据、Link 和 Action，不在每个 Widget 内重复实现 API 请求。
3. 每个 Widget 同时明确原生模式和 Object 模式，未配置 Object 模式时保持原有 Appsmith 行为。
4. 先定义稳定的 Object Set、Object Instance、Property、Link、Action 绑定契约，再按 Widget 类别扩展。
5. 每一类 Widget 都必须覆盖加载中、空数据、错误、权限失败、刷新和类型不匹配状态。
6. Widget 配置、动态绑定、DataTree、自动补全、DSL 导入导出和运行时刷新必须保持一致。
7. 每增加一类 Widget，必须有自动化测试、手工验收记录和原生模式回归验证。

## 8. 恢复与验证入口

恢复本阶段后，优先验证：

1. 新建 App 能看到 `celanworksmith-demo / 1.0.0`。
2. 绑定并重新打开 App，本体数据仍可加载。
3. Table Object Mode 使用 `PurchaseOrder` 显示列表。
4. FilterList 使用 `Delay Days gt 1` 后，Table 显示 2 条记录且值为 `4`、`8`。
5. 切换回原生 Table/Datasource 模式，确认原有路径未受影响。

关联文档：

- `CelanWorksmith_T8基础能力检查点.md`
- `docs/superpowers/verification/2026-08-06-t-foundation-ontology-project-app-binding-verification.md`
- `docs/superpowers/specs/2026-08-06-ontology-project-app-binding-design.md`
