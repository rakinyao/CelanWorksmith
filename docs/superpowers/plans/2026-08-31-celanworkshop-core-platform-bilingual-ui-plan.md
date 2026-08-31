# CelanWorkshop Core Platform Bilingual UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Localize the operational core of CelanWorkshop in Simplified Chinese and English, covering the workspace-to-editor workflow without changing product behavior or internal contracts.

**Architecture:** Extend the existing `react-i18next` resource catalogs with semantic core UI groups. Keep `messages.ts` exports stable while resolving their display values through i18n, and localize React-owned literals only at their existing component boundaries. Deliver the work in independent workspace/application, editor/execution, and cross-surface groups, each protected by bilingual component and browser checks.

**Tech Stack:** TypeScript, React, `i18next`, `react-i18next`, Jest, Playwright with the installed Google Chrome executable.

## Global Constraints

- `zh-CN` remains the default for unconfigured sessions; stored and authenticated choices override it; `en-US` remains the missing-key fallback.
- Preserve Java/TypeScript package names, `appsmith.*` bindings, API paths, protocol headers, environment variables, database fields, Docker paths, test IDs, routes, permissions, and native Appsmith datasource/query/action execution.
- Do not translate ontology-authored metadata, object type names, Function/Action IDs, query JSON, datasource configuration, operation values, raw backend errors, audit data, or server diagnostics.
- Exclude help, manuals, privacy/legal content, documentation, external Appsmith links, visual assets, and other plugins' specialized configuration forms.
- New client-visible copy must use i18n resources; `messages.ts` compatibility export names remain unchanged.
- Preserve the existing `en-US`/`zh-CN` resource leaf-key parity test and expand it for each new namespace.
- Use historical Git identity `gavin <gavin@localhost>` for commits.

---

### Task 1: Establish Core UI Resource and Compatibility Message Foundation

