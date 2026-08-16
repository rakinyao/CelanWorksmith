# D3 Action Server Protocol Boundary Verification

Date: 2026-08-14

## Result

The current development Action Server boundary is contract-complete for the
protocol currently defined in Worksmith. Action execution stays on the native
PF4J/Appsmith Action path and Worksmith does not perform business writes.

Verified behavior:

- trusted workspace/project/version/Datasource and metadata snapshot context
  is injected by the plugin;
- caller-supplied pinned context cannot override trusted context;
- parameters are validated against snapshot metadata before dispatch;
- idempotency keys are generated for native Action runs;
- successful responses retain the Action Server audit ID;
- domain failures retain the audit ID in the standard failed Action result;
- missing audit IDs are rejected as malformed responses.

## Verification

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin \
  -Dtest=OntologyConfigurationTest,OntologyObjectQueryExecutorTest,OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: PASS, 37 tests.

## Boundary Notes

The external Action Server team has not yet supplied a concrete asynchronous
response schema, progress schema, timeout policy, or transport contract. D3
therefore does not invent one. The current resolver/client seam is ready for
that protocol to be added without changing Widget, DataTree, or execution
architecture. Production Action Server authorization and business execution
remain out of scope.
