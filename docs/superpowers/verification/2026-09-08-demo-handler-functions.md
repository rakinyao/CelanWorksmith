# Demo Handler Functions Verification

This is a provisional demonstration release. It is not the final ontology
Function contract. Release `1.0.0` remains unchanged; the Function metadata is
in `ontology-model-release-demo-functions-1.1.0.json` and uses only the
audited `DEMO_HANDLER` implementation kind.

## Manual verification

1. Create or open a workspace and application, then add the Ontology datasource.
2. Choose **Import ontology Release JSON** and select
   `docs/superpowers/fixtures/ontology-model-release-demo-functions-1.1.0.json`.
3. Confirm the imported release is `business-core-demo` version `1.1.0`.
4. Create a Function Query in Builder mode. Select an object type and verify
   that its Functions list is scoped to that owner type.
5. For `CalculateContractChangeRate`, select a Contract and provide one
   Contract object ID. Run the query and verify a decimal result.
6. For `CalculateContractGrossAmount`, provide the target ObjectSet in
   Advanced JSON with one or more Contract IDs. Run the query and verify the
   deterministic two-decimal sum.
7. Bind the scalar or list result to a native Text or Table widget.
8. Verify that an unsupported owner type, missing target, unknown Function, or
   target count above the Function's `maxItems` produces a readable failure and
   does not execute the provider call.

The steps above are a manual procedure only. Automated tests and local service
health checks must be recorded separately with their actual results; this note
does not claim an end-to-end manual run has succeeded.

## Automated checks completed

- `mvn -q -pl appsmith-server -am -Dtest=ReleaseMappedMongoRuntimeAdapterTest,OntologyModelReleaseParserTest,OntologyModelReleaseMapperTest -Dsurefire.failIfNoSpecifiedTests=false test`
- `mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am -Dtest=OntologyQueryValidatorTest,OntologyFunctionLinkActionExecutorTest -Dsurefire.failIfNoSpecifiedTests=false test`
- Release fixture validator: `1.1.0`, four Functions, digest validated.
- `http://127.0.0.1:8081/api/v1/health`: HTTP 200 (`All systems are up`).
