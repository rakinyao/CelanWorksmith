# TableV2 Property Pane Chinese Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Localize the user-visible TABLE_WIDGET_V2 Table property pane in English and Chinese, including top-level and column-panel configuration, without changing technical identifiers or behavior.

**Architecture:** Add owner-scoped widgetProperty.tableV2 resources. Replace static TableV2 configuration objects with current-locale factory functions, composed from top-level and column-panel modules. Include locale in WidgetFactory's content/style fallback cache key so the actual editor refreshes after a language change.

**Tech Stack:** TypeScript, React, i18next, Jest, Yarn workspaces.

## Global Constraints

- The user-visible Table is TABLE_WIDGET_V2. Do not replace it with legacy TABLE_WIDGET.
- Add every TableV2-owned display string to matching en-US and zh-CN resource leaves under widgetProperty.tableV2.
- Translate only sectionName, nontechnical label, helpText, placeholderText, searchPlaceholderText, and display-only option labels.
- Preserve propertyName, event labels, DSL fields, bindings/examples, defaults, option values, column type values, date-format values, hooks, dependencies, validation, and hidden conditions.
- Event help text may be localized. Event labels onPageChange, onRowSelected, onSort, onClick, onSubmit, and onOptionChange remain exact technical identifiers.
- Do not modify legacy TABLE_WIDGET, WDS_TABLE_WIDGET, public Action selector/Callbacks, Query/Action/Datasource/theme/shared-editor UI, or runtime query behavior.
- Resolve display copy at configuration request time; do not retain locale-sensitive strings in module-level static configuration objects.
- Do not stage unrelated .superpowers, ref, or existing worktree changes.

---

## File Structure

- app/client/src/i18n/resources/en-US.ts and zh-CN.ts: paired widgetProperty.tableV2 resource catalog.
- app/client/src/i18n/resources/resourceParity.test.ts: TableV2 parity and representative values.
- app/client/src/widgets/TableWidgetV2/widget/propertyConfig/contentConfig.ts: getTableV2ContentConfig factory.
- app/client/src/widgets/TableWidgetV2/widget/propertyConfig/styleConfig.ts: getTableV2StyleConfig factory.
- app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/index.ts: getTableV2ColumnPanelConfig composition factory.
- app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig directory: current-locale column-panel factories.
- app/client/src/widgets/TableWidgetV2/widget/index.tsx: fresh content/style factory calls.
- app/client/src/WidgetProvider/factory/index.tsx: locale-aware combined configuration cache.
- app/client/src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts: current-locale configuration tests.
- app/client/src/WidgetProvider/factory/__tests__/WidgetFactory.test.ts: real factory-path language-switch test.

### Task 1: Add TableV2 Resources

**Files:**
- Modify: app/client/src/i18n/resources/en-US.ts
- Modify: app/client/src/i18n/resources/zh-CN.ts
- Modify: app/client/src/i18n/resources/resourceParity.test.ts

**Interfaces:**
- Produces matching widgetProperty.tableV2.content, style, column, help, placeholder, and option leaves.
- Consumed by Tasks 2-4 through i18n.t with a TableV2-owned key.
- Keeps existing widgetProperty.table resources unchanged.

- [ ] **Step 1: Write the failing resource test**

~~~ts
it("keeps TableV2 resources in parity and localizes Chinese copy", () => {
  expect(flattenKeys(enUS.widgetProperty.tableV2).sort()).toEqual(
    flattenKeys(zhCN.widgetProperty.tableV2).sort(),
  );
  expect(i18n.t("widgetProperty.tableV2.content.data", { lng: "zh-CN" }))
    .toBe("数据");
  expect(i18n.t("widgetProperty.tableV2.column.columnType", { lng: "zh-CN" }))
    .toBe("列类型");
  expect(i18n.t("widgetProperty.tableV2.style.textFormatting", { lng: "zh-CN" }))
    .toBe("文本格式");
});
~~~

- [ ] **Step 2: Verify red**

Run: yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts

Expected: FAIL because widgetProperty.tableV2 is absent.

- [ ] **Step 3: Add complete owner-scoped catalog**

Inventory every in-scope display value in contentConfig.ts, styleConfig.ts, and every TypeScript configuration file below PanelConfig, PanelConfig/Data, PanelConfig/Validations, and PanelConfig/childPanels. Add matching English and Chinese leaves. Use paths such as:

~~~ts
widgetProperty: {
  tableV2: {
    content: { data: "Data", tableData: "Table data", pagination: "Pagination" },
    style: { general: "General", textFormatting: "Text formatting" },
    column: { data: "Data", columnType: "Column type", plainText: "Plain text" },
    help: { tableData: "Takes in an array of objects ..." },
    placeholder: { totalRecords: "Enter total record count" },
    option: { singleRow: "Single Row", multiRow: "Multi Row" },
  },
}
~~~

Keep date-format labels localized only as display strings, never change their values. Do not create resources for technical event labels or persisted values.

- [ ] **Step 4: Add inventory guard and verify green**

