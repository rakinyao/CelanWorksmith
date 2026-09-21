# 选择控件设置页中文化实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为传统 Checkbox、Switch 和 RadioGroup Widget 的私有属性面板提供中英文可切换文案。

**Architecture:** 每个 Widget 使用自己的 `widgetProperty.checkbox.*`、`widgetProperty.switch.*` 或 `widgetProperty.radioGroup.*` 资源。属性面板通过零参数配置工厂在请求时调用现有 i18n 单例，保留全部技术字段、持久化值和运行时定义。

**Tech Stack:** TypeScript、React、i18next、Jest、Yarn workspaces。

## Global Constraints

- 仅处理 `CHECKBOX_WIDGET`、`SWITCH_WIDGET` 与 `RADIO_GROUP_WIDGET` 的私有属性面板。
- 仅国际化 `sectionName`、非技术 `label`、`helpText`、`placeholderText` 与展示型选项标签。
- 不翻译 `onCheckChange`、`onChange`、`onSelectionChange`、`propertyName`、DSL、表达式、默认数据、用户选项数据、验证返回文本、图标、颜色/尺寸值、hooks、条件和依赖。
- 不修改 WDS、Anvil、Action selector、Callbacks、Query、Action、Datasource、主题、全局编辑器、Chart、Form、DatePicker、JSON Form 或 ECharts。
- 三个命名空间在 `en-US.ts` 与 `zh-CN.ts` 中必须具有相同键结构；不得在模块级静态对象保存语言相关配置。
- 不修改无关的 `.superpowers/`、`ref/` 与已有工作区变更。

---

### Task 1: 本地化 Checkbox 私有属性面板

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Modify: `app/client/src/widgets/CheckboxWidget/widget/index.tsx`
- Create: `app/client/src/widgets/CheckboxWidget/widget/propertyPaneConfig.test.ts`

**Interfaces:**
- Produces: `getCheckboxPropertyPaneContentConfig()`、`getCheckboxPropertyPaneStyleConfig()`，由 Checkbox 静态属性面板方法返回。

- [ ] **Step 1: 写出失败的语言切换测试**

创建 `propertyPaneConfig.test.ts`，使用 `try/finally` 在中文下断言内容区 `标签`、`label` 为 `文本`、`labelPosition` 为 `位置`、选项 `Left` 显示为 `左侧`；样式区 `标签样式` 和 `accentColor` 为 `强调色`。同时断言 `propertyName: "labelPosition"`、选项值 `LabelPosition.Left` 与事件 `onCheckChange` 不变；恢复英文后断言首区为 `Label`。

- [ ] **Step 2: 验证测试为红**

Run: `yarn --cwd app/client g:jest src/widgets/CheckboxWidget/widget/propertyPaneConfig.test.ts`

Expected: FAIL，现有配置固定返回英文。

- [ ] **Step 3: 添加资源并工厂化配置**

新增成对 Checkbox 资源，覆盖 Label、Validations、General、Events、Label styles、Color、Border and shadow 的展示文案，及 Left/Right 展示选项。使用 `checkboxText(path)` 调用 `i18n.t("widgetProperty.checkbox.${path}")`，将两个静态数组移入零参数工厂。`onCheckChange` 的 label 保持原字符串；字体尺寸 `S` 至 `3XL`、`LabelPosition` 值、验证和样式逻辑保持原值。

- [ ] **Step 4: 资源配对与绿色验证**

在 `resourceParity.test.ts` 检查 Checkbox 命名空间键配对，断言 `widgetProperty.checkbox.content.label` 为 `标签`、`widgetProperty.checkbox.style.accentColor` 为 `强调色`，并确认所有叶子资源在两种语言均可解析。

Run: `yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts src/widgets/CheckboxWidget/widget/propertyPaneConfig.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts app/client/src/i18n/resources/resourceParity.test.ts app/client/src/widgets/CheckboxWidget/widget/index.tsx app/client/src/widgets/CheckboxWidget/widget/propertyPaneConfig.test.ts
git commit -m "feat(i18n): localize checkbox property pane"
```

### Task 2: 本地化 Switch 私有属性面板

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Modify: `app/client/src/widgets/SwitchWidget/widget/index.tsx`
- Create: `app/client/src/widgets/SwitchWidget/widget/propertyPaneConfig.test.ts`

**Interfaces:**
- Produces: `getSwitchPropertyPaneContentConfig()`、`getSwitchPropertyPaneStyleConfig()`，由 Switch 静态属性面板方法返回。

- [ ] **Step 1: 写出失败的语言切换测试**

创建配置测试，中文下断言 `标签`、`默认状态`、`动画加载`、`标签样式` 和 `强调色`；断言 `onChange` 标签、`propertyName: "defaultSwitchState"` 与尺寸值 `0.875rem` 不变。`finally` 恢复英文并断言 `Label`。

