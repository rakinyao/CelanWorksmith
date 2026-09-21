# Widget 中文化收尾审计

日期：2026-09-21

## 审计结论

当前常用 Widget 属性面板的基础中文化已达到阶段目标，不存在需要阻塞后续 ECharts 设计的中文化缺口。已完成范围包括：

- Table / TableV2、Select、MultiSelect V2、Single TreeSelect、Multi TreeSelect、Input；
- Button、ButtonGroup、IconButton、MenuButton；
- Text、Image、Container；
- Checkbox、Switch、RadioGroup、CheckboxGroup、Tabs、Divider；
- DatePicker V2、FilePicker V2。

这些控件已经使用 Widget 私有 i18n 资源和运行时属性配置工厂，并有语言切换回归测试覆盖。

## 扫描结果

本次扫描了 `app/client/src/widgets/*/widget/index.tsx` 中提供属性面板的 Widget，重点检查 `sectionName`、`label`、`helpText` 和 `placeholderText`。结果显示，英文残留主要分为四类：

| 类别 | 代表控件 | 处理建议 |
| --- | --- | --- |
| Chart / 图表 | `ChartWidget`、`MapChartWidget` | 暂缓，随 ECharts 体验设计统一处理 |
| 结构化表单 | `JSONFormWidget`、部分 `Form` 路径 | 暂缓，涉及 schema 和公共表单编辑体验 |
| 低频展示控件 | `ModalWidget`、`ProgressWidget`、`StatboxWidget` | 可后续单独处理，但不影响当前中文化目标 |
| 专用或历史控件 | `CameraWidget`、`AudioWidget`、`CodeScannerWidget`、`MapWidget`、`SwitchGroupWidget`、`RichTextEditorWidget`、`RateWidget` 等 | 按实际业务需求处理，不做批量迁移 |

扫描中还发现 `BaseInputWidget`、`DropdownWidget`、旧版 `FilepickerWidget` 等历史/共享实现。它们不应直接作为新的 Widget 私有中文化批次处理，以免误改公共配置、旧组件或已被 V2 替代的路径。

## 明确排除

以下内容继续由后续统一国际化或专项设计负责：

- 公共 Action selector、Callbacks、Query、Datasource、主题和全局编辑器；
- 事件技术标识、`propertyName`、DSL、绑定表达式、枚举持久化值和用户数据；
- WDS、Anvil、JSON Form 内嵌控件；
- Chart / ECharts 配置编辑体验。

## 后续建议

1. 将本审计作为当前中文化阶段的收尾基线，不再继续大规模迁移低频 Widget。
2. 进入 Chart / ECharts 调研与设计，先确认当前 ECharts 依赖、配置边界、数据绑定方式和 PagePlug 可借鉴实现。
3. `ModalWidget`、`ProgressWidget`、`StatboxWidget` 等控件仅在实际业务验证需要时再补充中文化。