**Files:**
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`
- Modify: `app/client/src/i18n/resources/resourceParity.test.ts`
- Modify: `app/client/src/ce/constants/messages.ts`
- Create: `app/client/src/ce/constants/messages.i18n.test.ts`

**Interfaces:**
- Resources expose `workspace`, `application`, `editor`, `dialog`, `toast`, `search`, and `profile` groups with identical leaf paths.
- Existing exports such as `NEW_APPLICATION`, `CREATE_NEW_APPLICATION`, `SEARCH_APPS`, `WIDGET_SIDEBAR_TITLE`, `EXECUTE_A_QUERY`, `DELETE_CONFIRMATION_MODAL_TITLE`, `APPLICATION_NAME_UPDATE`, and `FIELD_REQUIRED_ERROR` continue to exist and return the active-locale display string.
- Technical values such as `APPSMITH_HTTP_ERROR_413` remain untouched.

- [ ] **Step 1: Write failing resource and compatibility tests**

Add representative assertions in both locales:

```ts
expect(createMessage(NEW_APPLICATION)).toBe("New application");
await changeLocale("zh-CN");
expect(createMessage(NEW_APPLICATION)).toBe("新建应用");
expect(createMessage(FIELD_REQUIRED_ERROR)).toBe("此字段为必填项");
expect(flattenKeys(enUS).sort()).toEqual(flattenKeys(zhCN).sort());
```

- [ ] **Step 2: Verify red**

Run:

```bash
cd app/client && npx jest --runInBand src/i18n/resources/resourceParity.test.ts src/ce/constants/messages.i18n.test.ts
```

Expected: the new resource paths are absent and literal compatibility messages remain English after the locale change.

- [ ] **Step 3: Add semantic resources and route stable exports through i18n**

Add reviewed English and Simplified Chinese values for core controls, workspace/application actions, editor commands, dialogs, toasts, search, and profile labels. Convert only the listed client-owned `messages.ts` exports and their directly related core workflow values to `i18n.t(...)`; retain their exported identifiers and argument signatures.

- [ ] **Step 4: Verify green**

Run the Step 2 command and:

```bash
cd app/client && npx eslint src/i18n/resources/en-US.ts src/i18n/resources/zh-CN.ts src/i18n/resources/resourceParity.test.ts src/ce/constants/messages.ts src/ce/constants/messages.i18n.test.ts
```

Expected: tests pass in both locales and no lint errors occur.

- [ ] **Step 5: Commit**

```bash
git add app/client/src/i18n/resources app/client/src/ce/constants/messages.ts app/client/src/ce/constants/messages.i18n.test.ts
git -c user.name=gavin -c user.email=gavin@localhost commit -m "feat(i18n): add core platform resource foundation"
```

### Task 2: Localize Workspace and Application Management

**Files:**
- Modify: `app/client/src/ce/pages/Applications/index.tsx`
- Modify: `app/client/src/ce/pages/Applications/WorkspaceAction.tsx`
- Modify: `app/client/src/ce/pages/Applications/WorkspaceMenu.tsx`
- Modify: `app/client/src/ce/pages/Applications/CreateNewAppsOption.tsx`
- Modify: `app/client/src/ce/pages/Applications/CreateNewAppFromTemplateModal/index.tsx`
- Modify: `app/client/src/pages/Applications/ApplicationCard.tsx`
- Modify: `app/client/src/pages/Applications/ForkApplicationModal.tsx`
- Modify: `app/client/src/ce/pages/Applications/tests/WorkspaceAction.test.tsx`
- Modify: `app/client/src/ce/pages/Applications/CreateNewAppsOption.test.tsx`
- Create: `app/client/src/pages/Applications/ApplicationCard.i18n.test.tsx`

**Interfaces:**
- Existing application/workspace test IDs, callbacks, permission gates, modal behavior, and routes are unchanged.
- Workspace actions and application-card menu labels come from `workspace.*` and `application.*` resource keys or existing localized compatibility messages.

- [ ] **Step 1: Write failing bilingual component tests**

Add tests that render the workspace action and application card in `zh-CN` and `en-US`, asserting visible labels for New, application creation, template/import actions, Share, Fork, Export, Delete, and application search while retaining current test IDs.

- [ ] **Step 2: Verify red**

Run:

```bash
cd app/client && npx jest --runInBand src/ce/pages/Applications/tests/WorkspaceAction.test.tsx src/ce/pages/Applications/CreateNewAppsOption.test.tsx src/pages/Applications/ApplicationCard.i18n.test.tsx
```

Expected: Chinese visible-text assertions fail before component literal migration.

- [ ] **Step 3: Localize user-visible workspace and application controls**

Use `useTranslation()` in the affected React components or the Task 1 compatibility exports where a component already consumes them. Translate only client-owned headings, menu labels, button text, placeholders, empty/loading states, and modal commands. Keep application names and workspace names as authored data.

- [ ] **Step 4: Verify green**

Run the Step 2 command plus:

```bash
cd app/client && npx eslint src/ce/pages/Applications src/pages/Applications/ApplicationCard.tsx src/pages/Applications/ForkApplicationModal.tsx
```

Expected: bilingual component tests pass and routes/test IDs remain unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/client/src/ce/pages/Applications app/client/src/pages/Applications
git -c user.name=gavin -c user.email=gavin@localhost commit -m "feat(i18n): localize workspace and application management"
```

### Task 3: Localize Editor and Execution Chrome

**Files:**
- Modify: `app/client/src/components/editorComponents/EntityExplorerSidebar.tsx`
- Modify: `app/client/src/pages/Editor/Explorer/Actions/ActionEntityContextMenu.tsx`
- Modify: `app/client/src/pages/Editor/Explorer/CopyToApp/CopyEntityToAppModal.tsx`
- Modify: `app/client/src/pages/Editor/widgetSidebar/UIEntitySidebar.tsx`
- Modify: `app/client/src/pages/Editor/DataSidePane/CreateDatasourceButton.tsx`
- Modify: `app/client/src/pages/Editor/DataSourceEditor/DatasourceBlankState.tsx`
- Modify: `app/client/src/pages/Editor/EditorSaveIndicator.tsx`
- Modify: `app/client/src/pages/Editor/RequestConfirmationModal.tsx`
- Modify: `app/client/src/pages/Editor/Explorer/Actions/ActionEntityContextMenu.test.tsx`
- Modify: `app/client/src/pages/Editor/Explorer/CopyToApp/CopyEntityToAppModal.test.tsx`
- Modify: `app/client/src/pages/Editor/widgetSidebar/tests/UIEntitySidebar.test.tsx`
- Create: `app/client/src/pages/Editor/EditorChrome.i18n.test.tsx`

