# ChartWidget Combo Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared-Y-axis combination chart to ChartWidget Builder with independently selectable bar/line series and no migration of saved chart data.

**Architecture:** Keep ChartWidget's category-aligned dataset, axes, layout and event parsing; use `seriesType?: "bar" | "line"` only when `chartType === "COMBO_CHART"`. The series editor writes the field on explicit selection and new-series creation; the Widget validates explicit invalid values only in combo mode before rendering.

**Tech Stack:** React 17, TypeScript, Jest/Testing Library, ECharts 6.1.0, i18next, `@appsmith/ads` Select/Option.

## Global Constraints

- Preserve existing `CHART_WIDGET`, persisted `chartData`, chart defaults, event identifiers, Custom ECharts and legacy Custom Fusion behavior. `COMBO_CHART` adds no migration or second Y axis.
- Missing `seriesType` renders as `bar`; accept explicit `bar` and `line` only in combo mode. Other chart types ignore it; never rewrite old series when changing chart type.
- Combo series do not stack. Retain existing category X, shared value Y, dataset, colors, title, legend, labels, scroll and click `{x,y,seriesTitle}` contract.
- Add user-facing English text only through `en-US`/`zh-CN` i18n resources; keep persisted IDs and event/DSL names untranslated.
- At execution preflight, review and separately checkpoint the already manually verified, uncommitted ChartWidget localization changes in `widget/propertyConfig.ts`, its test, and both resources before Task 1; do not merge those older hunks into a combo-feature commit or stage unrelated untracked `.superpowers/` or `ref/` paths.
- Commands run from `app/client` unless specified. `yarn g:jest` already sets worker limits; do not append `--runInBand`.

---

### Task 1: Expose combo type and build mixed ECharts series

**Files:**
- Modify: `app/client/src/widgets/ChartWidget/constants.ts`
- Modify: `app/client/src/widgets/ChartWidget/widget/propertyConfig.ts`
- Modify: `app/client/src/widgets/ChartWidget/widget/propertyConfig.test.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/helpers.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/helpers.test.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/EChartsConfigurationBuilder.ts`
- Modify: `app/client/src/widgets/ChartWidget/component/EChartsConfigurationBuilder.test.ts`
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`

**Interfaces:**
- Produces `ChartType` member `COMBO_CHART`; optional `ChartData.seriesType?: "bar" | "line"`; `isBasicEChart("COMBO_CHART") === true`. Existing `getBasicEChartOptions` uses its category dataset unchanged. `prepareEChartConfig()` outputs `type: seriesData.seriesType ?? "bar"` for combo series only; no combo `stack`.

- [ ] **Step 1: Add red type/selector tests.** In `propertyConfig.test.ts`, locate the `chartType` entry in `contentConfig()` and assert `options` and `validation.params.allowedValues` contain `COMBO_CHART`; assert a Chinese-locale options call labels it `组合图`, restoring the previous locale afterward. In `helpers.test.ts`, assert `isBasicEChart("COMBO_CHART")` is true and `getBasicEChartOptions` retains the category dataset source with separate series IDs. Existing Fusion must remain hidden from choices but accepted as a saved value.
- [ ] **Step 2: Add red ECharts builder tests.** With `chartData = {first:{data:[{x:"Mon",y:3}]},second:{seriesType:"line",data:[{x:"Mon",y:4}]}}` and `chartType: "COMBO_CHART"`, expect `series.map(s => s.type)` to be `["bar","line"]`, no `stack` on either series, `xAxis.type === "category"`, `yAxis.type === "value"`, and old color/name/label settings retained. Test both explicitly `bar`/`line` and absent types, and assert a `LINE_CHART` ignores stored `seriesType` (both lines). Verify `parseOnDataPointClickParams({data:["Mon",3,4],seriesIndex:1,seriesName:"Costs"},"COMBO_CHART")` returns `{x:"Mon",y:4,seriesTitle:"Costs"}` without a new event shape.
- [ ] **Step 3: Verify RED.** Run `yarn g:jest src/widgets/ChartWidget/widget/propertyConfig.test.ts src/widgets/ChartWidget/component/helpers.test.ts src/widgets/ChartWidget/component/EChartsConfigurationBuilder.test.ts`. Expected: combo is not a selectable/basic type, and its series have no ECharts bar/line configuration.
- [ ] **Step 4: Implement.** Extend `ChartType` and `ChartData` in `constants.ts`, append combo to selector and `allowedValues`, `LABEL_ORIENTATION_COMPATIBLE_CHARTS`, and `isBasicEChart`; add localized option labels under `widgetProperty.chart.comboChart` in both resources. In `#seriesConfigForChart`, add a combo branch that sets `config.type = seriesData.seriesType ?? "bar"`; only stacked chart types get `stack`. For combo alone set `#yAxisConfig` to `type: "value"`; keep the existing X axis and category dataset branches unchanged.
- [ ] **Step 5: Verify and commit.** Re-run the three focused Jest files and `yarn g:jest src/i18n/resources/resourceParity.test.ts`. Stage only this task's listed files after the preflight localization checkpoint; commit `feat(chart): render shared-axis combo series`.

