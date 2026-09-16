# Widget Property Pane Chinese Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Localize Widget-owned property-pane copy for Table, Select, MultiSelect, Input, and Button using existing English and Chinese i18n resources, without changing technical identifiers or shared editor UI.

**Architecture:** Add widgetProperty resource namespaces in both locale files. Widget configuration methods resolve display-only values through i18n.t(...) when requested. Convert Table's module-level configuration into a factory so a language switch cannot retain English resolved during module load; persisted fields, event IDs, option values, expressions, and user data remain unchanged.

**Tech Stack:** TypeScript, React, i18next, Jest, Yarn workspaces.

## Global Constraints

- Add every new Widget display string to both app/client/src/i18n/resources/en-US.ts and app/client/src/i18n/resources/zh-CN.ts. Do not add direct Chinese literals to Widget code.
- Translate only Widget-owned sectionName, nontechnical label, helpText, input hint text, search hint text, and display-only dropdown labels.
- Never translate propertyName, DSL fields, Widget/query IDs, JS expressions, persisted option values, or event identifiers: onSort, onRowSelected, onClick, onTextChanged, onOptionChange, onFilterUpdate, and onSubmit.
- Do not modify shared Action selector, Callbacks, Query, Action, Datasource, theme, or generic property-pane UI.
- Preserve default values, Widget runtime validation, query binding, and execution behavior.
- Do not stage unrelated untracked .superpowers/ or ref/ paths.

---

## File Structure

- app/client/src/i18n/resources/en-US.ts and zh-CN.ts: matching widgetProperty.table, select, multiSelect, input, and button trees.
- app/client/src/i18n/resources/resourceParity.test.ts: resource parity and representative Chinese translation assertions.
- app/client/src/widgets/TableWidget/widget/propertyConfig.ts: getTablePropertyPaneConfig() factory with localized Table copy.
- app/client/src/widgets/TableWidget/widget/index.tsx: request Table configuration from that factory.
- app/client/src/widgets/TableWidget/widget/propertyConfig.test.ts: Table locale and unchanged-event regression.
- app/client/src/widgets/SelectWidget/widget/index.tsx and app/client/src/widgets/MultiSelectWidget/widget/index.tsx: localized configuration display copy.
- app/client/src/widgets/SelectWidget/widget/propertyPaneI18n.test.ts and app/client/src/widgets/MultiSelectWidget/widget/propertyPaneI18n.test.ts: Select family locale regressions.
- app/client/src/widgets/InputWidget/widget/index.tsx and index.test.tsx: localized property configuration and regression.
- app/client/src/widgets/ButtonWidget/widget/index.tsx and nativePath.test.ts: localized property configuration and action-wiring regression.

### Task 1: Add I18n Resources and Resource Parity Tests

**Files:**
- Modify: app/client/src/i18n/resources/en-US.ts
- Modify: app/client/src/i18n/resources/zh-CN.ts
- Modify: app/client/src/i18n/resources/resourceParity.test.ts

**Interfaces:**
- Produces matching widgetProperty.table.*, widgetProperty.select.*, widgetProperty.multiSelect.*, widgetProperty.input.*, and widgetProperty.button.* keys.
- Consumed by Tasks 2-5 through i18n.t("widgetProperty.<widget>.<key>").

- [ ] **Step 1: Write the failing resource test**

~~~ts
it("keeps widget property resources in parity and translates Chinese copy", () => {
  expect(flattenKeys(enUS.widgetProperty).sort()).toEqual(
    flattenKeys(zhCN.widgetProperty).sort(),
  );
  expect(i18n.t("widgetProperty.table.tableData", { lng: "zh-CN" })).toBe(
    "表格数据",
  );
  expect(i18n.t("widgetProperty.select.options", { lng: "zh-CN" })).toBe(
    "选项",
  );
  expect(i18n.t("widgetProperty.input.dataType", { lng: "zh-CN" })).toBe(
    "数据类型",
  );
  expect(i18n.t("widgetProperty.button.label", { lng: "zh-CN" })).toBe(
    "按钮文本",
  );
});
~~~