**Interfaces:**
- Entity explorer and editor test IDs, query execution, datasource creation, save state, publish behavior, and query JSON remain unchanged.
- Shared response localization from Phase 1 remains the single response-chrome implementation; this task must not duplicate it.

- [ ] **Step 1: Write failing bilingual editor tests**

Add focused render assertions for Chinese and English labels for widgets, datasources, queries, create-datasource actions, Save/Run/Publish commands, explorer context-menu actions, copy-to-application dialog text, and client-owned request confirmation text.

- [ ] **Step 2: Verify red**

Run:

```bash
cd app/client && npx jest --runInBand src/pages/Editor/Explorer/Actions/ActionEntityContextMenu.test.tsx src/pages/Editor/Explorer/CopyToApp/CopyEntityToAppModal.test.tsx src/pages/Editor/widgetSidebar/tests/UIEntitySidebar.test.tsx src/pages/Editor/EditorChrome.i18n.test.tsx
```

Expected: Chinese UI assertions fail for existing editor literals.

- [ ] **Step 3: Localize editor-owned operational chrome**

Replace affected client-owned literals with `editor.*`, `dialog.*`, and `toast.*` translations. Do not translate widget display names, datasource/plugin form fields, query definitions, object metadata, backend failures, or advanced-mode JSON.

- [ ] **Step 4: Verify green**

Run the Step 2 command and the existing Phase 1 response suite:

```bash
cd app/client && npx jest --runInBand src/PluginActionEditor/components/PluginActionResponse/components/Response/Response.test.tsx
```

