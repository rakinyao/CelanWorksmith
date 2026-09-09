# Server Target Preflight Correction

## Scope

- Added `OntologyRuntimeGateway.validateTargetObjects` and backed it with the pinned snapshot's runtime provider.
- Each declared target is resolved with the pinned ontology definition and must return the same declared object type.
- Function execution and Action Server client resolution are deferred until target validation completes.
- Builder-only `targetBinding` remains outside the canonical runtime definition; only `target` is retained.

## TDD Evidence

- RED: `mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=OntologyFunctionLinkActionExecutorTest,OntologyActionConfigurationTest -Dsurefire.failIfNoSpecifiedTests=false test`
  failed with the new unknown Function target and cross-type Action target cases succeeding unexpectedly.
- GREEN: `mvn -q -pl appsmith-server,appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=OntologySnapshotRuntimeGatewayTest,OntologyFunctionLinkActionExecutorTest,OntologyActionConfigurationTest,OntologyObjectQueryExecutorTest -Dsurefire.failIfNoSpecifiedTests=false test`
  passed after the target preflight implementation.

## Coverage

- Every target ID is resolved through the pinned definition-bound provider.
- Provider `OBJECT_NOT_FOUND` errors pass through unchanged; mismatched returned types become native `OBJECT_NOT_FOUND` errors.
- Unknown Function targets do not invoke `executeFunction`.
- Cross-type Action targets do not invoke the Action Server client.
- `targetBinding` form metadata is omitted from Builder capability definitions.