- [ ] **Step 2: Run the test and verify failure**

Run: yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts

Expected: FAIL because widgetProperty is absent.

- [ ] **Step 3: Add complete, matching resources**

Add a widgetProperty object to both locale files, containing every in-scope display string currently declared in the five configuration sources. Use clear camel-case keys based on the configured property. Required representative values are:

~~~ts
widgetProperty: {
  table: { general: "General", tableData: "Table data", columns: "Columns" },
  select: { data: "Data", options: "Options", optionData: "Option data" },
  multiSelect: { general: "General", options: "Options" },
  input: { general: "General", dataType: "Data type", text: "Text" },
  button: { basic: "Basic", label: "Label" },
}
~~~

The Chinese resource uses 常规, 表格数据, 列, 数据, 选项, 选项数据, 数据类型, 文本, 基础, and 按钮文本 for those matching leaves. Do not add event names to the resource tree.

- [ ] **Step 4: Run the test and verify success**

Run: yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts

Expected: PASS, including the existing full-resource leaf parity assertion.

- [ ] **Step 5: Commit**

~~~bash
git add app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts app/client/src/i18n/resources/resourceParity.test.ts
git commit -m "feat(i18n): add widget property pane resources"
~~~

### Task 2: Localize Table Configuration at Request Time

**Files:**
- Modify: app/client/src/widgets/TableWidget/widget/propertyConfig.ts
- Modify: app/client/src/widgets/TableWidget/widget/index.tsx:57,383-385
- Modify: app/client/src/widgets/TableWidget/widget/propertyConfig.test.ts

**Interfaces:**
- Consumes widgetProperty.table.* and the i18n singleton.
- Produces getTablePropertyPaneConfig(): PropertyPaneConfig[].
- Consumed by TableWidget.getPropertyPaneConfig().

- [ ] **Step 1: Write the failing test**

~~~ts
import i18n from "i18n";

afterEach(async () => {
  await i18n.changeLanguage("en-US");
});

it("localizes table display fields but preserves technical event labels", async () => {
  await i18n.changeLanguage("zh-CN");
  const config = TableWidget.getPropertyPaneConfig();
  const general = config.find((section) => section.sectionName === "常规");
  const events = config.find((section) => section.sectionName === "事件");

  expect(general?.children.find((child) => child.propertyName === "tableData")?.label)
    .toBe("表格数据");
  expect(events?.children.find((child) => child.propertyName === "onSort")?.label)
    .toBe("onSort");
});
~~~

- [ ] **Step 2: Run the test and verify failure**

Run: yarn --cwd app/client g:jest src/widgets/TableWidget/widget/propertyConfig.test.ts

Expected: FAIL because the Table configuration is a module-level English array.

- [ ] **Step 3: Implement the factory**

Import i18n in propertyConfig.ts; replace its default array export with:

~~~ts
export function getTablePropertyPaneConfig(): PropertyPaneConfig[] {
  return [
    // existing configuration, with only display fields changed to i18n.t(...)
  ];
}
~~~

Resolve every Table-owned in-scope display field with i18n.t("widgetProperty.table.<key>"), including nested column panel labels and display-only option labels. Retain every propertyName, value, JSON/example input, template string, dynamic binding, and on... label unchanged. In index.tsx, import getTablePropertyPaneConfig and return getTablePropertyPaneConfig().

- [ ] **Step 4: Run Table regressions**

Run: yarn --cwd app/client g:jest src/widgets/TableWidget/widget/propertyConfig.test.ts src/widgets/TableWidget/widget/nativeQueryMode.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add app/client/src/widgets/TableWidget/widget/propertyConfig.ts app/client/src/widgets/TableWidget/widget/index.tsx app/client/src/widgets/TableWidget/widget/propertyConfig.test.ts
git commit -m "feat(i18n): localize table property pane"
~~~

### Task 3: Localize Select and MultiSelect Configuration

