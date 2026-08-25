# Function Query Builder Runtime Consistency Verification

Date: 2026-08-25
Branch: `feat/function-query-builder-runtime`

## Scope

Task 4 replaces the Function Query editor placeholder with the canonical
Builder and Advanced controls. The resource exposes Function selection,
parameter metadata for the selected Function, Builder/Advanced visibility, and
the canonical Advanced JSON placeholder. No output controls were added.

## RED

The task brief's `yarn test` command cannot start Jest in this checkout because
the `test` script invokes the Cypress wrapper. Cypress exits before it runs a
test because the installed binary rejects its startup flags:

```bash
cd app/client
yarn test QueryModeSynchronizer --runInBand
```

Result: exit code `1`; Cypress reported `bad option: --no-sandbox`,
`--smoke-test`, and `--ping=476`.

The direct Jest entrypoint reached the focused test and captured the intended
failure before the editor resource was changed:

```bash
cd app/client
yarn jest QueryModeSynchronizer --runInBand
```

Result: 1 failing suite, 2 passing suites; 1 failing test and 62 passing tests.
`exposes canonical Function Builder and Advanced editor controls` failed
because the placeholder resource had no `queryMode` control.

## GREEN

```bash
cd app/client
yarn jest ontologyFunctionQueryDefinition QueryModeSynchronizer --runInBand
```

Result: exit code `0`; 3 passing suites and 63 passing tests. The test parses
the Function editor resource and verifies the Builder/Advanced controls, the
selected-Function `ONTOLOGY_FUNCTION_PARAMETERS` request, Builder visibility,
and the canonical `CalculateDelayDays` placeholder.

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin,appsmith-server -am \
  -Dtest=OntologyFunctionLinkActionExecutorTest,OntologyActionConfigurationTest,MongoRuntimeDataProviderTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: exit code `0`.

## Toolchain Warnings

- The client `yarn test` alias starts Cypress rather than Jest and is blocked
  by the local Cypress binary rejecting its startup flags. The direct `yarn
jest` command above ran the requested focused suites.
- Maven emitted existing environment warnings for deprecated `Unsafe` access,
  dynamic Byte Buddy agent loading, multiple SLF4J providers, and an
  unconfigured log4j appender. The command still exited successfully.
