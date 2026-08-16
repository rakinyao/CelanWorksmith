# D0 Ontology Native Path Stabilization Verification

Date: 2026-08-14

## Scope

This checkpoint records the automated verification for the standard Ontology
Datasource path, including authenticated import/persistence and native Table
execution-count behavior.

## Architecture Under Test

```text
Datasource import
  -> workspace Datasource
  -> native Query/Action
  -> PF4J ontology plugin
  -> pinned Runtime Provider
  -> native DataTree
  -> native Widget
```

The retired Object Widget mode and `$objects`/`$functions`/`$actions`/
`$variables` execution paths remain inactive.

## Completed Evidence

### Task 1: Demo import contract

- Demo import uses the registered Datasource plugin document ID.
- The seven pinned identity properties are persisted.
- The authenticated import actor replaces any client-supplied actor.
- Structured API errors render as text rather than `[object Object]`.
- Native Datasource refresh is invoked after success.

Focused client command:

```bash
cd app/client
yarn jest src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx --runInBand
```

Result: PASS, 1 suite and 5 tests.

### Task 2: Import failure cleanup

- A failure after Datasource creation archives the created record.
- The cleanup test models the native storage becoming inactive.
- Cleanup failure does not replace the original persistence error.
- Missing plugin and incompatible provider failures remain pre-create paths.

Focused server tests passed:

```bash
cd app/server
mvn -q -pl appsmith-server \
  -Dtest='OntologyDatasourceServiceTest#archivesDatasourceWhenPersistingDatasourceIdFails+preservesPersistenceErrorWhenArchivingFailedDatasourceFails' \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

### Task 3: Native execution evidence

- Successful Object Query makes exactly one provider call.
- The pinned provider ID is forwarded.
- Empty results remain successful native results with no extra provider call.
- Validation errors make zero provider calls.
- Provider errors produce one failed native result.
- No shared Appsmith plugin interface or production execution protocol was
  changed for diagnostics.

Focused plugin command:

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin \
  -Dtest=OntologyConfigurationTest,OntologyObjectQueryExecutorTest,OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: PASS. Existing JVM, logging, and multiple-SLF4J-provider warnings are
non-failing.

### Task 4: Browser scenario preparation

Added:

`app/client/cypress/e2e/CelanWorksmith/OntologyDatasourceNativePath_spec.ts`

The scenario now asserts:

1. zero matching native execute requests after Table binding and stabilization;
2. one matching request after one explicit Query Run;
3. request matching by both Datasource ID and Query name where present.

Static checks passed:

```bash
cd app/client
./node_modules/.bin/prettier --check \
  cypress/e2e/CelanWorksmith/OntologyDatasourceNativePath_spec.ts

cd cypress
../node_modules/.bin/eslint -c .eslintrc.json \
  e2e/CelanWorksmith/OntologyDatasourceNativePath_spec.ts
```

## Historical Environment Issues

The first Cypress failure was caused by `ELECTRON_RUN_AS_NODE=1`, which made
the Cypress Electron binary behave as Node and reject its launcher flags. The
host also initially lacked `Xvfb`:

```text
Error: spawn Xvfb ENOENT
```

After removing `ELECTRON_RUN_AS_NODE`, installing `Xvfb`, correcting the spec's
support imports, and configuring the development credentials, Cypress reached
the application and completed the scenario. These are historical setup issues,
not current runtime blockers.

## Health Checks

- `http://127.0.0.1:8081/api/v1/health`: HTTP 200.
- `http://127.0.0.1/`: HTTP 200.
- Backend/plugin source and prior startup records confirm the ontology PF4J
  plugin is part of the configured plugin set.

## Playwright Import Gate

The cached Chromium runner was used after the rebuilt backend was restarted:

```bash
cd app/client
./node_modules/.bin/prettier --check \
  playwright/tests/d0/ontology-native-path.spec.ts
export CW_D0_USERNAME=$(cat /tmp/cw-d0-user)
export CW_D0_PASSWORD='CodexD0!2026'
export CW_D0_WORKSPACE_ID='6a7f0c1709b49a0f7455555c'
export PLAYWRIGHT_BASE_URL=http://127.0.0.1
./node_modules/.bin/playwright test --config=playwright/d0.config.ts
```

Result: PASS, 1 test. The scenario authenticated, imported a Demo Ontology
Datasource with HTTP 201, found the persisted record in the normal Datasource
list, and stopped it during cleanup. The cleanup request uses the native
Ontology stop contract with `Origin` and `X-Requested-By: Appsmith`; direct
Datasource deletion is not available to the development test account and
correctly returns HTTP 403.

## Browser Execution-Count Evidence

Command:

```bash
cd app/client
unset ELECTRON_RUN_AS_NODE
CYPRESS_BASE_URL=http://127.0.0.1 \
CYPRESS_USERNAME="$(cat /tmp/cw-d0-user)" \
CYPRESS_PASSWORD='CodexD0!2026' \
CYPRESS_CELANWORKSMITH_NATIVE_PATH_TEST=true \
./node_modules/.bin/cypress run \
  --spec cypress/e2e/CelanWorksmith/OntologyDatasourceNativePath_spec.ts \
  --browser electron
```

Result: PASS, 1 test passing in 1 minute 34 seconds. The authenticated
scenario confirmed zero matching native execute requests after Table binding
and stabilization, then exactly one additional request after one explicit
Query Run. The request was matched through the dedicated
`/api/v1/actions/execute` alias, because the native execution request does not
reliably include Query or Datasource names in its body.

The final browser run also confirmed that the Demo snapshot's `PurchaseOrder`
and `Supplier` metadata resolve to their configured runtime tables
(`purchase_orders` and `suppliers`).

## Gate Decision

**D0: PASSED.**

The import, persistence cleanup, plugin execution, native Table execution
count, static checks, and service health gates pass.

## Root-Cause Notes

- The PF4J plugin must start from `app/server/dist` so its `dist/plugins`
  directory is discoverable.
- Demo metadata must include `runtimeTable`; otherwise metadata loads but
  native execution fails with `Object type has no runtime table`.
- Cypress metadata selectors use display labels such as `Purchase Order`, not
  stable object IDs such as `PurchaseOrder`.
- Native execution requests do not provide a reliable Query name or
  Datasource ID in the request body; execution counting therefore uses the
  dedicated execute endpoint alias.
