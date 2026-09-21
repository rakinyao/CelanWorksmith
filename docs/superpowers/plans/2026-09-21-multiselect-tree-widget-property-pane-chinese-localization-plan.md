# MultiSelect And TreeSelect Property Pane Chinese Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the user-visible property panes of MultiSelect V2, Single TreeSelect, and Multi TreeSelect between English and Chinese without changing their widget behavior or persisted configuration.

**Architecture:** Add one owner-scoped catalog for each widget under `widgetProperty`. Each widget resolves labels, help text, placeholders, helper text, and display-only option labels through the existing i18n singleton when its property-pane factory is called. The existing static methods remain the public entry points but return a newly built current-locale configuration on every call.

**Tech Stack:** TypeScript, React, i18next, Jest, Yarn workspaces.

## Global Constraints

- Scope is limited to `MULTI_SELECT_WIDGET_V2`, `SINGLE_SELECT_TREE_WIDGET`, and `MULTI_SELECT_TREE_WIDGET` private property panes.
- Add matching `widgetProperty.multiSelectV2`, `widgetProperty.singleSelectTree`, and `widgetProperty.multiSelectTree` leaves to `en-US.ts` and `zh-CN.ts`.
- Translate only `sectionName`, nontechnical labels, `helpText`, `placeholderText`, fixed `helperText`, and display-only option labels.
- Keep `propertyName`, event labels and IDs, DSL, expressions, default option data, validation functions and their error text, control values, hooks, dependencies, conditions, icons, and visual values unchanged.
- Keep user-supplied tree-node `label` and `value` data unchanged.
- Do not modify legacy `MULTI_SELECT_WIDGET`, WDS/Anvil widgets, JSON Form embedded controls, callbacks, action selectors, queries, datasources, or shared editor components.
- Do not stage unrelated `.superpowers/`, `ref/`, or existing worktree changes.

---

## File Structure

- `app/client/src/i18n/resources/en-US.ts`: English owner-scoped display catalogs.
- `app/client/src/i18n/resources/zh-CN.ts`: paired Chinese catalogs.
- `app/client/src/i18n/resources/resourceParity.test.ts`: parity and representative translated-resource assertions.
- `app/client/src/widgets/MultiSelectWidgetV2/widget/index.tsx`: runtime factory and translated MultiSelect V2 pane copy.
- `app/client/src/widgets/SingleSelectTreeWidget/widget/index.tsx`: runtime factory and translated single-tree pane copy.
- `app/client/src/widgets/MultiSelectTreeWidget/widget/index.tsx`: runtime factory and translated multi-tree pane copy.
- `app/client/src/widgets/MultiSelectWidgetV2/widget/propertyPaneConfig.test.ts`: language-switch behavior test.
- `app/client/src/widgets/SingleSelectTreeWidget/widget/propertyPaneConfig.test.ts`: language-switch behavior test.
- `app/client/src/widgets/MultiSelectTreeWidget/widget/propertyPaneConfig.test.ts`: language-switch behavior test.

### Task 1: Add Paired Widget Resource Catalogs

**Files:**

- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`

**Interfaces:**

- Produces `widgetProperty.multiSelectV2.*`, `widgetProperty.singleSelectTree.*`, and `widgetProperty.multiSelectTree.*` display resources.
- Consumers call `i18n.t("widgetProperty.<owner>.<path>")` at property-pane configuration request time.

- [ ] **Step 1: Write the failing resource assertions**

```ts
expect(flattenKeys(enUS.widgetProperty.multiSelectV2).sort()).toEqual(
  flattenKeys(zhCN.widgetProperty.multiSelectV2).sort(),
);
expect(
  i18n.t("widgetProperty.singleSelectTree.content.options", { lng: "zh-CN" }),
).toBe("选项");
expect(
  i18n.t("widgetProperty.multiSelectTree.option.showAll", { lng: "zh-CN" }),
).toBe("显示所有项目");
```

- [ ] **Step 2: Verify red**

Run: `yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts`

Expected: FAIL because the three owner-scoped catalogs do not exist.

- [ ] **Step 3: Add complete paired catalogs**

Add every in-scope display string used by each widget under `content`, `style`, `help`, `placeholder`, and `option` groupings. Keep event label resources out of the catalog; only localize their help text. Include the fixed MultiSelect V2 default-value helper text as a resource.

- [ ] **Step 4: Verify green**

Run: `yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts`

Expected: PASS.

### Task 2: Localize MultiSelect V2

**Files:**

- Modify: `app/client/src/widgets/MultiSelectWidgetV2/widget/index.tsx`
- Create: `app/client/src/widgets/MultiSelectWidgetV2/widget/propertyPaneConfig.test.ts`

**Interfaces:**

- Produces `MultiSelectWidget.getPropertyPaneContentConfig()` and `getPropertyPaneStyleConfig()` configurations for the current i18n language.
- Preserves all current property names, validation, expression wrapper code, control configuration, callback identifiers, conditions, and option values.

- [ ] **Step 1: Write the failing language-switch test**

```ts
await i18n.changeLanguage("zh-CN");
const content = MultiSelectWidget.getPropertyPaneContentConfig();
expect(content[0].sectionName).toBe("数据");
expect(findProperty(content, "sourceData")?.label).toBe("源数据");
expect(findProperty(content, "onOptionChange")?.label).toBe("onOptionChange");
expect(findProperty(content, "defaultOptionValue")?.helperText).toEqual(
  expect.anything(),
);
```

- [ ] **Step 2: Verify red**

Run: `yarn --cwd app/client g:jest src/widgets/MultiSelectWidgetV2/widget/propertyPaneConfig.test.ts`

Expected: FAIL because the static configuration is English.

- [ ] **Step 3: Implement the current-locale factory**

Import i18n and add a local `multiSelectV2Text(path)` helper. In each static pane method, resolve translations during the method call. Replace only display fields and rebuild the fixed helper JSX using its localized text. Keep default option validation and wrapper expressions identical.

- [ ] **Step 4: Verify green**

Run: `yarn --cwd app/client g:jest src/widgets/MultiSelectWidgetV2/widget/propertyPaneConfig.test.ts src/widgets/MultiSelectWidgetV2/widget/propertyUtils.test.ts`

Expected: PASS.

### Task 3: Localize Single TreeSelect

**Files:**

- Modify: `app/client/src/widgets/SingleSelectTreeWidget/widget/index.tsx`
- Create: `app/client/src/widgets/SingleSelectTreeWidget/widget/propertyPaneConfig.test.ts`

**Interfaces:**

- Produces `SingleSelectTreeWidget.getPropertyPaneContentConfig()` and `getPropertyPaneStyleConfig()` configurations for the current i18n language.
- Keeps nested tree validation, tree data, `allowClear`, `expandAll`, and technical events unchanged.

- [ ] **Step 1: Write the failing language-switch test**

```ts
await i18n.changeLanguage("zh-CN");
const content = SingleSelectTreeWidget.getPropertyPaneContentConfig();
expect(content[0].sectionName).toBe("数据");
expect(findProperty(content, "options")?.placeholderText).toBe("输入选项值");
expect(findProperty(content, "onDropdownOpen")?.label).toBe("onDropdownOpen");
```

- [ ] **Step 2: Verify red**

Run: `yarn --cwd app/client g:jest src/widgets/SingleSelectTreeWidget/widget/propertyPaneConfig.test.ts`

Expected: FAIL because the static configuration is English.

- [ ] **Step 3: Implement the current-locale factory**

Import i18n and resolve all in-scope content and style presentation fields through `widgetProperty.singleSelectTree`. Preserve `options` validation and the label/value fields within tree data verbatim.

- [ ] **Step 4: Verify green**

Run: `yarn --cwd app/client g:jest src/widgets/SingleSelectTreeWidget/widget/propertyPaneConfig.test.ts src/widgets/SingleSelectTreeWidget/widget/derived.test.ts`

Expected: PASS.

### Task 4: Localize Multi TreeSelect

**Files:**

- Modify: `app/client/src/widgets/MultiSelectTreeWidget/widget/index.tsx`
- Create: `app/client/src/widgets/MultiSelectTreeWidget/widget/propertyPaneConfig.test.ts`

**Interfaces:**

- Produces `MultiSelectTreeWidget.getPropertyPaneContentConfig()` and `getPropertyPaneStyleConfig()` configurations for the current i18n language.
- Preserves `SHOW_PARENT`, `SHOW_CHILD`, and `SHOW_ALL` option values plus default selection validation and technical event identifiers.

- [ ] **Step 1: Write the failing language-switch test**

```ts
await i18n.changeLanguage("zh-CN");
const content = MultiSelectTreeWidget.getPropertyPaneContentConfig();
const mode = findProperty(content, "mode");
expect(mode?.label).toBe("模式");
expect(mode?.options?.find((option) => option.value === "SHOW_ALL")).toEqual(
  expect.objectContaining({ label: "显示所有项目", value: "SHOW_ALL" }),
);
```

- [ ] **Step 2: Verify red**

Run: `yarn --cwd app/client g:jest src/widgets/MultiSelectTreeWidget/widget/propertyPaneConfig.test.ts`

Expected: FAIL because the static configuration is English.

- [ ] **Step 3: Implement the current-locale factory**

Import i18n and resolve all allowed display fields through `widgetProperty.multiSelectTree`. Do not alter `mode` values, default selected-value parsing, tree data validation, or callbacks.

- [ ] **Step 4: Verify green**

Run: `yarn --cwd app/client g:jest src/widgets/MultiSelectTreeWidget/widget/propertyPaneConfig.test.ts src/widgets/MultiSelectTreeWidget/widget/derived.test.ts`

Expected: PASS.

### Task 5: Run Batch Verification And Commit

**Files:**

- Verify only the files changed in Tasks 1-4.

- [ ] **Step 1: Run the focused localization suite**

Run:

```bash
yarn --cwd app/client g:jest \
  src/i18n/resources/resourceParity.test.ts \
  src/widgets/MultiSelectWidgetV2/widget/propertyPaneConfig.test.ts \
  src/widgets/MultiSelectWidgetV2/widget/propertyUtils.test.ts \
  src/widgets/SingleSelectTreeWidget/widget/propertyPaneConfig.test.ts \
  src/widgets/SingleSelectTreeWidget/widget/derived.test.ts \
  src/widgets/MultiSelectTreeWidget/widget/propertyPaneConfig.test.ts \
  src/widgets/MultiSelectTreeWidget/widget/derived.test.ts
