# Task 2 Report: Localize Table Configuration at Request Time

## TDD evidence

- Added a regression test covering a locale switch before requesting the Table property pane and preserving the `onSort` technical event label.
- RED: `yarn --cwd app/client g:jest src/widgets/TableWidget/widget/propertyConfig.test.ts` failed because the module-level configuration still exposed English `General` and no localized `tableData` label.
- GREEN: the same test passed after introducing `getTablePropertyPaneConfig()` and request-time `i18n.t` resolution.

## Changes

Files in this task:

- `app/client/src/widgets/TableWidget/widget/propertyConfig.ts`
- `app/client/src/widgets/TableWidget/widget/index.tsx`
- `app/client/src/widgets/TableWidget/widget/propertyConfig.test.ts`
- `app/client/src/i18n/resources/en-US.ts`
- `app/client/src/i18n/resources/zh-CN.ts`
- `.superpowers/sdd/2026-09-16-widget-property-pane-chinese-localization-plan/task-2-report.md`

- Converted legacy `TableWidget/widget/propertyConfig.ts` from a module-level array export to `getTablePropertyPaneConfig()`.
- Updated `TableWidget/widget/index.tsx` to request a fresh configuration on every call.
- Routed Table-owned section names, display labels, help text, placeholders, and display-only options through `widgetProperty.table.*`.
- Preserved property names, values, defaults, examples, dynamic bindings, and technical `on...` event labels.
- Added missing English/Chinese Table resource branches (`display`, `sections`, `help`, `placeholders`, `options`) while preserving the existing 47-leaf `labels` catalog and locale parity.

## Verification

Command:

`yarn --cwd app/client g:jest src/widgets/TableWidget/widget/propertyConfig.test.ts src/widgets/TableWidget/widget/nativeQueryMode.test.ts src/i18n/resources/resourceParity.test.ts`

Result: 3 suites passed, 12 tests passed.

`git diff --check` also passed.

## Self-review and concerns

- The factory reads the i18n singleton only when `getPropertyPaneConfig()` is called, so locale switches after module import are reflected.
- Action selector controls and WDS Table variants were left unchanged.
- Existing resource parity asserts the original 47 `labels` leaves; additional display copy is intentionally grouped under separate nested branches.

## Fix Round 1

- Restored the default array export from `propertyConfig.ts` for legacy utility consumers; `TableWidget` continues to call the request-time factory.
- Made the WidgetFactory property-pane cache locale-aware by keying its memoized static config with `i18n.language` and removing the outer locale-blind memoization layer.
- Added coverage for the legacy default import, nested Chinese column label/option preservation, and WidgetFactory locale refresh behavior.
- RED: the compatibility test initially observed a non-array default export; the factory regression initially returned English after switching to `zh-CN`.
- GREEN: `yarn --cwd app/client g:jest src/entities/Widget/utils.test.ts src/widgets/TableWidget/widget/propertyConfig.test.ts src/widgets/TableWidget/widget/nativeQueryMode.test.ts src/WidgetProvider/factory/__tests__/WidgetFactory.test.ts src/i18n/resources/resourceParity.test.ts` passed (5 suites, 17 tests).
- `yarn --cwd app/client check-types` still reports unrelated pre-existing repository errors, but no diagnostics remain for the modified Table, WidgetFactory, or test files.

## Fix Round 1 Review Follow-up

- Restored the default `propertyConfig` array export required by `entities/Widget/utils.test.ts` and added an explicit compatibility assertion.
- Added nested column-panel assertions for the localized `columnType` label and `Plain text` option while checking the unchanged `propertyName` and `value`.
- Updated `WidgetFactory` to include the active locale in its memoized static-config key and removed only the locale-blind outer memoization, allowing editor requests to refresh after language changes.
- Added a factory-level locale-switch regression using the real legacy Table widget.
- Verification: 5 focused suites passed, 17 tests passed; targeted ESLint has no errors (one pre-existing objectKeys warning); full type checking remains blocked by unrelated repository diagnostics, with no errors in modified files.
