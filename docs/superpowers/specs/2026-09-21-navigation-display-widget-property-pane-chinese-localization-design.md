# 导航与展示控件设置页中文化设计

## 目标

为传统 CheckboxGroup、Tabs 和 Divider Widget 的私有属性面板提供中英文可切换的显示文案，保持既有运行时行为、DSL 和公共编辑器界面不变。

## 范围

本期仅处理：

1. `CHECKBOX_GROUP_WIDGET`
2. `TABS_WIDGET`
3. `DIVIDER_WIDGET`

迁移每个 Widget 私有配置中的 `sectionName`、非技术 `label`、`helpText`、`placeholderText` 与展示型选项标签。

## 明确排除

- ProgressBar 已废弃且被替代为 `PROGRESS_WIDGET`，本期不处理。
- 不处理 WDS、Anvil、Chart、Form、DatePicker、JSON Form、ECharts、Action selector、Callbacks、Query、Action、Datasource、主题或全局编辑器。
- 不翻译事件 ID、`propertyName`、DSL、表达式、持久化选项值、默认数据、验证逻辑和错误文案、图标、颜色和尺寸值、hooks、条件及依赖。
- CheckboxGroup 的用户选项标签和值保持用户数据原样。
- Tabs 的 `tabsObj` 中用户定义 Tab 名称、默认 Tab 值及其验证示例保持原样；仅翻译固定面板标题、字段标签、帮助与占位文案。

## 架构

各 Widget 在既有 i18n 资源中使用独立命名空间：

```text
widgetProperty.checkboxGroup.*
widgetProperty.tabs.*
widgetProperty.divider.*
```

`en-US.ts` 与 `zh-CN.ts` 必须具有相同键结构。内容与样式配置改为零参数工厂，在被请求时通过现有 i18n 单例解析当前语言；不得将语言相关配置存为模块级静态数组。

Tabs 的嵌套 `panelConfig` 也在外层内容工厂中创建，使其固定分组和可见性字段随语言切换更新，同时继续引用既有 `updateHook`、`updateRelatedWidgetProperties` 与布局回调。

## 配置约束

工厂化只替换展示字段，并完整保留配置数组和 children 的顺序，及以下技术定义：

- CheckboxGroup 的 `defaultSelectedValuesValidation`、选项 `value`、`onSelectionChange` 与对齐枚举值。
- Tabs 的 `tabsObj`、`defaultTab`、`onTabSelected`、Tab 标题数据、更新钩子和自动高度操作。
- Divider 的 `orientation`、`strokeStyle`、`capType`、`capSide` 的选项值，及颜色、厚度和图标定义。

## 测试与验收

每个 Widget 增加或扩展语言切换测试：中文断言代表性分组、字段、帮助文本或展示选项；同时断言技术字段和选项持久化值不变，并在 `finally` 中恢复英文。资源测试检查每个新命名空间在两种语言中的键结构配对与代表性中文值。

最后运行资源测试和三个 Widget 的聚焦 Jest 套件，以及 `git diff --check` 和指定源文件的 Prettier 检查。只有测试显示属性面板缓存固定了首次语言时，才实施最小的 locale 缓存修复。
