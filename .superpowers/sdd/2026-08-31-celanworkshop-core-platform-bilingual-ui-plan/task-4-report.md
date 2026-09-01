# Task 4 Report: Cross-Surface Navigation, Search, Dialogs, and Toasts

## Changed files

- `app/client/src/i18n/resources/en-US.ts` and `zh-CN.ts`
  - Added parity-checked navigation, search hotkey, invite, generic validation, and save-toast resources.
- `app/client/src/ce/constants/messages.ts`
  - Routed confirmation, invite validation/actions/success, global-search placeholders/no-results, admin settings, generic user validation, and save-hotkey messages through the active locale.
- `app/client/src/pages/common/ProfileDropdown.tsx`
  - Existing account actions remain resource-backed and now have bilingual/live-switch coverage.
- `app/client/src/pages/common/MobileSidebar.tsx`
  - Localized account/sign-out/version-release chrome. Documentation and Discord labels/URLs remain unchanged.
- `app/client/src/components/editorComponents/GlobalSearch/SearchBox.tsx`
  - Localized category-aware placeholders with `useTranslation()` for live locale reactivity.
- `app/client/src/components/editorComponents/GlobalSearch/ResultsNotFound.tsx`
  - Localized no-results text while preserving the external Discord help action.
- `app/client/src/pages/Editor/GlobalHotKeys/GlobalHotKeys.tsx`
  - Localized global-search hotkey labels and retained shortcut behavior.
- `app/client/src/components/editorComponents/form/FormDialogComponent.tsx`
  - Localized Share and default invite-dialog title.
- `app/client/src/ce/pages/workspace/InviteUsersForm.tsx` and `WorkspaceInviteUsersForm.tsx`
  - Localized invite labels/placeholders/buttons, validation/success/no-user states, and subscribed components to locale changes.
- `app/client/src/pages/workspace/SettingsPageHeader.tsx`
  - Localized the standard delete confirmation command.
- Tests:
  - Added `ProfileDropdown.i18n.test.tsx` and `GlobalSearch.i18n.test.tsx`.
  - Extended `SettingsPageHeader.test.tsx` with active-locale confirmation coverage.

## Scope safeguards

External documentation and Discord labels/destinations were left in English and untouched. Plugin-specific forms, authored application/workspace data, backend/raw errors, and technical URLs/tokens were not translated.

## Verification

Red was observed before implementation: Chinese global-search placeholder/no-results and Settings confirmation assertions failed while rendering the old English literals.

Green command:

```bash
cd app/client && npx jest --runInBand src/pages/common/ProfileDropdown.i18n.test.tsx src/components/editorComponents/GlobalSearch/GlobalSearch.i18n.test.tsx src/components/editorComponents/GlobalSearch/GlobalSearchHooks.test.ts src/pages/workspace/__tests__/SettingsPageHeader.test.tsx src/ce/constants/messages.i18n.test.ts
```

Result: 5 suites passed, 21 tests passed.

Additional checks:

- `resourceParity.test.ts`: passed with English/Chinese leaf parity.
- `GlobalHotKeys.test.tsx`: 7 tests passed.
- Targeted ESLint: no errors; repository emitted only existing performance/hook warnings and the stale Browserslist notice.
- `git diff --check`: passed.

## Review fix round 1

- Added locale subscriptions to invite-dialog parents (`settings.tsx`, `AppInviteUsersForm.tsx`, viewer `ShareButton.tsx`, AppIDE `Header`) so titles, tabs, and placeholders update during an open dialog without changing form data.
- Made GlobalSearch category title/description and hotkey labels resolve through i18n at render time while retaining existing category IDs and actions.
- Re-ran redux-form invite validation on locale changes using the current `users` and `role` values, preserving entered data and refreshing visible errors. Workspace member no-results text now subscribes to locale changes.
- Added locale subscriptions to Git deploy confirmation consumers and the admin settings header action.

Fix-round verification:

```bash
cd app/client && npx jest --runInBand src/components/editorComponents/GlobalSearch/GlobalSearch.i18n.test.tsx src/components/editorComponents/GlobalSearch/GlobalSearchHooks.test.ts src/pages/workspace/__tests__/SettingsPageHeader.test.tsx src/ce/constants/messages.i18n.test.ts src/pages/Editor/GlobalHotKeys/GlobalHotKeys.test.tsx
```

Result: 5 suites passed, 27 tests passed (plus a live-switch GlobalSearch hotkey render test in the fix round). Targeted ESLint reported no errors (existing warnings only); `git diff --check` passed.

## Review fix round 2

- Corrected the invite form's redux-form selector to request `users` and `role`, preventing the connected form from throwing `No fields specified` during mount.
- Replaced locale-change `change()` calls with redux-form `updateSyncErrors`, refreshing cached validation text for undefined/untouched fields without changing form values.
- Subscribed the artifact Git OpsModal deploy view to i18n so the open discard confirmation, including `ARE_YOU_SURE`, updates on a locale switch.
- Added connected invite-form mount and untouched-value validation regressions, plus a live-switch deploy confirmation regression.

Verification:

```bash
cd app/client && npx jest --runInBand src/ce/pages/workspace/InviteUsersForm.i18n.test.tsx src/git/components/OpsModal/TabDeploy/TabDeployView.i18n.test.tsx src/components/editorComponents/GlobalSearch/GlobalSearch.i18n.test.tsx src/components/editorComponents/GlobalSearch/GlobalSearchHooks.test.ts src/pages/workspace/__tests__/SettingsPageHeader.test.tsx src/ce/constants/messages.i18n.test.ts src/pages/Editor/GlobalHotKeys/GlobalHotKeys.test.tsx --silent
```

Result: 7 suites passed, 31 tests passed. Targeted ESLint reported no errors (existing warnings only); `git diff --check` passed.

## Review fix round 3

- Preserved an existing server `SubmissionError._error` when refreshing invite-form sync validation on locale changes by passing the current form error through `updateSyncErrors`.
- Added a regression that seeds an invalid email and server error, switches English to Chinese while the form is mounted, and verifies the server callout remains visible, the field error localizes, and the entered value is unchanged.

Verification:

```bash
cd app/client && npx jest --runInBand src/ce/pages/workspace/InviteUsersForm.i18n.test.tsx --silent
npx eslint src/ce/pages/workspace/InviteUsersForm.tsx src/ce/pages/workspace/InviteUsersForm.i18n.test.tsx
git diff --check
```

Result: 3 tests passed; targeted ESLint reported 0 errors (11 existing warnings); `git diff --check` passed.
