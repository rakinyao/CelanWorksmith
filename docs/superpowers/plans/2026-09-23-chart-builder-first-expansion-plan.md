# Chart Builder First Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add numeric scatter, stacked column, stacked bar, and stacked area Builder choices to ChartWidget without migrating chart data or changing existing charts.

**Architecture:** Retain category-aligned datasets for existing and stacked charts; build a separate ECharts dataset for each scatter series so repeated X values survive. Configure series and axes by chart type, validate scatter coordinates without changing the input, and retain the existing event contract and error display.

**Tech Stack:** React 17, TypeScript, Jest/Testing Library, ECharts 6.1.0, i18next.

## Global Constraints

- Keep `chartData` series and `{ x, y }` point shape, defaults, Custom ECharts iframe, Fusion Charts, event names, and existing DSL identifiers unchanged.
- Do not add combo charts, per-series chart types, themes, or stored data migration.
- Preserve numeric strings in scatter datasets; do not sort, deduplicate, filter, or coerce persisted data.
- Keep new UI text in English in code and provide both `en-US` and `zh-CN` i18n resources.
- Avoid edits to unrelated untracked `.superpowers/` and `ref/` files.
- Run commands from `app/client` unless stated otherwise; `yarn g:jest <path>` runs a focused Jest file.

---

### Task 1: Expose stacked Builder types and options

**Files:**
- Modify: `app/client/src/widgets/ChartWidget/constants.ts`
- Modify: `app/client/src/widgets/ChartWidget/widget/propertyConfig.ts`
- Modify: `app/client/src/widgets/ChartWidget/widget/propertyConfig.test.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/helpers.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/helpers.test.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/EChartsConfigurationBuilder.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/EChartsConfigurationBuilder.test.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/index.tsx`
- Modify: `app/client/src/widgets/ChartWidget/component/index.test.tsx`
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`

**Interfaces:**
- Produces: `ChartType` values `STACKED_COLUMN_CHART`, `STACKED_BAR_CHART`, `STACKED_AREA_CHART`; `isBasicEChart` recognizes them; the configuration builder maps stacked types to shared `stack: "total"` ECharts series.

- [ ] **Step 1: Write failing tests.** In `propertyConfig.test.ts`, read the `chartType` control from `contentConfig()` and assert each of the three stacked values appears in both `options` and `validation.params.allowedValues`. In `helpers.test.ts`, assert `isBasicEChart` returns true for the three stacked types and remains false for Custom ECharts. In `EChartsConfigurationBuilder.test.ts`, call `prepareEChartConfig({ ...defaultProps, chartType: type }, chartData, longestLabels)` and assert both series have `stack: "total"`, with `type: "bar"` for stacked column/bar, `type: "line"` and `areaStyle: {}` for stacked area. Assert stacked bar's Y axis is `category`, X axis `value`, label position `right`; the other stacked types retain category X and value Y. Keep the existing default configuration snapshot unchanged. In `component/index.test.tsx`, rerender a mounted column chart as stacked column then stacked bar and assert the rendered options use the newly selected type each time.
- [ ] **Step 2: Confirm red.** Run `yarn g:jest src/widgets/ChartWidget/widget/propertyConfig.test.ts src/widgets/ChartWidget/component/helpers.test.ts src/widgets/ChartWidget/component/EChartsConfigurationBuilder.test.ts src/widgets/ChartWidget/component/index.test.tsx`; expect new assertions to fail on unrecognized types, absent stacking, or stale type after switching.
- [ ] **Step 3: Add literal stacked type values and labels.** Extend `ChartType`, type selector and allowed values; put new labels under `widgetProperty.chart` in `en-US.ts`/`zh-CN.ts` and call `i18n.t` from the selector's runtime factory. Include stacked column and stacked area in `LABEL_ORIENTATION_COMPATIBLE_CHARTS`. Keep the old type labels and identifiers unchanged.
- [ ] **Step 4: Implement stacked series and axis mapping.** In `EChartsConfigurationBuilder`, share bar behavior for `BAR_CHART`/`STACKED_BAR_CHART`, column behavior for `COLUMN_CHART`/`STACKED_COLUMN_CHART`, and area behavior for `AREA_CHART`/`STACKED_AREA_CHART`; add `stack: "total"` only for stacked types. Match stacked bar in `#xAxisConfig`, `#yAxisConfig`, `#configForLabelOrientation` and adaptive-min handling. Match stacked bar in `labelKeyForChart`. In `ChartComponent.componentDidUpdate`, if props type differs from active type, switch state and reset cached options/error even when both types are basic; preserve Custom/Fusion transitions and avoid repeated setState for the same type.
- [ ] **Step 5: Verify green and commit.** Run the four focused files above plus `yarn g:jest src/i18n/resources/resourceParity.test.ts`. Stage only the listed ChartWidget files and resource files; commit `feat(chart): add stacked builder choices`.