### Task 2: Edit per-series type only for combination charts

**Files:**
- Modify: `app/client/src/components/propertyControls/ChartDataControl.tsx`
- Modify: `app/client/src/components/propertyControls/ChartDataControl.test.tsx`
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`

**Interfaces:**
- Consumes `ChartData.seriesType?: "bar" | "line"` and `COMBO_CHART` from Task 1. The existing `updateOption(seriesId, "seriesType", value)` writes only when a user selects a type. In combo mode `addOption()` creates `{ seriesName: "", data: JSON.stringify([{x:"label",y:50}]), seriesType: "bar" }`; other modes retain their exact prior defaults.

- [ ] **Step 1: Write failing UI tests.** In `ChartDataControl.test.tsx`, render with `chartType: "COMBO_CHART"`, one existing series without `seriesType`, and a second with `seriesType: "line"`. Assert the two selectors display `Bar` and `Line` respectively and changing the first selector to `Line` calls `onPropertyChange` for only `chartData.<firstId>.seriesType` with value `line`. On rerender as `COLUMN_CHART`, selectors are absent and `onPropertyChange` is not called by the rerender; rerender back to combo and assert the original data has not been rewritten. Verify `Add series` stores `seriesType: "bar"` in combo mode and preserves column/scatter defaults outside combo.
- [ ] **Step 2: Verify RED.** Run `yarn g:jest src/components/propertyControls/ChartDataControl.test.tsx`. Expected: no per-series type selector; combo new series lacks `seriesType`.
- [ ] **Step 3: Implement the local editor.** Import the established `Select`/`Option` controls from `@appsmith/ads` (see `PrimaryColumnDropdownControl.tsx`); pass a boolean `isComboChart` to each `DataControlComponent`. Render the labeled dropdown only when it is true, with `value={item.seriesType ?? "bar"}`, options `{value:"bar",label:i18n.t("widgetProperty.chart.barSeries")}` and `{value:"line",label:i18n.t("widgetProperty.chart.lineSeries")}`, and `onSelect={(value?: string) => value && updateOption(index,"seriesType",value)}`. Use `i18n.t("widgetProperty.chart.seriesDisplayType")` for the label. In `addOption`, add `seriesType: "bar"` only for `COMBO_CHART`; do not update existing series during render/switch. Add the three new localized strings to both resources.
- [ ] **Step 4: Verify and commit.** Run `yarn g:jest src/components/propertyControls/ChartDataControl.test.tsx src/i18n/resources/resourceParity.test.ts`, plus format/lint of modified TypeScript. Stage only the four listed files; commit `feat(chart): edit combo series type`.

### Task 3: Report explicit invalid series types without data loss

**Files:**
- Create: `app/client/src/widgets/ChartWidget/widget/comboValidation.ts`
- Create: `app/client/src/widgets/ChartWidget/widget/comboValidation.test.ts`
- Modify: `app/client/src/widgets/ChartWidget/widget/index.tsx`
- Modify: `app/client/src/widgets/ChartWidget/widget/ChartsRendered.test.tsx`
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`

**Interfaces:**
- Produces `findInvalidComboSeries(chartData: AllChartData): { series: string } | undefined`. Traverse in object-key order; missing `seriesType` is valid; a defined value other than `"bar"` or `"line"` reports series name or its 1-based index. Widget calls it only for `COMBO_CHART` after loading/syntax/empty checks and renders the existing `ChartErrorComponent` with `i18n.t("widgetProperty.chart.comboInvalidSeriesType", {series})`.