**Files:**
- Modify: app/client/src/widgets/SelectWidget/widget/index.tsx:253-640
- Create: app/client/src/widgets/SelectWidget/widget/propertyPaneI18n.test.ts
- Modify: app/client/src/widgets/MultiSelectWidget/widget/index.tsx:145-500
- Create: app/client/src/widgets/MultiSelectWidget/widget/propertyPaneI18n.test.ts

**Interfaces:**
- Consumes widgetProperty.select.* and widgetProperty.multiSelect.*.
- Produces locale-aware SelectWidget.getPropertyPaneContentConfig() and MultiSelectWidget.getPropertyPaneConfig().
- Preserves option values/data, query generator aliases, onOptionChange, onFilterUpdate, and deprecation behavior.

- [ ] **Step 1: Write failing locale tests**

Each file changes the locale to Chinese, reads its configuration, asserts one section and ordinary label are Chinese, asserts onOptionChange is unchanged, and restores English:

~~~ts
await i18n.changeLanguage("zh-CN");
const config = SelectWidget.getPropertyPaneContentConfig();
const data = config.find((section) => section.sectionName === "数据");

expect(data?.children.find((child) => child.propertyName === "sourceData")?.label)
  .toBe("选项数据");
expect(config.flatMap((section) => section.children)
  .find((child) => child.propertyName === "onOptionChange")?.label)
  .toBe("onOptionChange");
~~~

The MultiSelect equivalent asserts 常规, 选项, and unchanged onOptionChange.

- [ ] **Step 2: Run tests and verify failure**

Run: yarn --cwd app/client g:jest src/widgets/SelectWidget/widget/propertyPaneI18n.test.ts src/widgets/MultiSelectWidget/widget/propertyPaneI18n.test.ts

Expected: FAIL because display copy is hardcoded English.

- [ ] **Step 3: Implement i18n lookup**

Import i18n in both Widget files. In their existing property-pane methods, replace each in-scope display field using the matching namespace keys. Do not translate default option data (Blue, GREEN), label/value query aliases, option values, expressions, or event IDs.

- [ ] **Step 4: Run Select family regressions**

Run: yarn --cwd app/client g:jest src/widgets/SelectWidget/widget/propertyPaneI18n.test.ts src/widgets/SelectWidget/widget/nativePath.test.ts src/widgets/MultiSelectWidget/widget/propertyPaneI18n.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add app/client/src/widgets/SelectWidget/widget/index.tsx app/client/src/widgets/SelectWidget/widget/propertyPaneI18n.test.ts app/client/src/widgets/MultiSelectWidget/widget/index.tsx app/client/src/widgets/MultiSelectWidget/widget/propertyPaneI18n.test.ts
git commit -m "feat(i18n): localize select widget property panes"
~~~

### Task 4: Localize Input Configuration

**Files:**
- Modify: app/client/src/widgets/InputWidget/widget/index.tsx:301-817
- Modify: app/client/src/widgets/InputWidget/widget/index.test.tsx

**Interfaces:**
- Consumes widgetProperty.input.*.
- Produces locale-aware Input configuration.
- Preserves input type values, regex/examples, validation functions/messages, and onTextChanged/onSubmit.

- [ ] **Step 1: Write the failing test**

Change locale to Chinese, assert the inputType label is 数据类型, its TEXT option label is 文本, and onTextChanged still displays onTextChanged; restore English afterward.

- [ ] **Step 2: Run the test and verify failure**

Run: yarn --cwd app/client g:jest src/widgets/InputWidget/widget/index.test.tsx

Expected: FAIL because Input display copy is hardcoded English.

- [ ] **Step 3: Implement i18n lookup**

Import i18n; in getPropertyPaneConfig(), replace only the in-scope display fields with i18n.t("widgetProperty.input.<key>"). Do not modify FIELD_REQUIRED_ERROR, INPUT_DEFAULT_TEXT_MAX_CHAR_ERROR, validation functions, examples/regexes, enum values, LabelPosition values, or event labels.

- [ ] **Step 4: Run Input regressions**

