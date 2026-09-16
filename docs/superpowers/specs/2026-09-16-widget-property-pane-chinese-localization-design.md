# Widget 设置页中文化设计

## 目标

为高频 Widget 的设置页提供中英文可切换的显示文案，提升中文用户配置应用时的可理解性。本期仅迁移 Widget 自身定义的配置文本，不改变 Widget 数据结构、表达式、事件和公共编辑器能力。

## 首期范围

处理以下 Widget：

1. `TableWidget`
2. `SelectWidget`
3. `MultiSelectWidget`
4. `InputWidget`
5. `ButtonWidget`

每个 Widget 仅迁移其 `propertyConfig` 或本 Widget 私有视图中定义的以下用户可见文案：

- 配置分组名称（`sectionName`）。
- 属性显示标签（`label`）。
- 帮助说明（`helpText`）。
- 枚举和下拉选项的显示标签。
- Widget 私有的校验或空状态文案。

## 明确排除项

以下内容不属于单个 Widget 的私有文案，本期不修改：

- 事件标识，例如 `onSort`、`onRowSelected`、`onClick`、`onTextChanged`。
- DSL 字段、`propertyName`、组件 ID、查询名称、JS 表达式、绑定语法和用户输入的配置值。
- 事件动作选择器中的 `Action`、执行查询、执行 JS、导航、显示提示等动作菜单。
- 动作配置和 `Callbacks` 中的 `On success`、`On failure`、`No actions` 等公共回调编辑器文案。
- 公共属性面板、全局编辑器、Query、Action、数据源、主题或其他 Widget 共用组件的文案。

例如，Table 的 `onSort` 本身保持技术标识不变；Table 私有的“允许添加行”“分页大小”“表格数据”等配置标签可以国际化。`onSort` 打开后的动作选择窗口与 Callbacks 配置属于公共组件，后续统一处理。

## 实现方式

Widget 配置文件不得直接写中文。每个新增或迁移的显示字符串必须进入现有 `en-US.ts` 与 `zh-CN.ts` 资源，通过 `createMessage(...)` 或当前 Widget 配置层已经采用的等价 i18n 访问方式读取。

新增 key 按 Widget 命名空间组织，例如 `widgetProperty.table.*`、`widgetProperty.select.*`。英文资源保持现有界面语义；中文资源使用简洁、面向配置操作的术语。技术名、事件名和 DSL 字段不可被翻译或作为翻译 key 的显示替代。

同一 Widget 内部出现的重复配置术语允许复用该 Widget 命名空间下的 key；不得为了去重而新建跨 Widget 的全局词典。这样可以确保本期不会改变共享组件的文案所有权。

## 术语约定

首期采用以下常用译法：

| English | 中文显示 |
| --- | --- |
| General | 常规 |
| Basic | 基础 |
| Label | 标签 |
| Styles | 样式 |
| Events | 事件 |
| Visible | 可见 |
| Disabled | 禁用 |
| Required | 必填 |
| Tooltip | 提示文本 |
| Placeholder | 占位文本 |
| Options | 选项 |
| Default value | 默认值 |
| Server side filtering | 服务端筛选 |

术语表只约束本期迁移的 Widget 私有文案；公共动作和回调术语不因本表改变。

## 验证

1. 每个迁移 Widget 添加或扩展配置测试，断言其显示字段通过 i18n key 得到正确的英文和中文值。
2. 检查首期五个 Widget 配置文件中没有新增硬编码的用户可见英文；既有、明确排除的技术标识可保留。
3. 中文界面手工验证 Table、Select、MultiSelect、Input、Button 的属性面板：分组、标签、帮助文本和下拉选项显示中文；事件标识、DSL 字段、动作选择器与 Callbacks 保持原行为。
4. 英文界面回归验证同一配置显示原有英文，Widget 保存、表达式绑定和事件执行不变。
