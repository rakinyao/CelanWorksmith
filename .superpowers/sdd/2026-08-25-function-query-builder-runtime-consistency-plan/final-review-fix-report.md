# Function Query Builder Final Review Fix Report

Date: 2026-08-25

## Scope

Addressed the four final-review findings for Function Query Builder only. Existing unstaged Java formatting changes in `OntologyPlugin`, the two plugin test files, and the Mongo runtime files were preserved and will not be staged by this change.

## Root Causes

1. Builder `QUERY_DYNAMIC_INPUT_TEXT` values arrive in the plugin as JSON strings after UQI unwrapping, while `copyFunctionParameters` accepted only maps.
2. Advanced-to-Builder used Advanced `functionId` as a metadata label before the Builder field had been updated and its selected-function metadata had refreshed.
3. Function parameter metadata returned hidden fields, unlike object property metadata.
4. Function definitions accepted extra canonical root fields and the shared parameter validator accepted read-only and derived fields while also requiring them when marked required.

## RED Evidence

After correcting a test-fixture parenthesis, the focused failures were observed before production changes:

- `yarn jest src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts --runInBand`
  - Failed the retained-Builder-ID and no-retained-ID Advanced-to-Builder Function hydration cases. The synchronizer reverted to Advanced instead of first setting the parsed Function ID.
- `mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=OntologyFunctionLinkActionExecutorTest,OntologyActionConfigurationTest -Dsurefire.failIfNoSpecifiedTests=false test`
  - Failed Builder UQI JSON-string configuration/execution, hidden Function metadata exclusion, Advanced unknown/read-only/derived parameter validation, writable-required semantics, and canonical Function root-field validation.

The plan's `yarn test` command invokes the repository Cypress script in this checkout and failed before Jest ran because the cached Cypress binary does not support its smoke-test arguments. Direct Jest was used for the focused unit suites.

## GREEN Evidence

- `yarn jest src/PluginActionEditor/components/QueryModeSynchronizer/ontologyFunctionQueryDefinition.test.ts src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts --runInBand`
  - Passed: 2 suites, 35 tests.
- `yarn exec prettier --check src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.tsx src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts`
  - Passed.
- `mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin,appsmith-server -am -Dtest=OntologyFunctionLinkActionExecutorTest,OntologyActionConfigurationTest,MongoRuntimeDataProviderTest -Dsurefire.failIfNoSpecifiedTests=false test`
  - Passed: `OntologyActionConfigurationTest` 28 tests, `OntologyFunctionLinkActionExecutorTest` 21 tests, and `MongoRuntimeDataProviderTest` 21 tests.
  - Existing JVM/SLF4J warning output was present; no test failures or errors occurred.

## Files

- `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.tsx`
- `app/client/src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts`
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java`
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyQueryValidator.java`
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyActionConfigurationTest.java`
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java`

## Self-Review

- Builder parsing accepts only JSON objects and leaves Advanced definitions authoritative.
- Function metadata is constructed only for the actual Builder `functionId`; mode switching writes the parsed Advanced ID, waits for an evaluation-state refresh, then validates and hydrates parameters.
- Hidden parameters are omitted from dynamic metadata and remain rejected by the shared validator. Read-only and derived parameters are rejected when supplied and excluded from required-input checks.
- Function definitions contain only `functionId` and `parameters`; legacy non-Advanced Function queries normalize absent parameters to an empty map so the native execution path remains intact.
- No Function Widget, alternate Redux/Saga state, or non-native execution path was added.
