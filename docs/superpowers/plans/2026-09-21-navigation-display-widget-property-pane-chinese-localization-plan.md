# 导航与展示控件设置页中文化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为传统 CheckboxGroup、Tabs 和 Divider Widget 的私有属性面板提供中英文可切换文案。

**Architecture:** 每个 Widget 采用独立的 owner-scoped i18n 命名空间，内容和样式数组由零参数工厂在请求时解析当前语言。工厂只替换展示文案，保留配置结构、事件、持久化值、验证和运行时逻辑。

**Tech Stack:** TypeScript、React、i18next、Jest、Yarn workspaces。

## Global Constraints

- 仅处理 `CHECKBOX_GROUP_WIDGET`、`TABS_WIDGET` 和 `DIVIDER_WIDGET` 的私有属性面板。
- 仅国际化 `sectionName`、非技术 `label`、`helpText`、`placeholderText` 与展示型选项标签。
- 不翻译 `onSelectionChange`、`onTabSelected`、`propertyName`、DSL、表达式、用户选项/Tab 名称、默认数据、验证错误文本、图标、颜色/尺寸值、hooks、条件和依赖。
- 不处理 ProgressBar、WDS、Anvil、Action selector、Callbacks、Query、Action、Datasource、主题、全局编辑器、Chart、Form、DatePicker、JSON Form 或 ECharts。
- 新增资源必须在 `en-US.ts` 与 `zh-CN.ts` 中具有相同键结构；不得在模块级静态对象保存语言相关的属性面板配置。
- 不修改无关的 `.superpowers/`、`ref/` 与已有工作区变更。

---

### Task 1: 本地化 CheckboxGroup 私有属性面板

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Modify: `app/client/src/widgets/CheckboxGroupWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/CheckboxGroupWidget/widget/index.test.tsx`

**Interfaces:**
- Produces: `getCheckboxGroupPropertyPaneContentConfig()` 和 `getCheckboxGroupPropertyPaneStyleConfig()`，由 CheckboxGroup 的静态属性面板方法返回。

- [ ] **Step 1: 写出失败的语言切换测试**

在既有测试中导入 `i18n` 与 `CheckboxGroupWidget`，增加测试并以 `try/finally` 恢复语言。中文下断言首区为 `数据`、`options` 为 `选项`、`defaultSelectedValues` 为 `默认选中值`、`optionAlignment` 的 `NONE` 展示为 `无`、样式区为 `标签样式`。断言 `options`、`onSelectionChange`、选项值 `CheckboxGroupAlignmentTypes.NONE` 和用户选项验证函数保持原样；恢复英文后首区为 `Data`。

- [ ] **Step 2: 验证测试为红**

Run: `yarn --cwd app/client g:jest src/widgets/CheckboxGroupWidget/widget/index.test.tsx`

Expected: FAIL，中文语言下现有配置仍返回 `Data`。

- [ ] **Step 3: 添加资源并工厂化配置**

添加 `widgetProperty.checkboxGroup.content`、`style`、`help`、`placeholder`、`option` 成对资源，覆盖私有内容/样式配置显示字段。使用 `checkboxGroupText(path)` 调用 `i18n.t("widgetProperty.checkboxGroup.${path}")`，把内容和样式数组移入零参数工厂。保留默认 `Blue/Green/Red` 用户选项数据、`defaultSelectedValuesValidation`、事件 ID、对齐枚举值、字体尺寸、验证、hidden/dependencies 与 hooks 原值。

- [ ] **Step 4: 资源配对与绿色验证**

扩展 `resourceParity.test.ts`，检查 CheckboxGroup 命名空间键配对，断言 `widgetProperty.checkboxGroup.content.defaultSelectedValues` 为 `默认选中值`、`widgetProperty.checkboxGroup.option.none` 为 `无`，并验证每个资源叶子路径在两种语言可解析。

Run: `yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts src/widgets/CheckboxGroupWidget/widget/index.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts app/client/src/i18n/resources/resourceParity.test.ts app/client/src/widgets/CheckboxGroupWidget/widget/index.tsx app/client/src/widgets/CheckboxGroupWidget/widget/index.test.tsx
git commit -m "feat(i18n): localize checkbox group property pane"
```

### Task 2: 本地化 Tabs 私有属性面板

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Modify: `app/client/src/widgets/TabsWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/TabsWidget/widget/index.test.tsx`

**Interfaces:**
- Produces: `getTabsPropertyPaneContentConfig()` 与 `getTabsPropertyPaneStyleConfig()`，由 Tabs 的静态方法返回；嵌套 `panelConfig` 由内容工厂生成。

- [ ] **Step 1: 写出失败的语言切换测试**

在 Tabs 测试导入 i18n 和 Widget 类，添加配置测试。中文下断言 `数据`、`tabsObj` 为 `标签页`、`defaultTab` 为 `默认标签页`、嵌套 `panelConfig` 首区为 `常规`、`shouldShowTabs` 为 `显示标签页`、样式区为 `颜色、边框和阴影`。断言 `propertyName: "tabsObj"`、`onTabSelected`、默认占位值 `Tab 1`、`updateHook` 与 `updateRelatedWidgetProperties` 仍存在；恢复英文后为 `Data`。