### Task 2: Build independent scatter datasets and configuration

**Files:**
- Modify: `app/client/src/widgets/ChartWidget/component/EChartsDatasetBuilder.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/EChartsDatasetBuilder.test.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/EChartsConfigurationBuilder.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/EChartsConfigurationBuilder.test.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/helpers.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/helpers.test.ts`
- Modify: `app/client/src/widgets/ChartWidget/widget/propertyConfig.ts`
- Modify: `app/client/src/widgets/ChartWidget/widget/propertyConfig.test.ts`
- Modify: `app/client/src/components/propertyControls/ChartDataControl.tsx`
- Create: `app/client/src/components/propertyControls/ChartDataControl.test.tsx`
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`

**Interfaces:**
- Produces: `EChartsDatasetBuilder.scatterDatasetsFromData(): Array<{ source: Array<[number | string, number | string]> }>` in object-key series order. `getBasicEChartOptions(props)` sets `dataset` to that array for scatter and keeps the old dataset object for other types. Scatter series use `datasetIndex: index` and `encode: { x: 0, y: 1 }`; selector and `isBasicEChart` enable `SCATTER_CHART` together.

- [ ] **Step 1: Write failing dataset tests.** For two series with points `{x:"123",y:"-1.5"}`, `{x:"123",y:2}`, `{x:0,y:4}`, require three unchanged, ordered pairs in the first dataset and a separate source for the second; compare input before/after to prove no mutation. Check `longestDataLabels()` reflects both scatter coordinates after dataset construction. Assert ordinary `datasetFromData()` still produces the category-aligned object.
- [ ] **Step 2: Write failing option tests.** Assert scatter configuration has X and Y `type: "value"` and one `{type:"scatter",datasetIndex,encode}` per series, retaining names/colors/labels and other layout options. Assert `getBasicEChartOptions(scatterProps).dataset` contains one source per series and existing column options remain unchanged. In `propertyConfig.test.ts`, assert `SCATTER_CHART` appears in selector options and allowed values; in `helpers.test.ts`, assert it is basic ECharts.
- [ ] **Step 3: Write failing data-editor tests.** In `ChartDataControl.test.tsx`, mock the nested code editor and inspect `expected`: when `widgetProperties.chartType === "SCATTER_CHART"`, example pairs use numeric X/Y, while for column X remains `"Mon"`; exercise `addOption` to assert a newly added scatter series starts with numeric X and column retains the existing `"label"` default. Switching types must never invoke `updateProperty` for an existing series.
- [ ] **Step 4: Confirm red.** Run `yarn g:jest src/widgets/ChartWidget/component/EChartsDatasetBuilder.test.ts src/widgets/ChartWidget/component/EChartsConfigurationBuilder.test.ts src/widgets/ChartWidget/component/helpers.test.ts src/widgets/ChartWidget/widget/propertyConfig.test.ts src/components/propertyControls/ChartDataControl.test.tsx`.
- [ ] **Step 5: Implement the scatter branch.** Add `scatterDatasetsFromData` iterating series and points without category map, retaining each original `[x,y]` pair and updating label lengths. Set scatter axes to `value`, series `type` to `scatter`, and per-series dataset index and encode; branch in `getBasicEChartOptions` to use scatter datasets. Add `SCATTER_CHART` to `isBasicEChart`, selector options and allowed values together. Do not change non-scatter dataset output or Custom ECharts options. In `ChartDataControl`, choose scatter-specific numeric coordinate example and new-series default `[{x:0,y:50}]` only when `widgetProperties.chartType` is scatter; keep other examples/defaults. Put any new visible label or hint under `widgetProperty.chart` in both i18n resources.
- [ ] **Step 6: Verify and commit.** Re-run the five focused test files and `yarn g:jest src/i18n/resources/resourceParity.test.ts`; commit only listed files as `feat(chart): build numeric scatter datasets`.

### Task 3: Validate scatter only and preserve click/type-switch behavior

**Files:**
- Create: `app/client/src/widgets/ChartWidget/widget/scatterValidation.ts`
- Create: `app/client/src/widgets/ChartWidget/widget/scatterValidation.test.ts`
- Modify: `app/client/src/widgets/ChartWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/ChartWidget/widget/ChartsRendered.test.tsx`
- Modify: `app/client/src/widgets/ChartWidget/component/helpers.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/helpers.test.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/index.tsx`
- Modify: `app/client/src/widgets/ChartWidget/component/index.test.tsx`
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`