- [ ] **Step 1: Write red pure-validator tests.** `findInvalidComboSeries({a:{seriesName:"Revenue",data:[]},b:{seriesName:"Costs",seriesType:"line",data:[]}})` returns undefined; with runtime input `b.seriesType = "area"` (cast the invalid fixture at the boundary) it returns `{series:"Costs"}`; with unnamed invalid first series it returns `{series:"1"}`. Assert the input remains unchanged and both valid explicit types pass.
- [ ] **Step 2: Write red widget-state tests.** In `ChartsRendered.test.tsx`, combo with `{seriesName:"Revenue",seriesType:"area",data:[{x:"Mon",y:4}]}` produces the ChartWidget error component containing `Revenue`; rerender the same widget with `COLUMN_CHART` and unchanged data, then the error disappears and data is unchanged. Combo without a `seriesType` renders normally; empty data still returns `EmptyChartData`; unrelated syntax errors retain precedence.
- [ ] **Step 3: Verify RED.** Run `yarn g:jest src/widgets/ChartWidget/widget/comboValidation.test.ts src/widgets/ChartWidget/widget/ChartsRendered.test.tsx`. Expected: the validator does not exist and combo invalid data renders silently.
- [ ] **Step 4: Implement minimal validation and localized message.** In `comboValidation.ts`, iterate `Object.values(chartData)` and return the first defined invalid `seriesType`; do not mutate or normalize. In `ChartWidget.getWidgetView`, add the combo-only guard after existing syntax and empty checks; use `ChartErrorComponent` and `i18n.t` for the message. Add `widgetProperty.chart.comboInvalidSeriesType` in English and Chinese. Do not constrain `chartData.seriesType` with unconditional global `allowedValues` validation, which would reject a stored value even for non-combo chart types.
- [ ] **Step 5: Verify and commit.** Re-run the validator and Widget tests plus locale parity. Stage only listed files; commit `feat(chart): validate combo series types`.

### Task 4: Full focused regression and editor acceptance

**Files:**
- Verify: `app/client/src/widgets/ChartWidget/**`
- Verify: `app/client/src/components/propertyControls/ChartDataControl.test.tsx`
- Verify: `app/client/src/i18n/resources/resourceParity.test.ts`

**Interfaces:**
- Consumes Tasks 1-3. Produces verification evidence, not a new runtime contract.

- [ ] **Step 1: Run the relevant suite.** From `app/client`, run `yarn g:jest src/widgets/ChartWidget src/components/propertyControls/ChartDataControl.test.tsx src/i18n/resources/resourceParity.test.ts`. Expect all ChartWidget, editor and resource tests to pass, including old Fusion and Custom ECharts paths.
- [ ] **Step 2: Check changed code.** Run Prettier and ESLint against the changed `.ts`/`.tsx` files; run `yarn check-types` and isolate any diagnostics newly introduced in changed files from the repository's existing baseline errors. Do not claim full typecheck passed if unrelated errors remain.
- [ ] **Step 3: Browser acceptance.** In the existing local editor, bind an existing multi-series category chart, switch to combo, confirm both legacy series default to bar without editing stored data, change one to line, save and reopen, verify shared Y, legend/color/axis and both click payloads; switch back to the original chart and confirm unchanged category data. Exercise an explicit invalid `seriesType` from bound data and confirm a recoverable error. If an editor/application session is unavailable, record manual acceptance as not run.
- [ ] **Step 4: Report.** Record exact automated and browser results and any remaining baseline limitations. If a regression is found, add a failing focused test before amending implementation; re-run its covering tests.

## Implementation Verification (2026-09-24)

- ChartWidget, ChartDataControl and locale parity regression: 18 suites, 178 tests passed.
- Prettier applied to changed TypeScript files. ESLint autofix cleared five errors; existing JSX performance/object-key warnings remain.
- Repository-wide `yarn check-types` remains failing (5,831 TypeScript errors, including pre-existing React/JSX and duplicate resource-key diagnostics); it is not a passing gate for this change.
- Browser acceptance was not run by the implementation agent. The user subsequently confirmed that the combination chart passed their manual verification; individual save/reopen, bound-data and invalid-series scenarios were not reported separately.
- ChartWidget phase closeout: keep the single shared Y axis. Do not expand ChartWidget themes in this phase; the current application-theme font inheritance and fixed axis-text colors are acceptable. Revisit dual axes or richer theming only for a concrete need.
