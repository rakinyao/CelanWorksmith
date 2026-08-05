# T6.2 FilterList Widget Implementation Plan

## Goal

Add a registered Object-aware `FilterList` Widget that selects an Object Type,
generates safe filters from its metadata, and exposes a structured filter
result for downstream object-aware widgets.

## Requirements

- Create an independent `app/client/src/widgets/FilterListWidget/` module.
- Use existing object metadata from Redux selectors; the Widget must not call
  `CelanworksmithAPI` directly and must not construct URL or SQL strings.
- Support one selected Object Type and filters for metadata properties of type
  `STRING`, `INTEGER`, `DECIMAL`, `DATETIME`, and `BOOLEAN`.
- Use only these operators: `equals`, `contains`, `startsWith`, `gt`, `gte`,
  `lt`, `lte`, and `isEmpty`, with operator/type compatibility enforced by a
  pure helper.
- Expose `filter`, `objectTypeId`, and `isValid` as widget meta properties;
  `filter` must be a JSON-compatible object containing `typeId`, `conditions`,
  and `version: 1`.
- Provide reset behavior, empty-condition behavior, loading/metadata-error
  states, and an invalid-condition message without issuing a request.
- Register the Widget in the existing lazy loader with defaults, property pane,
  autocomplete definitions, icon/thumbnail, and DSL version `1`.
- Preserve existing native Widget behavior and keep all user-entered values in
  widget properties rather than overwriting them during metadata refresh.
- Add focused tests for helper validation, rendering/defaults, registration,
  metadata states, reset, and the exact structured output.

## Verification

Run focused Jest suites for the helper and Widget, then run Prettier, ESLint,
and `git diff --check` on changed files. Record results in
`docs/superpowers/verification/2026-08-05-t6-2-filter-list-verification.md`.

## Task 1: Implement FilterList Widget

Implement the complete module, including the pure filter helper, component,
Widget class, registration, assets, and focused tests. Use the requirements
above verbatim and commit the task as one isolated change.