Add requiredTableV2Paths covering top-level content/style, column data/style, validation, menu, placeholders, options, and event help. Assert every path resolves to a value other than its key in both locales.

Run: yarn --cwd app/client g:jest src/i18n/resources/resourceParity.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add app/client/src/i18n/resources/en-US.ts app/client/src/i18n/resources/zh-CN.ts app/client/src/i18n/resources/resourceParity.test.ts
git commit -m "feat(i18n): add TableV2 property resources"
~~~

### Task 2: Localize Top-Level Content and Style Factories

**Files:**
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/contentConfig.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/styleConfig.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/index.tsx
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts

**Interfaces:**
- Consumes Task 1 TableV2 content/style/help/placeholder/option resources.
- Produces getTableV2ContentConfig(): PropertyPaneConfig[] and getTableV2StyleConfig(): PropertyPaneConfig[].
- Keeps the existing static panelConfig import until Task 5 connects the complete column-panel factory.

- [ ] **Step 1: Write failing current-locale tests**

Use a helper that calls getTableV2ContentConfig. Change to zh-CN and assert Data and tableData use Chinese, while onPageChange remains technical. Assert the style factory contains a Chinese Text formatting section. Restore en-US afterward.

~~~ts
await i18n.changeLanguage("zh-CN");
const content = getTableV2ContentConfig();
const data = content.find((section) => section.sectionName === "数据");

expect(data?.children?.find((child) => child.propertyName === "tableData")?.label)
  .toBe("表格数据");
expect(content.flatMap((section) => section.children ?? [])
  .find((child) => child.propertyName === "onPageChange")?.label)
  .toBe("onPageChange");
~~~

- [ ] **Step 2: Verify red**

Run: yarn --cwd app/client g:jest src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts

Expected: FAIL because TableV2 exports static English arrays.

- [ ] **Step 3: Implement top-level factories**

Replace static exports with getTableV2ContentConfig and getTableV2StyleConfig functions. Resolve all in-scope top-level display fields through Task 1 resources. Retain all structural fields and the existing static panelConfig import temporarily. Do not update TableWidgetV2 property-pane methods until Task 5 connects the complete column-panel factory.

- [ ] **Step 4: Verify focused behavior**

Run: yarn --cwd app/client g:jest src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts src/widgets/TableWidgetV2/widget/__tests__/nativeQueryMode.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add app/client/src/widgets/TableWidgetV2/widget/propertyConfig/contentConfig.ts app/client/src/widgets/TableWidgetV2/widget/propertyConfig/styleConfig.ts app/client/src/widgets/TableWidgetV2/widget/index.tsx app/client/src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts
git commit -m "feat(i18n): localize TableV2 top-level property panes"
~~~

### Task 3: Localize Column Content, Event, and Validation Panels

**Files:**
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/index.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/Data/ColumnType.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/Data/index.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/Basic.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/General.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/Select.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/Events.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/Validation.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/Validations/Common.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/Validations/Date.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/Validations/Number.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/childPanels/configureMenuItemsConfig.ts
- Test: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts

**Interfaces:**
- Produces factory functions for column content, event, validation, and menu modules.
- Preserves ColumnTypes, DateInputFormat, event labels, menu values, validators, update hooks, conditions, and child ordering.

- [ ] **Step 1: Write failing column-panel tests**

Reach primaryColumns.panelConfig through getTableV2ContentConfig in Chinese. Assert Data, columnType, and Plain text option are Chinese; assert its value remains ColumnTypes.TEXT. Assert onClick remains its technical label and its help text is Chinese.

- [ ] **Step 2: Verify red**

Run: yarn --cwd app/client g:jest src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts

Expected: FAIL because column modules return static English configurations.

- [ ] **Step 3: Convert content modules to factories**

Replace every listed static object/array with named zero-argument factories. Use names such as getTableV2ColumnDataConfig and getTableV2ColumnBasicConfig; each returns the same structural object or array with only display copy resolved through i18n. Do not change PanelConfig/index.ts aggregation in this task because styleChildren remains static until Task 4. Localize event help text but keep event labels literal.

- [ ] **Step 4: Verify column behavior**

Run: yarn --cwd app/client g:jest src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts src/widgets/TableWidgetV2/widget/__tests__/propertyUtils.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig app/client/src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts
git commit -m "feat(i18n): localize TableV2 column content panels"
~~~

### Task 4: Localize Column Styles and Edit-Action Panels

**Files:**
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/Alignment.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/BorderAndShadow.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/Color.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/DateProperties.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/DiscardButtonproperties.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/Icon.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/SaveButtonProperties.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/TextFormatting.ts
- Modify: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig/index.ts
- Test: app/client/src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts

**Interfaces:**
- Produces style and edit-action factories, then a complete getTableV2ColumnPanelConfig composition factory.
- Preserves icon names, button defaults, option values, visibility logic, update hooks, and original child ordering.

- [ ] **Step 1: Write failing style-panel tests**

