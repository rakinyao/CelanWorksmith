# 常用 Widget 设置页中文化设计

## 目标

为编辑器中当前常用的传统 Widget 属性面板提供可切换的英文和中文显示文案。本期覆盖 Button、Text、Image 和 Container，不改变 Widget 的运行时行为、DSL、事件契约或公共编辑器界面。

## 范围

本期仅处理以下传统 Widget：

1. `BUTTON_WIDGET`
2. `TEXT_WIDGET`
3. `IMAGE_WIDGET`
4. `CONTAINER_WIDGET`

每个 Widget 只迁移其私有属性配置中的：

- `sectionName`
- 非技术性的 `label`
- `helpText`
- `placeholderText`
- `searchPlaceholderText`
- 展示用途的下拉选项标签

## 排除项

以下内容不在本期范围：

- `WDS_*` Widget、Anvil 布局系统和其专有配置。
- 事件技术标识，例如 `onClick`。
- `propertyName`、Widget ID、DSL 字段、绑定表达式、回调名称和用户配置的数据值。
- 图标名、颜色值、尺寸值、枚举持久化值、默认数据、验证逻辑、hooks、依赖关系和隐藏条件。
- Action selector、Callbacks、Query、Action、Datasource、主题、全局编辑器及其他共享组件。
- Chart、Form、DatePicker、JSON Form 及 ECharts 相关开发。

## 架构

每个 Widget 在现有 i18n 资源中使用独立所有权命名空间：

```text
widgetProperty.button.*
widgetProperty.text.*
widgetProperty.image.*
widgetProperty.container.*
```

英文和中文资源必须具有完全相同的键结构。配置对象不得在模块加载时保存语言相关文本；Widget 的属性面板方法在请求配置时调用零参数工厂函数，工厂通过现有 `i18n` 单例解析当前语言。

Button 已有资源命名空间时继续扩展该命名空间，不引入跨 Widget 的通用词库。Text、Image 和 Container 使用各自命名空间，即使存在相同词汇也不跨 Widget 复用。这保持 Widget 私有文案的所有权边界，并避免影响公共编辑器文案。

## 配置与行为约束

工厂化仅替换显示字段。以下内容必须逐项保持原值和原顺序：

- 配置分组和 children 的顺序。
- `propertyName`、`controlType`、`value`、`defaultValue` 与验证定义。
- 事件标签 `onClick` 及其触发属性定义。
- 图标、字体内部值、颜色/尺寸数值、表达式和示例数据。
- `hidden`、`dependencies`、`updateHook`、`isBindProperty`、`isTriggerProperty` 等运行时配置。

Widget 继续走现有 `WidgetFactory` 属性面板路径。除非验证发现某个传统 Widget 的缓存确实持有语言相关配置，本期不扩大或重构共享缓存；若需要缓存修复，必须仅按 locale 划分属性面板配置缓存并增加真实调用路径回归测试。

## 测试与验收

1. 资源测试断言四个 Widget 命名空间在 `en-US` 和 `zh-CN` 中键结构一致，并验证代表性中文值。
2. 每个 Widget 添加或扩展属性配置测试：切换至 `zh-CN` 后检查分组、标签、帮助和展示选项为中文；切回英文后恢复原英文。
3. 测试同时断言代表性的技术标识和值不变，例如 `onClick`、`propertyName`、选项 `value` 与颜色/尺寸值。
4. 手工验收只检查编辑器中四个传统 Widget 的属性面板。WDS/Anvil Widget 不作为本期验收对象。
5. 运行资源测试和四个 Widget 的聚焦 Jest 测试；若修改了共享属性面板缓存，额外运行对应 `WidgetFactory` 测试。

## 分批实施

实施按独立可验收的任务进行：

1. Button：扩展已有私有资源并将内容/样式配置工厂化。
2. Text：新增资源，迁移内容/样式配置工厂。
3. Image：新增资源，迁移内容/样式配置工厂。
4. Container：新增资源，迁移内容/样式配置工厂。
5. 资源完整性和四个 Widget 的集中回归验证。

各任务均不修改 WDS/Anvil、共享事件编辑器或 ECharts。ECharts 体验改造将在本期中文化完成后另行设计。
