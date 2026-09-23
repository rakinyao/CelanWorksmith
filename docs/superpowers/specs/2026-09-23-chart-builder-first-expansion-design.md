# Chart Builder First Expansion Design

## Scope

Extend the existing ChartWidget Builder with four choices: numeric scatter, stacked column, stacked bar, and stacked area. Keep the existing `chartData` series and `{ x, y }` point shape, the Custom ECharts iframe, Fusion Charts, event identifiers, and existing chart defaults unchanged. Combo charts, per-series type controls, themes, and migration of stored widget data are out of scope.

## Data and Rendering

Stacked column, bar, and area charts continue to use the existing category-aligned dataset and configuration builders. Their ECharts series respectively use `bar`, horizontal `bar`, and `line` with `areaStyle`; all series of the selected chart share one `stack` key. Stacking is scoped to one chart and requires at least two series to be visually distinguishable from the corresponding unstacked chart. Axis orientation, legend, title, colors, scrolling, and point labels follow the corresponding existing column, bar, or area behavior.

Scatter uses two `value` axes and a separate dataset construction path: one ordered `[x, y]` pair per input point, per series, without category aggregation, sorting, deduplication, or filling missing values. Numeric X/Y values and numeric strings such as `"123"` or `" 123 "` are forwarded unchanged; ECharts 6 performs numeric conversion for rendering. The Builder does not rewrite the evaluated data or persisted `chartData`. Its data editor describes scatter's numeric-coordinate expectation without replacing existing values on chart-type changes.

Scatter checks each evaluated point before rendering. A missing, empty, nonnumeric, or non-finite X/Y yields a specific chart-data error identifying the series and point index; it does not silently discard that point or overwrite the source. This check is limited to scatter, so switching back to a category chart retains the original data and existing category-chart validation. The rendered ECharts error overlay should clear when the data becomes valid or the user changes chart type. Empty series continue to use the existing empty-data state. Reuse the ChartWidget's error display and route any new user-visible copy through i18n; keep persisted chart types and event/DSL names in English.

## Interaction and Compatibility

Expose the four chart types in the existing property-pane type selector and its allowed-value validation. Add them to the basic ECharts branch; switching between any basic chart types must update the active type and redraw without remounting the widget. Preserve `selectedDataPoint` and `onDataPointClick`: for stacked charts the existing dataset row and series index identify the original point; for scatter, the clicked pair and series name identify its actual numeric coordinates. No new public event or persisted series property is introduced.

## Verification

Focused tests cover type selection and validation; multiple scatter series, repeated X values, stringified numbers, negative/decimal values, and non-finite/invalid points; stacked series `stack` keys and the three render variants; X/Y value-axis configuration; clicking points in scatter and stacked charts; basic-to-basic type switches and recovery after invalid scatter input. Run the ChartWidget test suite and client type/format checks appropriate to the affected files. Manual acceptance: switch an existing category chart with text X values to scatter, see an actionable error without data loss, correct X values to numeric strings, verify points and click payload, then switch back; also check stacked column, bar, and area with multiple series.