- [ ] **Step 2: 验证测试为红**

Run: `yarn --cwd app/client g:jest src/widgets/TabsWidget/widget/index.test.tsx`

Expected: FAIL，中文语言下配置仍返回 `Data`。

- [ ] **Step 3: 添加资源并工厂化配置**

新增 `widgetProperty.tabs.content`、`style`、`help`、`placeholder` 资源，覆盖 Tabs 固定属性面板和嵌套配置的展示文本。通过 `tabsText(path)` 在内容、样式零参数工厂请求时解析当前语言。保留 `tabsObj` 的用户 Tab 标签、`defaultTab`、校验示例、更新/布局回调、`onTabSelected` 与全部条件、依赖和样式值。

- [ ] **Step 4: 资源配对与绿色验证**

扩展资源测试，断言 Tabs 键配对，`widgetProperty.tabs.content.tabs` 为 `标签页`、`widgetProperty.tabs.content.showTabs` 为 `显示标签页`、`widgetProperty.tabs.style.colorsBordersAndShadows` 为 `颜色、边框和阴影`，并检查全部叶子资源可解析。

Run: `yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts src/widgets/TabsWidget/widget/index.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts app/client/src/i18n/resources/resourceParity.test.ts app/client/src/widgets/TabsWidget/widget/index.tsx app/client/src/widgets/TabsWidget/widget/index.test.tsx
git commit -m "feat(i18n): localize tabs property pane"
```

### Task 3: 本地化 Divider 私有属性面板

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Modify: `app/client/src/widgets/DividerWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/DividerWidget/widget/index.test.tsx`

**Interfaces:**
- Produces: `getDividerPropertyPaneContentConfig()` 与 `getDividerPropertyPaneStyleConfig()`，由 Divider 静态方法返回。

- [ ] **Step 1: 写出失败的语言切换测试**

在 Divider 测试中导入 i18n 和 `DividerWidget`，添加 `try/finally` 语言切换测试。中文下断言内容区 `常规`、`isVisible` 为 `可见`、样式区 `描边`、`orientation` 为 `方向`、`horizontal` 选项展示为 `水平`、`strokeStyle` 的 `solid` 展示为 `实线`。断言 `propertyName: "orientation"`、选项值 `horizontal`/`solid` 和原图标保持不变；恢复英文后首区为 `General`。

- [ ] **Step 2: 验证测试为红**

Run: `yarn --cwd app/client g:jest src/widgets/DividerWidget/widget/index.test.tsx`

Expected: FAIL，中文语言下仍返回 `General`。

- [ ] **Step 3: 添加资源并工厂化配置**

添加 `widgetProperty.divider.content`、`style`、`help`、`placeholder`、`option` 成对资源，覆盖 General、Stroke、Cap 及其显示字段与展示选项。使用 `dividerText(path)` 和两个零参数工厂解析显示文案。保留 `orientation`、`strokeStyle`、`capType`、`capSide` 的值与图标、颜色/厚度数值、验证和自动布局条件。

- [ ] **Step 4: 资源配对与绿色验证**

扩展资源测试，断言 Divider 资源键配对，`widgetProperty.divider.style.stroke` 为 `描边`、`widgetProperty.divider.option.horizontal` 为 `水平`、`widgetProperty.divider.option.solid` 为 `实线`，并检查全部资源叶子在两种语言可解析。

Run: `yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts src/widgets/DividerWidget/widget/index.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts app/client/src/i18n/resources/resourceParity.test.ts app/client/src/widgets/DividerWidget/widget/index.tsx app/client/src/widgets/DividerWidget/widget/index.test.tsx
git commit -m "feat(i18n): localize divider property pane"
```

### Task 4: 集中验证导航与展示控件本地化

**Files:**
- Modify only if a focused test proves a missing in-scope resource or locale-static property-pane cache.

- [ ] **Step 1: 运行集中测试**

```bash
yarn --cwd app/client g:jest \
  src/i18n/resources/resourceParity.test.ts \
  src/widgets/CheckboxGroupWidget/widget/index.test.tsx \
  src/widgets/TabsWidget/widget/index.test.tsx \
  src/widgets/DividerWidget/widget/index.test.tsx
```

Expected: PASS，语言切换测试会恢复英文。

- [ ] **Step 2: 检查格式和范围**

```bash
git diff --check
app/client/node_modules/.bin/prettier --check \
  app/client/src/i18n/resources/en-US.ts \
  app/client/src/i18n/resources/zh-CN.ts \
  app/client/src/i18n/resources/resourceParity.test.ts \
  app/client/src/widgets/CheckboxGroupWidget/widget/index.tsx \
  app/client/src/widgets/TabsWidget/widget/index.tsx \
  app/client/src/widgets/DividerWidget/widget/index.tsx
```

Expected: PASS；差异不包含 ProgressBar、WDS、Anvil、共享 Action selector、Callbacks 或 ECharts 文件。
