# TableV2 设置页中文化范围修正设计

## 背景与结论

此前 Widget 设置页中文化首期将 `TableWidget`（`TABLE_WIDGET`）作为 Table 的迁移目标。该组件的 `getConfig()` 设置了 `hideCard: true`，因此不在编辑器的组件面板中提供给用户新建。

编辑器实际向用户提供的 Table 是 `TableWidgetV2`（`TABLE_WIDGET_V2`）：其 `getConfig()` 名称为 `Table`，并带有推荐组件和展示组件标签。本次修正将用户可见 Table 的中文化目标改为 `TableWidgetV2`。此前对旧 `TableWidget` 的迁移保留，用于历史应用继续编辑时的兼容性；它不再作为本期手工验收的主要对象。

## 范围

本期只处理 `TableWidgetV2` 自有的属性面板文案：

- 顶层内容配置：`widget/propertyConfig/contentConfig.ts`。
- 顶层样式配置：`widget/propertyConfig/styleConfig.ts`。
- 列编辑面板配置：`widget/propertyConfig/PanelConfig/` 与其子目录中由 TableV2 直接拥有的配置文件。

可迁移的文案类型与原首期设计一致：

- `sectionName`。
- 非技术属性的 `label`。
- `helpText`。
- `placeholderText` 与 `searchPlaceholderText`。
- 枚举和下拉控件的显示标签。

明确不处理：

- 事件标识和字段标识，包括 `onPageChange`、`onPageSizeChange`、`onTableFilterUpdate`、`onSearchTextChanged`、`onRowSelected`、`onSort`、`onSave`、`onDiscard`，以及全部 `propertyName`。
- DSL 字段、Widget/查询 ID、绑定表达式、示例表达式、列类型值、日期格式值、下拉选项 `value`、默认值和用户录入值。
- 公共 Action selector、Callbacks、Query、Action、数据源、主题和其他共享编辑器组件。
- WDS Table（`WDS_TABLE_WIDGET`）与旧 Table 之外的其他 Widget。

事件的 `helpText` 是 TableV2 私有显示文案，可以中文化；事件控件的 `label` 必须继续显示原技术标识。

## 实现设计

### 资源所有权

所有新增文字放入现有双语资源：

- `app/client/src/i18n/resources/en-US.ts`
- `app/client/src/i18n/resources/zh-CN.ts`

资源键归入 `widgetProperty.tableV2.*`。内容、样式和列面板可继续以嵌套路径表达所有权，例如 `content`、`style`、`column`、`help`、`placeholder`、`option`。不得将 TableV2 文案放入全局词典或复用旧 `widgetProperty.table.*`，以免旧 Table 与 TableV2 的文案和演进边界混淆。

两种语言的资源叶子路径必须完全一致。Widget 配置源文件中不得新增中文硬编码。

### 当前语言配置工厂

TableV2 当前从模块导入静态的 `contentConfig` 和 `styleConfig` 数组。这种形式会在模块初始化时固化显示文本，不能可靠响应语言切换。

将 TableV2 的内容配置、样式配置及列面板配置调整为工厂函数：每次属性面板配置被请求时生成数组，并在函数内通过 `i18n.t("widgetProperty.tableV2.<key>")` 解析显示文本。配置的结构、更新 hook、验证器、依赖关系、隐藏条件和持久化字段保持不变。

`TableWidgetV2.getPropertyPaneContentConfig()` 和 `getPropertyPaneStyleConfig()` 必须调用对应工厂，而不是返回模块级静态数组。

### WidgetFactory 缓存

TableV2 通过 `getPropertyPaneContentConfig()` / `getPropertyPaneStyleConfig()` 走 `WidgetFactory.getWidgetPropertyPaneCombinedConfig()` 回退路径。该组合配置缓存必须将当前 `i18n.language` 纳入缓存键，确保编辑器首次打开 Table 后切换语言，重新读取的属性面板能获得新语言的配置。

语言维度仅加入属性面板配置缓存；不得改变 Widget 实例、DSL、执行结果、查询绑定或其他运行时缓存语义。

## 验证

自动化测试至少覆盖：

1. `en-US` 与 `zh-CN` 的 `widgetProperty.tableV2` 资源叶子路径一致，代表性中文值正确。
2. `TableWidgetV2` 内容配置在中文环境显示中文分组和普通属性标签，例如数据、表格数据、分页或搜索配置。
3. 样式配置与列编辑面板的代表性标签、说明和下拉显示项在中文环境正确显示。
4. 列类型、日期格式等选项的 `value` 以及 `propertyName` 保持原始技术值。
5. 事件 `label` 仍为原技术标识，同时其 TableV2 私有说明文案可显示中文。
6. 经 `WidgetFactory` 的真实属性面板路径，先加载英文再切换中文后，TableV2 的内容和样式配置都刷新为中文。
7. 旧 `TABLE_WIDGET` 与 WDS Table 的行为和配置不因本次变更发生修改。

手工验证时，在中文界面新建组件面板中的 Table，依次检查内容、样式、列编辑面板；切换回英文后同一组件显示英文。事件动作选择器和 Callbacks 区域应保持既有语言与行为，不作为本任务改动对象。
