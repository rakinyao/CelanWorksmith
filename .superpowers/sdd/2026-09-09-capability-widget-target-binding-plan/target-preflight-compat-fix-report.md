# Target Preflight Compatibility Fix

## Scope

- `RuntimeProvider.getObject(OntologyProjectDefinition, ...)` now fails closed unless a provider explicitly supports definition-bound resolution.
- `OntologyRuntimeGateway.validateTargetObjects` is an error-returning default method, preserving compatibility for existing gateway implementations.
- Workspace-scoped target preflight is covered through the pinned definition-bound provider overload.
- Action target rejection is covered before Action Server resolution as well as before dispatch.

## TDD Evidence

- RED: `mvn -q -pl appsmith-server -am -Dtest=RuntimeProviderDefinitionBindingTest -Dsurefire.failIfNoSpecifiedTests=false test`
  failed because a legacy-only provider emitted `PO001` through the definition-aware overload rather than rejecting the request.
- GREEN: `mvn -q -pl appsmith-server -am -Dtest=RuntimeProviderDefinitionBindingTest,OntologySnapshotRuntimeGatewayTest -Dsurefire.failIfNoSpecifiedTests=false test`
  passed with the fail-closed defaults.
- GREEN: `mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=OntologyFunctionLinkActionExecutorTest#rejectsACrossTypeActionTargetBeforeResolvingTheActionServer -Dsurefire.failIfNoSpecifiedTests=false test`
  passed, proving rejected target preflight leaves `resolveRequired` and Action Server dispatch uninvoked.

## Notes

The shared worktree contains independent in-progress function target-bound metadata changes. This task preserves those changes and stages only its own hunks.
