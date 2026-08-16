# D6 Verification: Native Ontology Development Checkpoint

Date: 2026-08-14

## Result

`PASSED`

The D1-D5 native Datasource implementation and the development service stack
are verified, including browser request-count evidence for the native Table
repeated-execution scenario.

## Architecture Gate

The active path remains:

```text
Datasource import
  -> workspace Datasource
  -> native Query/Action
  -> PF4J ontology plugin
  -> pinned metadata and Runtime Provider
  -> native DataTree
  -> native Widget
```

No active source matches `$objects`, `$functions`, `$actions`, `$variables`,
or `Object Widget mode` under `app/client/src` and `app/server`.

## Fresh Evidence

### Services

- Backend `127.0.0.1:8081` is listening and `/api/v1/health` returns HTTP 200.
- nginx `127.0.0.1:80` returns the frontend with HTTP 200.
- Frontend `0.0.0.0:3000` and RTS `127.0.0.1:8091` are listening.
- Backend startup completes ReadinessState `ACCEPTING_TRAFFIC` and its RTS health check returns HTTP 200.
- The ontology PF4J plugin is resolved and started during backend startup.

### Import and persistence

Command:

```bash
cd app/client
CW_D0_USERNAME="$(cat /tmp/cw-d0-user)" \
CW_D0_PASSWORD='CodexD0!2026' \
CW_D0_WORKSPACE_ID='6a7f0c1709b49a0f7455555c' \
PLAYWRIGHT_BASE_URL=http://127.0.0.1 \
npx playwright test playwright/tests/d0/ontology-native-path.spec.ts \
  --config=playwright/d0.config.ts --reporter=line
```

Result: 1 test passed in 13.1 seconds. The authenticated browser session
imported a Demo Ontology Datasource with HTTP 201, found it in the native
Datasource list, and stopped it during cleanup.

### Plugin and server contracts

- Focused ontology plugin Maven suite: exit code 0.
- Focused Datasource service/controller/upgrade/wiring Maven suite: exit code 0.
- The plugin tests cover pinned configuration, one provider call per plugin
  execution, empty results, validation errors, provider errors, and malformed
  Action Server responses.

### Client contracts

Command:

```bash
cd app/client
yarn jest \
  src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx \
  src/ce/utils/autocomplete/EntityDefinitions.test.ts \
  src/widgets/TableWidget/widget/nativeQueryMode.test.ts \
  src/widgets/ButtonWidget/widget/nativePath.test.ts \
  src/widgets/JSONFormWidget/widget/nativePath.test.ts \
  src/widgets/MenuButtonWidget/widget/nativePath.test.ts \
  --runInBand
```

Result: 6 suites and 16 tests passed, exit code 0. Existing React `act`
warnings were emitted by the test harness and did not fail assertions.

### Repository checks

- `git diff --check`: passed.
- Active legacy-path audit: zero matches.

## Native Table Browser Gate

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

The authenticated Cypress scenario passed in 1 minute 34 seconds after
installing `Xvfb`, unsetting `ELECTRON_RUN_AS_NODE`, correcting the support
imports, and setting the local base URL and development credentials. It
confirmed zero native execute requests after Table binding and stabilization,
followed by exactly one request after an explicit Query Run.

The earlier `i18n` Browserify resolution error was a test-runner setup issue
and is no longer an open checkpoint gate.
