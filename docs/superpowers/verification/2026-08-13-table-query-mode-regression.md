# Table Query Mode Regression Fix

Date: 2026-08-13

## Symptom

- A `TABLE_WIDGET_V2` could display `PurchaseOrder` in Object mode.
- After switching to Query mode and binding `{{$objects.PurchaseOrder.all}}`, the table blinked without rows and the Query column configuration was unavailable or unusable.

## Root Cause

Object mode persisted `primaryColumns` with `computedValue` expressions using `currentRow` directly. That identifier is valid only while rendering an Object-mode cell. Query mode evaluates `primaryColumns.*.computedValue` in the normal DataTree context, where `currentRow` is undefined. The evaluation error prevented the native Query table from completing its normal render/update cycle.

The persisted Object columns also lacked the native Table V2 `originalId` and `alias` fields. The native Query schema reconciliation uses `originalId`, so these columns could not reliably be recognized after a mode switch.

## Resolution

- Object mode now creates the same array-valued `processedTableData.map(...)` computed-value contract as native Table V2 columns.
- Object columns now include `originalId` and `alias`.
- When an Object-mode table is opened, identifiable legacy `{{currentRow[... ]}}` column bindings are upgraded in place.
- The upgrade preserves user-authored label, width, visibility, and any non-legacy custom computed-value expression.
- No new data loading, reducer, saga, or query path was introduced. Explicit Query mode still renders through the native `TableWidgetV2` path.

## Automated Evidence

- `src/widgets/TableWidget/widget/objectTableUtils.test.ts`: 7 passed.
- `src/widgets/TableWidget/component/ObjectTableMode.test.tsx`: 12 passed.
- Prettier check for changed files: passed.
- `git diff --check`: passed.

## Environment Note

The development host encountered OOM termination while webpack and multiple Jest jobs ran concurrently. The frontend was restarted with no concurrent test jobs; webpack completed with two pre-existing warnings and the LAN entry `http://10.10.110.129/` returned HTTP 200. Keep Table regression verification serial while the host has limited swap headroom.

## Manual Retest

1. Create or open an App bound to `celanworksmith-demo:1.0.0`.
2. Drag in a Table, choose Object mode and select `PurchaseOrder`.
3. Switch to Query mode, expand `Data`, and enter `{{$objects.PurchaseOrder.all}}` in JS mode.
4. Confirm the native formatted table shows rows, the `Columns` control lists the fields, and the canvas no longer flickers.
