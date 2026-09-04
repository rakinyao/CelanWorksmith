# Task 5 Report: Release JSON Import Form And Localization

## Scope

Implemented the client-side `LOCAL_RELEASE_JSON` ontology datasource import
flow. Legacy Demo, Local YAML, and Platform Release behavior remains intact.

## Changes

- Extended `OntologyDatasourceSource` with `LOCAL_RELEASE_JSON`.
- Added a localized Local Release JSON source option and JSON file input.
- Added `.json,application/json` file acceptance and required-file validation.
- JSON imports read only the selected JSON file bytes as `metadata`.
- Runtime provider ID validation and request forwarding remain limited to
  Local YAML; the provider control is hidden for JSON imports.
- Source changes clear both file selections and validation state, preventing
  stale metadata from being submitted after switching source.
- Added English and Chinese copy for the source, file validation, and managed
  binding/runtime asset diagnostics.
- Added a focused UI regression test for JSON upload request shape and hidden
  provider control.

## Verification

`git diff --check` passed.

The requested focused test command could not run in this checkout. `pnpm`
refused because the project declares Yarn as its package manager, and `yarn
test OntologyDatasourceImport.test.tsx --runInBand` reported that the
`node_modules` state file is missing. No test result is claimed without the
required client dependencies.
