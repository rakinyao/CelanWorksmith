# Function maxItems Metadata Propagation

Date: 2026-09-10

## Root Cause

`ONTOLOGY_FUNCTIONS` built generic dropdown metadata and discarded
`FunctionMetadata.maxItems`. `function-query.json` therefore supplied a static
`maxItems: 1000` to the capability target control, enabling many-target UI for
single-target Functions.

## Change

- The plugin emits a positive `maxItems` on every Function dropdown option,
  using one when snapshot metadata is absent or non-positive.
- The Function target resource declares the existing Function selector as its
  metadata source and has a conservative static fallback of one.
- The connected target control reads the selected Function option from the
  native `evaluations.triggers[actionId]` dropdown cache. A missing, malformed,
  or non-positive value resolves to one; Action controls remain static one.
- No metadata is copied into form data, the advanced definition, or the action
  execution payload.

## TDD Evidence

RED:

```text
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am \
  -Dtest=OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test

OntologyFunctionLinkActionExecutorTest.exposesPositiveFunctionTargetBoundsFromThePinnedSnapshot
expected: <1> but was: <null>

yarn g:jest src/components/formControls/CapabilityTargetBindingControl.test.tsx \
  src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts

Function resource expected maxItems: 1 and a Function metadata source; received maxItems: 1000.
Connected control exposed many-target UI for one, missing, and invalid metadata.
```

GREEN:

```text
cd app/server && mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am \
  -Dtest=OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
# exit 0

cd app/client && yarn g:jest \
  src/components/formControls/CapabilityTargetBindingControl.test.tsx \
  src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts
# 2 suites passed, 50 tests passed

git diff --check
# exit 0
```

## Residual Verification Note

The broader Maven invocation also including `OntologyConfigurationTest` has
four unrelated existing failures involving capability advanced definitions,
projection selectors, and a Function editor child index. They do not involve
the trigger mapper or target control changes above; the focused trigger suite
passes.
