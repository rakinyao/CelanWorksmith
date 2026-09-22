# ECharts 运行时统一设计

## 目标

将 ChartWidget 的基础图表与 Custom ECharts 图表统一至 ECharts `6.1.0` 运行时，并保留 Custom ECharts 的 3D 扩展能力。此次工作只消除当前主应用 ECharts 6 与 iframe ECharts 5.4.3 的版本分叉，不扩展 Builder 图表类型或改变已有 Widget 数据、事件和 DSL 契约。

## 现状与问题

基础 ChartWidget 通过客户端依赖 `echarts ^6.1.0` 直接渲染。Custom ECharts 为隔离用户 option 中的函数执行与错误，使用 iframe；该 iframe 目前从 `public/libraries` 加载 `echarts@5.4.3.js` 和 `echarts-gl@2.0.9.js`。

这使同一个 ChartWidget 有两套运行时语义：基础 Builder 使用 ECharts 6，而高级 JSON 实际按 ECharts 5.4.3 运行。版本差异会使 API、option 行为和后续模板能力无法形成一个确定的产品契约。

## 已确认的方案

采用静态 iframe 运行时升级方案：保留 Custom ECharts iframe，升级其静态 UMD 资源，并使其版本与主应用依赖一致。

不采用移除 iframe 并在主应用内直接渲染的方案。iframe 仍承担用户函数反序列化、运行错误隔离、点击事件桥接的边界；该边界与版本统一无冲突。

## 运行时与资源契约

客户端依赖和 iframe 静态资源必须使用以下精确版本：

| 资源 | 版本 | 使用位置 |
| --- | --- | --- |
| `echarts` | `6.1.0` | 基础 ChartWidget 和 Custom ECharts iframe |
| `echarts-gl` | `2.1.0` | Custom ECharts iframe 的可选 3D 扩展 |

`echarts` 依赖由范围版本改为精确版本 `6.1.0`，避免未来安装时主应用与已提交静态资源发生漂移。`echarts-gl` 作为客户端依赖记录为精确版本 `2.1.0`，用于可追溯地生成/校验 iframe 静态资源。

`app/client/public/libraries` 保留版本化的 UMD 文件名：

```text
echarts@6.1.0.js
echarts-gl@2.1.0.js
```

Custom ECharts iframe 仅按上述顺序加载这两个本地资源，然后加载现有本地 lodash 资源。旧的 `echarts@5.4.3.js` 和 `echarts-gl@2.0.9.js` 在确认没有其他引用后移除，避免遗留运行时被误用。

## 行为与兼容边界

以下行为必须保持不变：

- `chartType: CUSTOM_ECHART`、`customEChartConfig`、`__fn_keys__` 和全部 DSL 字段名称。
- Custom ECharts 的 `setOption(option, true)` 更新策略、尺寸变化处理和 iframe 错误面板。
- 数据点点击事件及其传递至 `onDataPointClick` 的负载。
- 基础 Builder 的图表类型、`chartData` 数据模型、布局构建与事件行为。
- `echarts-gl` 的 3D series、坐标系和扩展组件在 Custom ECharts option 中可用。

本期不对已保存的 `customEChartConfig` 做迁移、逆向解析或自动版本回退。ECharts 5.4 配置中仍受 ECharts 6 支持的 option 应继续工作；已移除、行为改变或依赖旧版内部实现的 option 将由现有 iframe 错误路径显示。不得为单个旧配置继续加载 ECharts 5，因为这会重新引入版本分叉。

## 实施边界

本期仅修改：

- ChartWidget 的 Custom ECharts iframe 脚本资源引用。
- 客户端依赖和锁文件中的 ECharts/ECharts GL 版本声明。
- `public/libraries` 中对应的版本化 UMD 资源。
- 覆盖资源版本、加载顺序和现有行为的聚焦测试。

本期明确不做：

- 新增雷达、漏斗、仪表盘、桑基图、关系图、地图或其他 Builder 图表类型。
- 新建 ChartWidget 配置模式、模板库、主题选择器、导出工具栏或 option 可视化编辑器。
- 修改 `customEChartConfig`、`chartData`、DSL、持久化数据或事件技术标识。
- 改动 MapWidget、MapChartWidget、公共 Action selector、Callbacks、Query、Datasource、主题或全局代码编辑器。

## 验证与验收

自动化验证覆盖：

1. Custom ECharts iframe 的 `srcDoc` 使用 `echarts@6.1.0.js`，并在其后加载 `echarts-gl@2.1.0.js`；不得再引用 5.4.3 或 2.0.9。
2. 静态资源存在，且其 ECharts 运行时版本标识为 `6.1.0`；ECharts GL 资源版本为 `2.1.0`。
3. 既有 Custom ECharts 函数配置、点击事件桥接和错误展示测试继续通过。
4. 既有基础 ChartWidget 配置构建、数据集构建、布局和属性配置测试继续通过。

手工验收覆盖四类配置：基础柱状图、含 formatter 函数的 Custom 2D 图、Custom 3D 图（例如 `bar3D`）和错误 option。前三者应正常渲染和响应既有点击事件；错误 option 应显示 ChartWidget 的错误反馈且不影响编辑器其他组件。

## 后续阶段

本设计完成后，ChartWidget 的两条图表路径共享 ECharts 6 基线。常用高级图表的 Builder 化、模板、主题、工具箱和高级 JSON 编辑体验将作为后续独立设计，按图表族逐项评估，不在本次统一工作中预先引入。
