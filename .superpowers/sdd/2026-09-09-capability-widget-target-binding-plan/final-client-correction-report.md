# Final Client Target-Binding Correction

## Scope

This correction is limited to the client adapter/editor and focused tests. It
does not change the server execution or validation boundary.

## Corrections

- A Table with a positive `maxItems > 1` now exposes both compatible bindings:
  `ONE` from `selectedRow` and `MANY` from `selectedRows.map(...)`.
- Table canonical properties use bracket notation with JSON string escaping,
  for example `row["contract-id"]`, so canonical keys are not required to be
  JavaScript identifiers.
- The target picker preserves the stable widget ID and adds a cardinality-
  specific choice when a widget has more than one compatible adapter.
- Manual Function targets expose an explicit `ONE`/`MANY` selector when the
  bound allows many. Action resources continue to use `maxItems: 1`, so they
  have no many-target choice. The selected cardinality remains in Builder
  metadata and is consumed by the existing canonical serializer.
- Existing singular adapter callers remain supported through
  `buildWidgetTargetBinding`; new picker code uses
  `buildWidgetTargetBindings` to retain all compatible choices.

## Dynamic Function Bounds

The current client cannot resolve a Function-specific `maxItems` from existing
evaluation metadata. The `ONTOLOGY_FUNCTIONS` trigger entries currently expose
label/value/data type and read-only metadata, but no bound. The editor resource
therefore supplies a static `maxItems: 1000` for Function targets, while the
server snapshot remains authoritative at execution time.

Supporting dynamic bounds requires a cross-layer interface, which is deferred
here because this task must not alter the server:

1. `ONTOLOGY_FUNCTIONS` metadata must include a positive integer `maxItems`
   sourced from the selected release capability (and preserve it in the
   selected dropdown option, rather than only label/value).
2. The editor must resolve the selected Function option metadata and pass that
   number to `CapabilityTargetBindingControl`; a static JSON `maxItems` cannot
   express this dependency. Action controls can continue to pass `1`.
3. If the metadata is absent or invalid, the editor should retain a conservative
   one-target/manual path and leave count/type validation to the server.

No client-side provenance or ontology-specific Widget public state is added by
this correction.

## Verification

RED was observed before implementation: the new adapter API was missing, the
picker exposed only one Table option, and manual cardinality was unavailable.

Passing focused checks:

```text
yarn g:jest src/PluginActionEditor/components/CapabilityTargetBinding/ontologyTargetWidgetAdapters.test.ts src/components/formControls/CapabilityTargetBindingControl.test.tsx
Test Suites: 2 passed, 2 total
Tests:       24 passed, 24 total

yarn g:jest src/PluginActionEditor/components/QueryModeSynchronizer/ontologyCapabilityQueryDefinition.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts src/entities/Action/actionProperties.test.ts
Test Suites: 3 passed, 3 total
Tests:       63 passed, 63 total
```

The focused Prettier check passes for the four changed client files after
formatting. The repository-wide Prettier command still reports pre-existing
warnings in unrelated form-control files.