**Interfaces:**
- Produces: `findInvalidScatterCoordinate(chartData: AllChartData): { series: string; point: number; axis: "x" | "y" } | undefined` (series name or 1-based series index, 1-based point index). Called only when `chartType === "SCATTER_CHART"`; returns the first invalid coordinate.

- [ ] **Step 1: Write failing validation tests.** Accept finite numbers and numeric strings including trimmed strings, negatives, decimals, and `"0"`. Reject `""`, whitespace, `"Mon"`, `"Infinity"`, actual `Infinity`, `NaN`, null, or missing X/Y; assert returned series, point index, and axis, and unchanged input. If dynamic values include an unexpected object, treat it as invalid rather than throwing.
- [ ] **Step 2: Write failing widget and event tests.** In `ChartsRendered.test.tsx`, selecting scatter with a text X shows `ChartErrorComponent` with series/point/axis and does not change `chartData`; switching back to a category type removes the error; empty series still use `EmptyChartData`. In `helpers.test.ts`, a scatter click with ECharts `evt.data: [123, 4]` returns `{ x: 123, y: 4, seriesTitle: evt.seriesName }`, while category click extraction remains unchanged. In `component/index.test.tsx`, rerender a mounted basic chart from column to scatter to stacked bar and assert the Task 1 type-switch fix also handles scatter.
- [ ] **Step 3: Confirm red.** Run `yarn g:jest src/widgets/ChartWidget/widget/scatterValidation.test.ts src/widgets/ChartWidget/widget/ChartsRendered.test.tsx src/widgets/ChartWidget/component/helpers.test.ts src/widgets/ChartWidget/component/index.test.tsx`.
- [ ] **Step 4: Implement finite-coordinate validation.** Accept only `typeof value === "number"` or a nonempty numeric string for which `Number(value)` is finite; do not modify the value. Check each evaluated point, X then Y. In `ChartWidget.getWidgetView`, after syntax errors and empty-data handling, display the existing `ChartErrorComponent` with `new Error(i18n.t("widgetProperty.chart.scatterInvalidCoordinate", { series, point, axis }))` when scatter is invalid; add localized English/Chinese error strings to the two resource files. Do not change the normal property validator for category charts.
- [ ] **Step 5: Implement scatter event handling.** In `parseOnDataPointClickParams`, route scatter to a handler that uses the clicked pair (`evt.data` or ECharts `evt.value`) and `evt.seriesName`, preserving the public `ChartSelectedDataPoint` shape; do not change category parsing. Retain the Task 1 basic-chart type-switch behavior.
- [ ] **Step 6: Verify and commit.** Re-run the four focused files and `yarn g:jest src/i18n/resources/resourceParity.test.ts`. Commit listed files as `feat(chart): validate scatter points and preserve events`.

### Task 4: Focused regression and manual acceptance

**Files:**
- Verify: `app/client/src/widgets/ChartWidget/**`
- Verify: `app/client/src/i18n/resources/resourceParity.test.ts`

**Interfaces:**
- Consumes: Tasks 1-3; produces test and acceptance evidence, no new persisted contract.

- [ ] **Step 1: Run ChartWidget tests.** From `app/client`, run `yarn g:jest src/widgets/ChartWidget`; expect every ChartWidget test to pass, including old charts and Custom ECharts tests.
- [ ] **Step 2: Check type and style consistency.** Run `yarn g:jest src/i18n/resources/resourceParity.test.ts`, `yarn check-types`, and `yarn exec prettier --check` on each modified `.ts`/`.tsx` resource and ChartWidget file; record any unrelated failures separately.
- [ ] **Step 3: Manual acceptance.** In the editor, select an existing text-X category chart, switch to scatter, confirm series/point/axis error and unchanged data; replace X with numeric strings and confirm points, repeated X, and click payload; switch back and confirm original category data. Verify multiple-series stacked column, bar, and area orientation, totals, legend, and click payload. Verify existing Custom ECharts chart still renders.
- [ ] **Step 4: Record evidence.** Report exact tests and manual results to the user; do not claim browser acceptance if a running editor is unavailable. If verification requires fixes, add a failing regression test before modifying code and re-run the affected checks.
