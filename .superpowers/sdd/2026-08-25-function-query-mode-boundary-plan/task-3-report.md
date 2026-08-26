# Task 3 Report: Compose Canonical Definitions Server-Side

Status: complete

Implemented server-side Function Query composition in
`OntologyActionConfiguration`: every Function Query requires the selected
`formData.functionId`; Builder and Advanced parameters are normalized to an
object; Advanced parameter-only JSON is parsed with `ObjectMapper`; and stale
or complete `definition` payloads are ignored. Semantic Function validation
continues through `OntologyQueryValidator`.

Updated configuration and executor tests for the selector-plus-parameters
contract. Verification details are recorded in
`docs/superpowers/verification/2026-08-25-function-query-mode-boundary.md`.

Tests passed:

- `yarn exec jest FunctionParametersControl ontologyFunctionQueryDefinition QueryModeSynchronizer --runInBand`
- `mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin,appsmith-server -am -Dtest=OntologyActionConfigurationTest,OntologyFunctionLinkActionExecutorTest,MongoRuntimeDataProviderTest -Dsurefire.failIfNoSpecifiedTests=false test`

Commit: `fix(ontology): compose function query definitions by mode`

Concerns: Maven reports existing dependency/logging warnings; no test failures
remain.