Run: yarn --cwd app/client g:jest src/widgets/InputWidget/widget/index.test.tsx src/widgets/InputWidget/component/utilities.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add app/client/src/widgets/InputWidget/widget/index.tsx app/client/src/widgets/InputWidget/widget/index.test.tsx
git commit -m "feat(i18n): localize input property pane"
~~~

### Task 5: Localize Button Configuration

**Files:**
- Modify: app/client/src/widgets/ButtonWidget/widget/index.tsx:153-568
- Modify: app/client/src/widgets/ButtonWidget/widget/nativePath.test.ts

**Interfaces:**
- Consumes widgetProperty.button.*.
- Produces locale-aware Button configuration.
- Preserves onClick, recaptcha values, Button enum values, icon identifiers, defaults, and sniping-mode action wiring.

- [ ] **Step 1: Write the failing test**

Change locale to Chinese and assert Button's Basic section is 基础, its text label is 按钮文本, and onClick still displays onClick; restore English afterward.

- [ ] **Step 2: Run the test and verify failure**

Run: yarn --cwd app/client g:jest src/widgets/ButtonWidget/widget/nativePath.test.ts

Expected: FAIL because Button display copy is hardcoded English.

- [ ] **Step 3: Implement i18n lookup**

Import i18n; replace each in-scope Button display field in getPropertyPaneContentConfig() with i18n.t("widgetProperty.button.<key>"). Preserve onClick, option values, icon names, default button text, and Action selector configuration.

- [ ] **Step 4: Run Button regressions**

Run: yarn --cwd app/client g:jest src/widgets/ButtonWidget/widget/nativePath.test.ts src/widgets/ButtonWidget/component/index.test.tsx

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add app/client/src/widgets/ButtonWidget/widget/index.tsx app/client/src/widgets/ButtonWidget/widget/nativePath.test.ts
git commit -m "feat(i18n): localize button property pane"
~~~

### Task 6: Verify the First-Phase Boundary

**Files:**
- Modify: none unless verification identifies an implementation defect.

**Interfaces:**
- Consumes Tasks 1-5.
- Produces evidence of locale parity, current-locale Widget configuration, and unchanged technical/shared boundaries.

- [ ] **Step 1: Run the consolidated regression suite**

~~~bash
yarn --cwd app/client g:jest \
  src/i18n/resources/resourceParity.test.ts \
  src/widgets/TableWidget/widget/propertyConfig.test.ts \
  src/widgets/TableWidget/widget/nativeQueryMode.test.ts \
  src/widgets/SelectWidget/widget/propertyPaneI18n.test.ts \
  src/widgets/SelectWidget/widget/nativePath.test.ts \
  src/widgets/MultiSelectWidget/widget/propertyPaneI18n.test.ts \
  src/widgets/InputWidget/widget/index.test.tsx \
  src/widgets/InputWidget/component/utilities.test.ts \
  src/widgets/ButtonWidget/widget/nativePath.test.ts \
  src/widgets/ButtonWidget/component/index.test.tsx
~~~

Expected: PASS.

- [ ] **Step 2: Check scope and retained event identifiers**

~~~bash
git diff --check HEAD~5..HEAD
rg -n 'label: "on(Sort|RowSelected|Click|TextChanged|OptionChange|FilterUpdate|Submit)"' \
  app/client/src/widgets/TableWidget/widget/propertyConfig.ts \
  app/client/src/widgets/SelectWidget/widget/index.tsx \
  app/client/src/widgets/MultiSelectWidget/widget/index.tsx \
  app/client/src/widgets/InputWidget/widget/index.tsx \
  app/client/src/widgets/ButtonWidget/widget/index.tsx
~~~

Expected: no whitespace error; matching technical labels remain present.

- [ ] **Step 3: Manually smoke test both languages**

Switch application language to Chinese and inspect each of the five Widget property panes: section names, ordinary controls, descriptions, and dropdown display labels are Chinese. Open an event property: its technical ID is unchanged and Action selector/Callbacks UI is unchanged. Switch to English and confirm the same panes retain their original English text.
