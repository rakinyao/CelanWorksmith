# T6.3 ActionButton Widget Implementation Plan

## Goal

Add a registered Object-aware `ActionButton` Widget that maps one bound object
and optional parameter JSON to an existing CelanWorksmith Action, executes it
through the T5 Redux/Saga chain, and exposes observable execution state.

## Requirements

- Create an independent `app/client/src/widgets/ActionButtonWidget/` module.
- Use ontology metadata from Redux to offer Action Type selection. The Widget
  must not call `CelanworksmithAPI` directly.
- Accept one object binding (`objectData`) and a JSON-compatible parameter
  binding (`parameters`); derive `objectTypeId` and `objectId` only from the
  normalized bound object and reject missing/invalid identity before dispatch.
- Dispatch existing `celanworksmithActionRun` with the selected Action ID and
  `{ objectTypeId, objectId, parameters }`; do not duplicate execution Saga,
  retry, timeout, or refresh logic.
- Render idle, disabled/invalid, queued/running, succeeded, and failed states.
  A failed Action must preserve the previous success result and must not show
  a success state or fake refresh.
- Expose `executionStatus`, `lastResult`, `lastError`, and `requestId` through
  widget meta properties. The success refresh is supplied by the existing T5
  execution Saga via changed object types.
- Provide property pane, defaults, autocomplete definitions, icon/thumbnail,
  lazy loader registration, and DSL version `1` without changing native Button
  behavior.
- Add focused tests for parameter mapping/identity validation, action dispatch,
  execution states, failure rendering, registration, and defaults.

## Verification

Run focused Jest suites for the helper and Widget, then Prettier, ESLint, and
`git diff --check` on changed files. Record results in
`docs/superpowers/verification/2026-08-05-t6-3-action-button-verification.md`.

## Task 1: Implement ActionButton Widget

Implement the complete module and tests as one isolated commit. Keep the
write scope to the new Widget, its lazy registration, and verification record.
