# 表单与按钮 Widget 设置页中文化设计

## 目标

为 DatePicker V2、FilePicker V2、ButtonGroup、IconButton 和 MenuButton 的私有属性面板提供中英文可切换的固定展示文案，补齐业务表单构建与操作区常用控件的基础中文化，不改变 Widget 运行时行为、保存结构或公共编辑器。

## 范围

按以下顺序连续实施：

1. `DATE_PICKER_WIDGET2` 与 `FILE_PICKER_WIDGET_V2`。
2. `BUTTON_GROUP_WIDGET`、`ICON_BUTTON_WIDGET` 与 `MENU_BUTTON_WIDGET`。

每个 Widget 仅迁移其私有内容和样式配置中的 `sectionName`、非技术 `label`、`helpText`、`placeholderText`、固定展示按钮文字与展示型选项标签。

## 排除项

- 不翻译事件 ID、`propertyName`、DSL、表达式、验证逻辑及其错误文本、默认业务数据、文件 MIME 值、日期格式值、枚举持久化值、图标名、颜色/尺寸值、hooks、依赖、条件和动作回调名称。
- 不翻译用户配置的按钮标签、菜单项标签或数据源内容；`getDefaults()` 中的演示内容不作为本期中文化目标。
- 不处理 WDS、Anvil、JSON Form、Chart/ECharts、公共 Action selector、Callbacks、Query、Datasource、主题和全局编辑器。

## 架构

在既有 i18n 资源中新增五个 owner-scoped 命名空间：

```text
widgetProperty.datePickerV2.*
widgetProperty.filePickerV2.*
widgetProperty.buttonGroup.*
widgetProperty.iconButton.*
widgetProperty.menuButton.*
```

`en-US.ts` 与 `zh-CN.ts` 键结构完全一致。每个 Widget 的静态属性面板入口在请求时调用零参数工厂，通过 i18n 单例取得当前语言；工厂仅替换展示字段。MenuButton 的内容、样式和私有嵌套菜单配置一起通过该工厂生成。ButtonGroup 的嵌套按钮与菜单编辑面板也由该 Widget 的工厂生成。

## 配置约束

- DatePicker 保持日期格式、星期索引、时间精度、快捷选项、校验和事件值不变。
- FilePicker 保持 MIME 类型、`FileDataTypes`、CSV 数据逻辑、上传限制、文件解析与事件标识不变。
- ButtonGroup 保持 groupButtons 和 menuItems 的用户数据、按钮类型、动作标识、颜色、图标、`updateHook` 和 `panelConfig` 行为不变。
- IconButton 与 MenuButton 保持 ButtonVariant、placement、图标枚举、菜单数据、回调、验证和动态菜单数据绑定不变。

## 测试与验收

每个 Widget 新增或扩展语言切换测试：中文下断言代表性分组、标签、帮助、占位文本或展示选项为中文；同时断言技术字段、事件标签或持久化 option value 保持原值；最后恢复英文。资源完整性测试确认五组资源的 en-US/zh-CN 键结构相同并验证代表性中文值。

集中运行资源测试、五个语言切换测试以及各 Widget 既有聚焦测试；运行 Prettier、`git diff --check` 和提交钩子。仅在测试证明共享属性面板缓存导致语言固定时，增加最小 locale 缓存修复。