- [ ] **Step 2: 验证测试为红**

Run: `yarn --cwd app/client g:jest src/widgets/SwitchWidget/widget/propertyPaneConfig.test.ts`

Expected: FAIL，现有配置固定返回英文。

- [ ] **Step 3: 添加资源并工厂化配置**

添加成对 Switch 资源，覆盖内容区、样式区与 Left/Right 展示选项。使用 `switchText(path)` 在零参数内容/样式工厂中解析显示文案。保留 `onChange`、`defaultSwitchState`、`LabelPosition`、颜色值、尺寸值、验证与触发定义。

- [ ] **Step 4: 资源配对与绿色验证**

扩展资源测试，断言 Switch 命名空间配对，`widgetProperty.switch.content.defaultState` 为 `默认状态`，`widgetProperty.switch.style.accentColor` 为 `强调色`，所有叶子资源两种语言都可解析。

Run: `yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts src/widgets/SwitchWidget/widget/propertyPaneConfig.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts app/client/src/i18n/resources/resourceParity.test.ts app/client/src/widgets/SwitchWidget/widget/index.tsx app/client/src/widgets/SwitchWidget/widget/propertyPaneConfig.test.ts
git commit -m "feat(i18n): localize switch property pane"
```

### Task 3: 本地化 RadioGroup 私有属性面板

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Modify: `app/client/src/widgets/RadioGroupWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/RadioGroupWidget/widget/propertyPaneConfig.test.ts`

**Interfaces:**
- Produces: `getRadioGroupPropertyPaneContentConfig()`、`getRadioGroupPropertyPaneStyleConfig()`，由 RadioGroup 静态属性面板方法返回。

- [ ] **Step 1: 写出失败的语言切换测试**

在既有测试新增中文断言：首区 `数据`、`options` 标签 `选项`、`defaultOptionValue` 标签 `默认选中值`、位置选项 `Auto` 显示 `自动`，样式区 `标签样式`。断言 `propertyName: "options"`、`LabelPosition.Auto`、默认值 `Y` 与 `onSelectionChange` 保持原值；`finally` 恢复英文。

- [ ] **Step 2: 验证测试为红**

Run: `yarn --cwd app/client g:jest src/widgets/RadioGroupWidget/widget/propertyPaneConfig.test.ts`

Expected: FAIL，当前配置返回英文。

- [ ] **Step 3: 添加资源并工厂化配置**

添加成对 RadioGroup 资源，覆盖 Data、Label、Validations、General、Events、Label styles、Color 的展示文案，和 Auto/Left/Top 选项标签。使用 `radioGroupText(path)` 及内容/样式零参数工厂。不得迁移 `optionsCustomValidation`、`defaultOptionValidation` 或用户选项默认数据中的文本。

- [ ] **Step 4: 资源配对与绿色验证**

扩展资源测试，断言 RadioGroup 资源键配对、`widgetProperty.radioGroup.content.data` 为 `数据`、`widgetProperty.radioGroup.option.auto` 为 `自动`，且两种语言可解析全部叶子资源。

Run: `yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts src/widgets/RadioGroupWidget/widget/propertyPaneConfig.test.ts`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts app/client/src/i18n/resources/resourceParity.test.ts app/client/src/widgets/RadioGroupWidget/widget/index.tsx app/client/src/widgets/RadioGroupWidget/widget/propertyPaneConfig.test.ts
git commit -m "feat(i18n): localize radio group property pane"
```

### Task 4: 集中验证选择控件本地化

**Files:**
- Modify only if a focused test proves a missing in-scope resource or locale-static property-pane cache.

- [ ] **Step 1: 运行集中测试**

```bash
yarn --cwd app/client g:jest \
  src/i18n/resources/resourceParity.test.ts \
  src/widgets/CheckboxWidget/widget/propertyPaneConfig.test.ts \
  src/widgets/SwitchWidget/widget/propertyPaneConfig.test.ts \
  src/widgets/RadioGroupWidget/widget/propertyPaneConfig.test.ts
```

Expected: PASS；所有测试均在 `finally` 中恢复英文。

- [ ] **Step 2: 检查格式与范围**

```bash
git diff --check
app/client/node_modules/.bin/prettier --check \
  app/client/src/i18n/resources/en-US.ts \
  app/client/src/i18n/resources/zh-CN.ts \
  app/client/src/i18n/resources/resourceParity.test.ts \
  app/client/src/widgets/CheckboxWidget/widget/index.tsx \
  app/client/src/widgets/SwitchWidget/widget/index.tsx \
  app/client/src/widgets/RadioGroupWidget/widget/index.tsx
```

Expected: PASS；差异不含 WDS、Anvil、共享 Action selector、Callbacks 或 ECharts 文件。
