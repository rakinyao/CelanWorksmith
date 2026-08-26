# Function Query Mode Boundary Verification

Date: 2026-08-26
Branch: `feat/function-query-mode-boundary`

## Scope

Function Query configuration now composes the selected `formData.functionId`
with `formData.parameters` into exactly `{ functionId, parameters }` for both
Builder and Advanced modes. Advanced JSON is parsed as a parameter object;
legacy complete definitions and nested metadata are not treated as root
fields. Function IDs, required parameters, unknown parameters, writability,
and value types remain the responsibility of `OntologyQueryValidator`.

## RED

Before the parser change, the new Advanced boundary tests failed because
Advanced mode required the old complete `definition` payload:

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am \
  -Dtest=OntologyActionConfigurationTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: exit code `1`; 30 tests ran with 2 failures and 2 errors. The errors
reported `Ontology operation definition is required` for parameter-only
Advanced inputs.

## GREEN

```bash
cd app/client
yarn exec jest FunctionParametersControl ontologyFunctionQueryDefinition QueryModeSynchronizer --runInBand
```

Result: exit code `0`; 4 suites and 62 tests passed.

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin,appsmith-server -am \
  -Dtest=OntologyActionConfigurationTest,OntologyFunctionLinkActionExecutorTest,MongoRuntimeDataProviderTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: exit code `0`.

## Toolchain Warnings

Maven emitted existing warnings for deprecated `Unsafe` access, multiple
SLF4J providers, and an unconfigured log4j appender. The commands completed
successfully.