Expected: editor tests pass and response behavior remains unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/client/src/components/editorComponents/EntityExplorerSidebar.tsx app/client/src/pages/Editor
git -c user.name=gavin -c user.email=gavin@localhost commit -m "feat(i18n): localize editor operational chrome"
```

### Task 4: Localize Cross-Surface Navigation, Search, Dialogs, and Toasts

**Files:**
- Modify: `app/client/src/pages/common/ProfileDropdown.tsx`
- Modify: `app/client/src/pages/common/MobileSidebar.tsx`
- Modify: `app/client/src/components/editorComponents/GlobalSearch/SearchModal.tsx`
- Modify: `app/client/src/components/editorComponents/GlobalSearch/SearchBox.tsx`
- Modify: `app/client/src/components/editorComponents/GlobalSearch/ResultsNotFound.tsx`
- Modify: `app/client/src/pages/Editor/GlobalHotKeys/GlobalHotKeys.tsx`
- Modify: `app/client/src/components/editorComponents/form/FormDialogComponent.tsx`
- Modify: `app/client/src/pages/workspace/WorkspaceInviteUsersForm.tsx`
- Modify: `app/client/src/pages/workspace/__tests__/SettingsPageHeader.test.tsx`
- Modify: `app/client/src/components/editorComponents/GlobalSearch/GlobalSearchHooks.test.ts`
- Create: `app/client/src/pages/common/ProfileDropdown.i18n.test.tsx`
- Create: `app/client/src/components/editorComponents/GlobalSearch/GlobalSearch.i18n.test.tsx`

**Interfaces:**
- Language switching stays in the existing `LanguageSwitcher`; profile/account actions, search controls, dialogs, and toasts read display text from resources.
- No external documentation destination, URL, or help action is translated or changed.

- [ ] **Step 1: Write failing bilingual cross-surface tests**

Add tests for profile/menu labels, global-search placeholder/no-result UI, confirmation-dialog commands, invite validation, and generic client validation/toast messages in both locales. Assert external help/documentation link targets are not altered.

- [ ] **Step 2: Verify red**

Run:

```bash
cd app/client && npx jest --runInBand src/pages/common/ProfileDropdown.i18n.test.tsx src/components/editorComponents/GlobalSearch/GlobalSearch.i18n.test.tsx src/components/editorComponents/GlobalSearch/GlobalSearchHooks.test.ts src/pages/workspace/__tests__/SettingsPageHeader.test.tsx
```

Expected: new Chinese visible-text assertions fail before the affected literals move to resources.

- [ ] **Step 3: Localize product-owned cross-surface UI**

Migrate only account/profile controls, global search, standard confirmation actions, invite/client validation, and client-owned toast messages. Keep external documentation labels and destinations English and untouched.

- [ ] **Step 4: Verify green**

Run the Step 2 command plus the Task 1 compatibility-message tests. Expected: all changed components render both locales and excluded external links are unchanged.

- [ ] **Step 5: Commit**

```bash
git add app/client/src/pages/common app/client/src/components/editorComponents/GlobalSearch app/client/src/components/editorComponents/form/FormDialogComponent.tsx app/client/src/pages/Editor/GlobalHotKeys app/client/src/pages/workspace
git -c user.name=gavin -c user.email=gavin@localhost commit -m "feat(i18n): localize shared core platform chrome"
```

### Task 5: Verify Core Platform Workflows in Real Chrome

**Files:**
- Create: `app/client/playwright/tests/i18n/core-platform-bilingual-ui.spec.ts`
- Modify: `app/client/playwright.config.ts`
- Create: `docs/superpowers/verification/2026-08-31-celanworkshop-core-platform-bilingual-ui.md`

**Interfaces:**
- The smoke project discovers `playwright/tests/i18n/**` without adding d0/t9 credential-dependent suites.
- Tests use the installed `/usr/bin/google-chrome` executable for this host when the pinned Playwright Chromium bundle is unavailable.

- [ ] **Step 1: Write failing workflow tests**

Create browser tests that, after locale storage isolation, verify Chinese and English for:

```text
applications route -> workspace New menu -> application card actions
application route -> editor sidebar Datasources and Queries -> Run/Save/Publish chrome
profile menu -> global search -> common dialog command
```

Use existing local authenticated fixtures only; do not create external accounts. Add desktop `1440x900` and mobile `390x844` screenshot assertions for each workflow group.

- [ ] **Step 2: Verify red**

Run the new suite against the branch-serving local development server with:

```bash
cd app/client && PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome npx playwright test tests/i18n/core-platform-bilingual-ui.spec.ts --project=smoke
```

Expected: Chinese workflow assertions fail before Tasks 2-4 are implemented.

- [ ] **Step 3: Add only deterministic test configuration needed for Chrome**

Configure the existing Playwright launcher to honor `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` and leave its default bundled-browser behavior unchanged. Do not modify app runtime behavior for test-only browser configuration.

- [ ] **Step 4: Verify green and record evidence**

Run the Step 2 command in both locales. Record exact test output, Chrome executable path, screenshots, covered screen matrix, excluded external links, and any credential-gated workflows not exercised.

- [ ] **Step 5: Commit**

```bash
git add app/client/playwright/tests/i18n/core-platform-bilingual-ui.spec.ts app/client/playwright.config.ts docs/superpowers/verification/2026-08-31-celanworkshop-core-platform-bilingual-ui.md
git -c user.name=gavin -c user.email=gavin@localhost commit -m "test(i18n): verify core platform workflows"
```

## Phase Exit Gate

Run all Task 1-4 focused Jest suites, resource parity, lint for changed client files, `git diff --check`, and Task 5 Chrome browser workflows. Confirm the running service serves the branch that is under test, preserve unrelated server working-tree changes, and attach the browser screenshots to the verification record.
