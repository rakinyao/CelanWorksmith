# H0 Native Ontology Baseline Verification
Date: 2026-08-15
Branch: `feat/ontology-datasource-plugin`

## Result

`PASSED`

The native Ontology Datasource baseline is reproducible in the current
development environment. The service stack is healthy, the plugin is loaded
from the required `app/server/dist` working directory, focused server/plugin/
client suites pass, and both authenticated browser gates pass.

## Runtime Baseline

- Backend process: `server-1.0-SNAPSHOT.jar`, working directory
  `app/server/dist`.
- Frontend development process: `app/client`, port `3000`.
- nginx entrypoint: port `80`.
- RTS: `app/client/packages/rts`, port `8091`.
- Backend API: `127.0.0.1:8081`.
- Demo Runtime Provider: MongoDB read-only Provider backed by the local
  MongoDB instance.
- Demo plugin artifact: `app/server/dist/plugins/celanworksmithOntologyPlugin-1.0-SNAPSHOT.jar`.
- Backend health: HTTP `200`.
- nginx frontend health: HTTP `200`.

The backend must be started from `app/server/dist`; starting the JAR from a
different working directory can prevent PF4J from discovering `dist/plugins`.

## Active-Path Audit

The following retired paths have no active source matches under
`app/client/src` or `app/server`:

- `$objects`, `$functions`, `$actions`, `$variables`;
- Object Widget mode;
- ontology-specific Redux/Saga execution and refresh paths.

## Verification Commands

### Plugin

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin \
  -Dtest=OntologyConfigurationTest,OntologyObjectQueryExecutorTest,OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: PASS. The focused ontology plugin suite completed with exit code `0`.

### Server

```bash
cd app/server
mvn -q -pl appsmith-server \
  -Dtest=OntologyDatasourceControllerTest,OntologyDatasourceServiceTest,OntologyDatasourceUpgradeServiceTest,OntologyMetadataSnapshotRepositoryWiringTest,OntologyProjectImportTest,OntologyProjectYamlImporterTest,OntologySnapshotRuntimeGatewayTest,OntologySnapshotServiceTest,RuntimeProviderCompatibilityValidatorTest,MongoOntologyProjectRegistryTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: PASS. The focused server suite completed with exit code `0`; MongoDB
connected successfully at `localhost:27017`.

### Client

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

Result: PASS, 6 suites and 16 tests. Existing React `act` warnings remain
non-blocking test-harness warnings.

### Authenticated import/persistence

```bash
cd app/client
CW_D0_USERNAME="$(cat /tmp/cw-d0-user)" \
CW_D0_PASSWORD='CodexD0!2026' \
CW_D0_WORKSPACE_ID='6a7f0c1709b49a0f7455555c' \
PLAYWRIGHT_BASE_URL=http://127.0.0.1 \
./node_modules/.bin/playwright test --config=playwright/d0.config.ts --reporter=line
```

Result: PASS, 1 test in 12.8 seconds. The browser imported the Demo Ontology
Datasource, found the persisted native Datasource, and stopped it during
cleanup.

### Native Table execution count

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

Result: PASS, 1 test in 1 minute 34 seconds. The scenario confirmed zero
matching `/api/v1/actions/execute` requests after Table binding and
stabilization, followed by exactly one request after one explicit Query Run.

Cypress emitted a non-blocking warning that the repository `.env` file is
absent; all required local test variables were supplied explicitly.

## Documentation Baseline

The canonical current documents are:

- `docs/superpowers/designs/2026-08-13-ontology-datasource-plugin-design.md`:
  approved architecture and contracts;
- `docs/superpowers/verification/2026-08-15-native-ontology-stage-checkpoint.md`:
  current target comparison and boundaries;
- `docs/superpowers/verification/2026-08-14-ontology-native-path-d1.md` through
  `d6.md`: current D0-D6 evidence;
- `docs/superpowers/plans/2026-08-15-native-ontology-next-phase.md`: active
  H0-H6 plan.

Earlier T5-T8, B0-B6, Object-mode, and side-channel verification documents are
historical evidence only. They must not be used as active implementation
guidance after the native Datasource replacement checkpoint. Readable retired
code is preserved under the ignored archive directory and tracked by its
relocation ledger.

## Gate Decision

H0 is complete. H1 may start. No product code was changed during H0, no Git
commit was created, and all pre-existing worktree changes remain preserved.
