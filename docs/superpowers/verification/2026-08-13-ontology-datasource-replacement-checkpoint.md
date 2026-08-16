# Ontology Datasource Replacement Checkpoint

Date: 2026-08-14
Branch: `feat/ontology-datasource-plugin`
Status: implementation checkpoint, uncommitted by request

## Architecture

The active path is:

```text
Ontology project import
  -> workspace Datasource
  -> pinned native Query / Action
  -> standard Appsmith DataTree
  -> Query.data or Query.run()
  -> standard Widgets
```

The ontology is a first-class Datasource alongside DB and API sources. The
active path does not use ontology-specific Widget modes, AppIDE ontology
loaders, dedicated Redux/Saga runtime state, or side-channel DataTree roots.

## Implemented Contract

- PF4J package: `celanworksmith-ontology-plugin`.
- Datasource records persist the immutable tuple
  `projectId + projectVersion + metadataSnapshotId + metadataDigest` plus the
  stable `runtimeProviderId`.
- Import sources include Demo YAML, Local YAML, and Platform Release adapter
  contracts. The production platform client remains a protocol boundary.
- MongoDB is the read-only development Runtime Provider. Runtime collection
  details stay behind the Provider and are not exposed in Query configuration.
- Object, Function, Link, and Action operations validate against the pinned
  metadata snapshot before execution.
- Action operations use one workspace Action Server resolver/client protocol;
  the plugin does not implement direct business writes.
- Native Query/JS mode remains supported. No Object mode is added to Widgets.

## Task Status

- Tasks 1-12: completed and previously scoped-reviewed in the SDD ledger.
- Task 13: completed. Legacy loaders, DataTree roots, reducers, sagas,
  Object-mode Widget implementations, old client helpers, old action constants,
  and obsolete server route controllers are removed from active code. Readable
  material is under the ignored archive directory with a removal ledger.
- Task 14: completed. This checkpoint, the manual test record, and the
  supersession notices are present. No Git commit was created.

## Verification Evidence

All commands below were run serially on 2026-08-14.

### Client

```bash
yarn --cwd app/client jest --runInBand --no-cache --silent \
  src/selectors/dataTreeSelectors.test.ts \
  src/widgets/TableWidget/widget/nativeQueryMode.test.ts \
  src/widgets/TableWidgetV2/widget/propertyConfig/__tests__/contentConfig.test.ts \
  src/widgets/TableWidgetV2/widget/__tests__/TableRendered.test.ts \
  src/widgets/ButtonWidget/widget/nativePath.test.ts \
  src/widgets/MenuButtonWidget/widget/nativePath.test.ts \
  src/widgets/JSONFormWidget/widget/nativePath.test.ts \
  src/widgets/TextWidget/widget/index.test.tsx \
  src/widgets/InputWidget/widget/index.test.tsx \
  src/widgets/ChartWidget/widget/index.test.ts \
  src/widgets/DropdownWidget/widget/index.test.ts \
  src/widgets/ListWidget/widget/index.test.ts \
  src/widgets/SelectWidget/widget/index.test.ts \
  src/widgets/FormWidget/widget/index.test.ts
```

Result: 12 suites, 42 tests passed.

### Plugin

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin \
  -Dtest=OntologyConfigurationTest,OntologyObjectQueryExecutorTest,OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: 31 tests passed, 0 failures or errors.

### Server

```bash
cd app/server
mvn -q -pl appsmith-server \
  -Dtest=OntologyProjectImportTest,OntologyDatasourceServiceTest,OntologyDatasourceControllerTest,CelanWorksmithConfigurationTest,OntologyDatasourceUpgradeServiceTest,OntologyMetadataSnapshotRepositoryWiringTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: 35 tests passed, 0 failures or errors. The focused configuration test
uses a mocked `PluginService` because it creates a deliberately small Spring
context.

### Static checks

`git diff --check` passed after the implementation changes.

The server package was rebuilt with `mvn -q -pl appsmith-server
-Dmaven.test.skip=true package`, copied into `app/server/dist`, and the
backend was restarted. The frontend development server was restarted by its
user systemd unit and compiles the current source on port `3000`.

Runtime checks after restart:

- `http://127.0.0.1:8081/api/v1/health`: `200`.
- `http://10.10.110.129/`: `200`.
- Backend logs resolve and start `celanworksmith-ontology-plugin@1.0-SNAPSHOT`.

The optimized client production build was attempted with `yarn --cwd
app/client build` but the host terminated Babel with exit `137` during the
memory-intensive build. This does not affect the active development server;
the production bundle must be rebuilt on a host with sufficient memory before
creating a release artifact.

## Known Follow-up Items

- Manual browser verification of Datasource Demo import and native Object
  Query rendering still needs to be repeated after the final deployment.
- A previous manual run reported Demo import failure and repeated Table
  refresh. The import root cause was fixed by persisting the Mongo Plugin
  document ID instead of the PF4J package name. Repeated refresh remains a
  focused browser/regression observation; do not restore the retired side path
  as a workaround.
- Query-editor metadata controls currently expose stable identifiers. Display
  names, Table/Chart assistants, binding guidance, and broader international-
  ization are future iterations.
- Production platform import, production Runtime Provider, Action Server
  authorization, and Datasource ACL policy remain protocol boundaries or
  future work.

## Checkpoint Scope

The working tree contains the Task 13 removal changes, native plugin/lifecycle
changes, focused tests, and these verification documents. Generated build
outputs and deployment backups are not checkpoint source and should be removed
before staging. This document intentionally does not create a commit.
