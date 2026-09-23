# Task 2 Report: Numeric Scatter Builder

Status: DONE_WITH_CONCERNS

## Changes

- Added `scatterDatasetsFromData()` with one source per series, preserving input coordinate order and values while measuring labels; retained the existing category dataset path.
- Configured scatter series with `type: "scatter"`, per-series `datasetIndex`, and `{ x: 0, y: 1 }` encoding. Both axes use value scales.
- Routed scatter through basic ECharts options and exposed it in the Builder selector and validation values.
- Added scatter-specific editor expectations and a numeric sample for new series. Existing values are not rewritten when chart type changes.
- Added English and Simplified Chinese selector labels.

## TDD Evidence

Red command:

```sh
yarn g:jest src/widgets/ChartWidget/component/EChartsDatasetBuilder.test.ts src/widgets/ChartWidget/component/EChartsConfigurationBuilder.test.ts src/widgets/ChartWidget/component/helpers.test.ts src/widgets/ChartWidget/widget/propertyConfig.test.ts src/components/propertyControls/ChartDataControl.test.tsx
```

Initial result: 5 suites failed, 9 tests failed and 47 passed. Failures showed the missing scatter dataset method, category axes/series, absent basic-chart routing and selector entry, and the unchanged column default in the editor. Two initial editor/category fixture assertions were corrected to model the existing lazy editor and category-key behavior.

Green command (same focused suite):

```sh
yarn g:jest src/components/propertyControls/ChartDataControl.test.tsx src/widgets/ChartWidget/component/EChartsDatasetBuilder.test.ts src/widgets/ChartWidget/component/EChartsConfigurationBuilder.test.ts src/widgets/ChartWidget/component/helpers.test.ts src/widgets/ChartWidget/widget/propertyConfig.test.ts
```

Result: 5 suites passed, 56 tests passed. Jest emitted the known `NO_COLOR`/`FORCE_COLOR` warning.

Parity command:

```sh
yarn g:jest src/i18n/resources/resourceParity.test.ts
```

Result: 1 suite passed, 7 tests passed.

Lint command:

```sh
yarn exec eslint src/components/propertyControls/ChartDataControl.tsx src/components/propertyControls/ChartDataControl.test.tsx src/widgets/ChartWidget/component/EChartsDatasetBuilder.ts src/widgets/ChartWidget/component/EChartsDatasetBuilder.test.ts src/widgets/ChartWidget/component/EChartsConfigurationBuilder.ts src/widgets/ChartWidget/component/EChartsConfigurationBuilder.test.ts src/widgets/ChartWidget/component/helpers.ts src/widgets/ChartWidget/component/helpers.test.ts src/widgets/ChartWidget/widget/propertyConfig.ts src/widgets/ChartWidget/widget/propertyConfig.test.ts
```

Result: exit code 0, no errors; 13 lint warnings remain, primarily existing performance/object-key warnings. The command also reports stale Browserslist data.

## Files

- `app/client/src/components/propertyControls/ChartDataControl.tsx`
- `app/client/src/components/propertyControls/ChartDataControl.test.tsx`
- `app/client/src/i18n/resources/en-US.ts`
- `app/client/src/i18n/resources/zh-CN.ts`
- `app/client/src/widgets/ChartWidget/component/EChartsConfigurationBuilder.ts`
- `app/client/src/widgets/ChartWidget/component/EChartsConfigurationBuilder.test.ts`
- `app/client/src/widgets/ChartWidget/component/EChartsDatasetBuilder.ts`
- `app/client/src/widgets/ChartWidget/component/EChartsDatasetBuilder.test.ts`
- `app/client/src/widgets/ChartWidget/component/helpers.ts`
- `app/client/src/widgets/ChartWidget/component/helpers.test.ts`
- `app/client/src/widgets/ChartWidget/widget/propertyConfig.ts`
- `app/client/src/widgets/ChartWidget/widget/propertyConfig.test.ts`

## Concern

The approved design also describes runtime rejection of invalid scatter points and error-overlay recovery. Those runtime validation/error-display behaviors were not part of the Task 2 brief and are not implemented here; coordinate values are passed through unchanged as requested.
