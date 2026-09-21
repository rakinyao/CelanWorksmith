# 选择控件设置页中文化设计

## 目标

为编辑器中的传统 Checkbox、Switch 和 RadioGroup Widget 属性面板提供中英文可切换的显示文案，延续既有 Widget 私有设置页中文化模式，不改变运行时行为、DSL 或公共编辑器界面。

## 范围

本期仅处理以下传统 Widget：

1. `CHECKBOX_WIDGET`
2. `SWITCH_WIDGET`
3. `RADIO_GROUP_WIDGET`

每个 Widget 仅迁移其私有属性配置中的 `sectionName`、非技术 `label`、`helpText`、`placeholderText` 与展示型选项标签。

## 排除项

- 不处理 WDS Widget、Anvil 布局、Chart、Form、DatePicker、JSON Form 或 ECharts。
- 不翻译事件技术标识、`propertyName`、DSL 字段、表达式、默认数据、持久化选项值、验证返回文本、图标、颜色、尺寸、hooks、条件和依赖。
- 不处理 Action selector、Callbacks、Query、Action、Datasource、主题、全局编辑器及其他共享组件。
- RadioGroup 选项数据的用户输入标签与值，以及其验证错误信息，维持原样；它们不是属性面板的固定展示文案。

## 架构

在现有资源中分别增加 `widgetProperty.checkbox.*`、`widgetProperty.switch.*` 和 `widgetProperty.radioGroup.*`。`en-US.ts` 与 `zh-CN.ts` 中每个命名空间的键结构必须相同。

三个 Widget 的内容和样式配置改为零参数工厂。工厂在属性面板被请求时通过现有 i18n 单例读取当前语言，避免模块加载时固定英文。工厂仅替换展示字段，维持配置结构、顺序及全部技术字段原值。

## 行为与测试

每个 Widget 增加或扩展语言切换测试：中文下断言代表性分组、标签、帮助文本或展示选项为中文；在 `finally` 中恢复英文，并断言代表性技术字段或持久化值未变化。资源完整性测试检查三组资源键结构配对并断言代表性中文值。

集中验证运行资源测试和三个 Widget 的聚焦 Jest 测试，以及差异和 Prettier 检查。仅当测试证明传统 Widget 的属性面板缓存固定了首次语言时，才进行最小的 locale 缓存修复并覆盖真实调用路径。