```

Expected: PASS.

- [ ] **Step 2: Check formatting and diff integrity**

Run:

```bash
yarn --cwd app/client prettier --check \
  src/i18n/resources/en-US.ts \
  src/i18n/resources/zh-CN.ts \
  src/i18n/resources/resourceParity.test.ts \
  src/widgets/MultiSelectWidgetV2/widget/index.tsx \
  src/widgets/MultiSelectWidgetV2/widget/propertyPaneConfig.test.ts \
  src/widgets/SingleSelectTreeWidget/widget/index.tsx \
  src/widgets/SingleSelectTreeWidget/widget/propertyPaneConfig.test.ts \
  src/widgets/MultiSelectTreeWidget/widget/index.tsx \
  src/widgets/MultiSelectTreeWidget/widget/propertyPaneConfig.test.ts
git diff --check
```

Expected: both commands exit successfully.

- [ ] **Step 3: Commit the completed batch**

```bash
git add docs/superpowers/plans/2026-09-21-multiselect-tree-widget-property-pane-chinese-localization-plan.md \
  app/client/src/i18n/resources/en-US.ts \
  app/client/src/i18n/resources/zh-CN.ts \
  app/client/src/i18n/resources/resourceParity.test.ts \
  app/client/src/widgets/MultiSelectWidgetV2/widget/index.tsx \
  app/client/src/widgets/MultiSelectWidgetV2/widget/propertyPaneConfig.test.ts \
  app/client/src/widgets/SingleSelectTreeWidget/widget/index.tsx \
  app/client/src/widgets/SingleSelectTreeWidget/widget/propertyPaneConfig.test.ts \
  app/client/src/widgets/MultiSelectTreeWidget/widget/index.tsx \
  app/client/src/widgets/MultiSelectTreeWidget/widget/propertyPaneConfig.test.ts
git commit -m "feat(i18n): localize multiselect tree property panes"
```
