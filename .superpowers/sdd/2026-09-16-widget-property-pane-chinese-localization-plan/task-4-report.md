# Task 4 Report: Localize Input Configuration

## TDD evidence

- Added a regression test that switches to `zh-CN`, requests the Input property pane, and asserts `数据类型`, `文本`, and the unchanged `onTextChanged` event label.
- RED: `yarn --cwd app/client g:jest src/widgets/InputWidget/widget/index.test.tsx` failed because the configuration returned the hardcoded English `Data type` label.
- GREEN: the same test passed after introducing request-time i18n lookups.

## Changes

- Routed Input-owned section names, labels, help text, search hints, and label-position option labels through `widgetProperty.input.*` at `getPropertyPaneConfig()` request time.
- Added matching English and Chinese Input resource branches for sections, help text, and search placeholders while preserving the existing 37-label catalog.
- Preserved property names, enum values, `LabelPosition` values, examples, regexes, validation functions/messages, and technical `onTextChanged`/`onSubmit` labels.

## Verification

Command:

`yarn --cwd app/client g:jest src/widgets/InputWidget/widget/index.test.tsx src/widgets/InputWidget/component/utilities.test.ts src/i18n/resources/resourceParity.test.ts`

Result: 3 suites passed, 22 tests passed.

Additional checks:

- `yarn --cwd app/client exec prettier --check src/widgets/InputWidget/widget/index.tsx src/widgets/InputWidget/widget/index.test.tsx src/i18n/resources/en-US.ts src/i18n/resources/zh-CN.ts` passed.
- `git diff --check` passed.
- Focused ESLint reports one pre-existing unused `_` parameter in `defaultValueValidation` (`index.tsx:120`); no new lint errors were introduced.
