# Full Ontology Widget Compatibility Verification

日期：2026-08-09  
范围：B0-B6 第二阶段检查点

## 自动化验证

- 综合本体兼容回归：52 suites / 299 tests passed。
- B5 visualization regression：6 suites / 80 tests passed。
- B6 DataTree、autocomplete、PostEvaluation、controls：7 suites / 41 tests passed。
- Changed-file Prettier check：passed。
- `git diff --check`：passed。
- `yarn check-types`：failed on repository-wide pre-existing dependency/JSX/WDS/worker type errors; no completion claim is based on this command.

## 覆盖范围

- Object Binding normalization and validation.
- Metadata selectors and Object Type/Property controls.
- Table/TableV2, FilterList, List, Select, Dropdown, MultiSelect.
- ObjectDetail, JSONForm, Form/Input validation.
- Link queries and Action execution chain.
- Chart Object Property/Aggregation input.
- Progress single-object/Aggregation input.
- Statbox single-object/Aggregation-only input.
- DataTree metadata schema for empty and null-valued collections.
- Tern refresh after metadata, object lifecycle and variable updates.
- Query and legacy DSL isolation.

## Residual Boundaries

1. Object Custom EChart/Fusion Chart renders an explicit unsupported/type-mismatch state rather than consuming Object data.
2. Progress with more than one Object row requires an Aggregation Variable; it never chooses an arbitrary row.
3. Browser acceptance for empty-set autocomplete and the new visualization property panes remains a manual gate.
4. Existing React DOM property, `act`, component key and design-system warnings remain outside this phase.

## Manual Acceptance Checklist

1. Create a new Chart, Progress and Statbox; confirm Object mode is the default.
2. Select `PurchaseOrder` and stable properties from the bilingual controls.
3. Bind Chart to `supplierName`/`delayDays` and confirm rows become chart points.
4. Bind Progress to a single numeric property and confirm multiple rows require aggregation.
5. Create an aggregation variable and bind Chart/Progress/Statbox without an Object Type.
6. Switch each Widget to Query mode and confirm the native Query path remains unchanged.
7. Clear runtime rows and confirm metadata-based property completion remains available.
8. Trigger metadata/runtime failure and confirm retry, error classification and stable IDs.

