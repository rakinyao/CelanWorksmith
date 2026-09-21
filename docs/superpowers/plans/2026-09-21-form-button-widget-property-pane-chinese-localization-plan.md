# Form And Button Widget Property Pane Chinese Localization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the private property panes of DatePicker V2, FilePicker V2, ButtonGroup, IconButton, and MenuButton in English and Chinese.

**Architecture:** Each Widget receives an owner-scoped catalog under `widgetProperty`. Its existing static pane methods return a newly built configuration for the current i18n language, preserving all technical configuration fields and nested panel behavior.

**Tech Stack:** TypeScript, React, i18next, Jest, Yarn workspaces.

## Global Constraints

- Translate only Widget-private presentation fields: section names, nontechnical labels, help text, placeholders, fixed button text, and display-only option labels.
- Retain `propertyName`, event labels and IDs, DSL, expressions, persisted values, validators, hooks, dependencies, conditions, colors, icons, date format values, file values, and user data.
- Do not modify WDS/Anvil, shared callbacks/action selectors, Query, Datasource, JSON Form, Chart/ECharts, or global editor UI.
- `en-US.ts` and `zh-CN.ts` must have matching resource keys.
- Do not stage unrelated `.superpowers/`, `ref/`, or existing worktree files.

---

### Task 1: Form Widget Resources And Regression Tests

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Create: `app/client/src/widgets/DatePickerWidget2/widget/propertyPaneConfig.test.ts`
- Create: `app/client/src/widgets/FilePickerWidgetV2/widget/propertyPaneConfig.test.ts`

- [ ] Write language-switch tests that assert Chinese display fields while `onDateSelected`, `onFilesSelected`, date-format values, and file-format values remain unchanged.
- [ ] Run the new tests and confirm they fail due to static English configurations.
- [ ] Add matching `widgetProperty.datePickerV2.*` and `widgetProperty.filePickerV2.*` catalogs and resource parity assertions.
- [ ] Run the resource test and confirm it passes.

### Task 2: Localize DatePicker V2 And FilePicker V2

**Files:**
- Modify: `app/client/src/widgets/DatePickerWidget2/widget/index.tsx`
- Modify: `app/client/src/widgets/FilePickerWidgetV2/widget/index.tsx`
- Test: form Widget tests from Task 1

- [ ] Convert content/style configurations to current-locale factories; only replace presentation fields.
- [ ] Run: `yarn --cwd app/client g:jest src/widgets/DatePickerWidget2/widget/propertyPaneConfig.test.ts src/widgets/DatePickerWidget2/widget/derived.test.js src/widgets/FilePickerWidgetV2/widget/propertyPaneConfig.test.ts src/widgets/FilePickerWidgetV2/widget/FileParser.test.tsx`.
- [ ] Commit: `feat(i18n): localize form widget property panes`.

### Task 3: Button Widget Resources And Regression Tests

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Create: `app/client/src/widgets/ButtonGroupWidget/widget/propertyPaneConfig.test.ts`
- Create: `app/client/src/widgets/IconButtonWidget/widget/propertyPaneConfig.test.ts`
- Create: `app/client/src/widgets/MenuButtonWidget/widget/propertyPaneConfig.test.ts`

- [ ] Write language-switch tests that cover a nested ButtonGroup panel, IconButton variant, and MenuButton configuration while retaining `onClick`, ButtonVariant, ButtonPlacement, and MenuItemsSource values.
- [ ] Run the tests and confirm they fail due to static English configurations.
- [ ] Add matching `widgetProperty.buttonGroup.*`, `widgetProperty.iconButton.*`, and `widgetProperty.menuButton.*` catalogs plus resource parity assertions.

### Task 4: Localize ButtonGroup, IconButton, And MenuButton

**Files:**
- Modify: `app/client/src/widgets/ButtonGroupWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/IconButtonWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/MenuButtonWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/MenuButtonWidget/widget/propertyConfig/contentConfig.ts`
- Modify: `app/client/src/widgets/MenuButtonWidget/widget/propertyConfig/styleConfig.ts`
- Modify as needed: private `MenuButtonWidget/widget/propertyConfig/childPanels/*`

- [ ] Convert outer and nested property configurations into current-locale factories, preserving callbacks, update hooks, validation, user labels/data, and persisted option values.
- [ ] Run: `yarn --cwd app/client g:jest src/widgets/ButtonGroupWidget/widget/propertyPaneConfig.test.ts src/widgets/ButtonGroupWidget/widget/__tests__/ButtonGroupWidget.test.tsx src/widgets/IconButtonWidget/widget/propertyPaneConfig.test.ts src/widgets/MenuButtonWidget/widget/propertyPaneConfig.test.ts src/widgets/MenuButtonWidget/validations.test.ts src/widgets/MenuButtonWidget/widget/helper.test.ts src/widgets/MenuButtonWidget/widget/nativePath.test.ts`.
- [ ] Commit: `feat(i18n): localize button widget property panes`.

### Task 5: Final Verification

- [ ] Run the resource test, all five language-switch tests, and every focused existing test named above; expect all to pass.
- [ ] Run Prettier on changed files and `git diff --check`; expect zero failures.
- [ ] Commit this design and plan with the appropriate batch, preserving all unrelated untracked files.
