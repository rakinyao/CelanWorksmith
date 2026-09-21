# 多选与树选择控件设置页中文化设计

## 目标

为传统 MultiSelect V2、Single TreeSelect 和 Multi TreeSelect Widget 的私有属性面板提供中英文可切换的固定展示文案，不改变组件运行时行为、数据结构、DSL 或公共编辑器界面。

## 范围

本期仅处理：

1. `MULTI_SELECT_WIDGET_V2`
2. `SINGLE_SELECT_TREE_WIDGET`
3. `MULTI_SELECT_TREE_WIDGET`

迁移各自内容和样式配置中的 `sectionName`、非技术 `label`、`helpText`、`placeholderText`、`helperText` 中的固定文案，以及展示型选项标签。

## 排除项

- 旧 `MULTI_SELECT_WIDGET` 已完成中文化且标记废弃，本期不处理。
- 不处理 `WDS_MULTI_SELECT_WIDGET`、JSON Form 内嵌 MultiSelect、WDS、Anvil、Action selector、Callbacks、Query、Action、Datasource、主题、全局编辑器、Chart、Form、DatePicker、JSON Form 或 ECharts。
- 不翻译事件 ID、`propertyName`、DSL、表达式、枚举持久化值、用户输入的树节点标签和值、默认数据、验证函数和验证错误文本、图标、颜色/尺寸值、hooks、条件及依赖。
- `sourceData`、`optionLabel`、`optionValue` 的包装表达式、示例数据与自动完成定义保持原样。

## 架构

新增三个 owner-scoped 资源命名空间：

```text
widgetProperty.multiSelectV2.*
widgetProperty.singleSelectTree.*
widgetProperty.multiSelectTree.*
```

英文与中文资源必须有相同键结构。各 Widget 的内容、样式配置改为零参数工厂，工厂在属性面板被请求时通过现有 i18n 单例解析当前语言，避免模块加载时固定英文。

MultiSelect V2 的默认值辅助说明是 Widget 私有固定 JSX 文案，工厂在运行时取得翻译后的字符串并生成等价 JSX；不得改动其 `defaultOptionValueValidation`、包装表达式或数据绑定逻辑。

## 配置约束

工厂化仅替换展示字段，保持配置数组及 children 顺序不变，并保留：

- MultiSelect V2 的 `sourceData`、label/value key 包装表达式、选项生成函数、`onFilterUpdate`、`onOptionChange`、`onDropdownOpen`、`onDropdownClose` 和 RTL 特性开关。
- Single TreeSelect 的树节点验证、`defaultOptionValueValidation`、`allowClear`、`expandAll`、事件和样式值。
- Multi TreeSelect 的树节点验证、`mode` 的 `SHOW_PARENT`、`SHOW_CHILD`、`SHOW_ALL` 值、`defaultOptionValueValidation`、事件和样式值。

## 测试与验收

每个 Widget 新增或扩展语言切换测试，断言中文下的代表性分组、标签、帮助、辅助说明或展示选项；同时断言代表性技术字段和值未变，并在 `finally` 中恢复英文。资源完整性测试验证三个命名空间在 `en-US`、`zh-CN` 的键结构配对及代表性中文值。

集中验证运行资源测试与三个 Widget 的聚焦 Jest 测试，随后运行 `git diff --check` 与相关源文件的 Prettier 检查。仅在测试发现属性面板缓存固定首次语言时，实施最小 locale 缓存修复。