Assert Chinese styleChildren includes Text formatting, Text align translates to 文本对齐, and its visual option retains original value. Assert a save/discard display label is Chinese while its propertyName remains unchanged.

- [ ] **Step 2: Verify red**

Run: yarn --cwd app/client g:jest src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts

Expected: FAIL because style/edit-action panels are static English objects.

- [ ] **Step 3: Convert style/edit-action modules to factories**

Replace listed static configurations with named factories and resolve every in-scope display value through Task 1 resources. In PanelConfig/index.ts replace the static aggregate with getTableV2ColumnPanelConfig(), calling content factories from Task 3 and style/edit-action factories from this task in their exact original child order.

- [ ] **Step 4: Verify focused behavior**

Run: yarn --cwd app/client g:jest src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add app/client/src/widgets/TableWidgetV2/widget/propertyConfig/PanelConfig app/client/src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts
git commit -m "feat(i18n): localize TableV2 column style panels"
~~~

### Task 5: Refresh Combined Property Pane Cache by Locale

**Files:**
- Modify: app/client/src/WidgetProvider/factory/index.tsx
- Modify: app/client/src/WidgetProvider/factory/__tests__/WidgetFactory.test.ts

**Interfaces:**
- Consumes TableWidgetV2 factories from Tasks 2-4.
- Produces a combined content/style cache keyed by type, widget properties, and locale, and connects the completed column-panel factory to top-level content.
- Leaves non-property-pane caches unchanged.

- [ ] **Step 1: Write failing real-factory locale test**

Register TableWidgetV2, clear caches, retrieve its config in English, switch to Chinese, and retrieve it again.

~~~ts
await i18n.changeLanguage("en-US");
const english = WidgetFactory.getWidgetPropertyPaneConfig(
  TableWidgetV2.type,
  {} as never,
);
await i18n.changeLanguage("zh-CN");
const chinese = WidgetFactory.getWidgetPropertyPaneConfig(
  TableWidgetV2.type,
  {} as never,
);

expect(firstSectionName(english)).toBe("Data");
expect(firstSectionName(chinese)).toBe("数据");
expect(firstStyleSectionName(chinese)).toBe("常规");
~~~

Restore English and clear caches after the test.

- [ ] **Step 2: Verify red**

Run: yarn --cwd app/client g:jest src/WidgetProvider/factory/__tests__/WidgetFactory.test.ts

Expected: FAIL because the combined content/style cache reuses first-locale config.

- [ ] **Step 3: Include locale in cache inputs**

In contentConfig.ts replace the temporary static panelConfig import with getTableV2ColumnPanelConfig(), and update TableWidgetV2 property-pane methods to call getTableV2ContentConfig() and getTableV2StyleConfig(). Add locale to getWidgetPropertyPaneCombinedConfig arguments and pass i18n.language at its call site. Keep existing memoize/freeze behavior, now partitioned by locale. Do not change unrelated factory cache APIs.

- [ ] **Step 4: Verify cache and TableV2 suites**

Run: yarn --cwd app/client g:jest src/WidgetProvider/factory/__tests__/WidgetFactory.test.ts src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts

Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add app/client/src/WidgetProvider/factory/index.tsx app/client/src/WidgetProvider/factory/__tests__/WidgetFactory.test.ts
git commit -m "fix(i18n): refresh TableV2 property panes by locale"
~~~

### Task 6: Verify the User-Visible TableV2

**Files:**
- Modify: none unless verification finds a defect.

- [ ] **Step 1: Run the consolidated suite**

~~~bash
yarn --cwd app/client g:jest \
  src/i18n/resources/resourceParity.test.ts \
  src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts \
  src/widgets/TableWidgetV2/widget/__tests__/nativeQueryMode.test.ts \
  src/widgets/TableWidgetV2/widget/__tests__/propertyUtils.test.ts \
  src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts \
  src/WidgetProvider/factory/__tests__/WidgetFactory.test.ts
~~~

Expected: PASS.

- [ ] **Step 2: Check technical boundaries**

~~~bash
rg -n 'label: "on(PageChange|PageSizeChange|TableFilterUpdate|SearchTextChanged|RowSelected|Sort|Save|Discard|Click|Submit|OptionChange)"' app/client/src/widgets/TableWidgetV2/widget/propertyConfig
rg -n 'type = "TABLE_WIDGET_V2"|hideCard: true' app/client/src/widgets/TableWidgetV2/widget/index.tsx app/client/src/widgets/TableWidget/widget/index.tsx
git diff --check
~~~

Expected: TableV2 events remain technical, TableV2 is visible, legacy Table remains hidden, and no whitespace errors exist.

- [ ] **Step 3: Manually validate actual editor Table**

Set language to Chinese, add the Table offered in the component panel, and inspect Data, Pagination, Search and filters, Row selection, General, styles, and Columns editor. Labels/help/options are Chinese; event labels remain technical; Action selector and Callbacks remain unchanged. Switch to English and confirm the same TableV2 shows English.
