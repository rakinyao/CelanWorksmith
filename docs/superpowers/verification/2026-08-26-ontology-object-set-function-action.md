# Ontology Object Set Function and Action Verification

Date: 2026-08-26
Candidate: `3e7a64c4a48df6aa3f7c4664dabd4fa3cc9657c6`

## Automated Regression

The requested focused server command was run serially before deployment and
again after the primary checkout was fast-forwarded:

```bash
cd app/server
mvn -q -pl appsmith-server,appsmith-plugins/celanworksmithOntologyPlugin,demo-action-server -am -Dtest=OntologyProjectImporterTest,OntologySnapshotRuntimeGatewayTest,OntologyActionConfigurationTest,OntologyQueryValidatorTest,OntologyFunctionLinkActionExecutorTest,MongoRuntimeDataProviderTest,ActionExecutionServiceTest,UpdateProductionScheduleHandlerTest,HttpOntologyActionServerClientTest -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: success. The second run's Surefire reports recorded zero errors and
failures for 122 tests across the available targeted classes: snapshot gateway
(2), query validator (5), action configuration (34), function/link/action
executor (27), Mongo runtime provider (28), Action Execution Service (8),
Update Production Schedule handler (9), and HTTP Action Server client (9).
The selector `OntologyProjectImporterTest` has no matching class in this
checkout; the active importer test is `OntologyProjectYamlImporterTest`, as
recorded in Task 1. Maven emitted only existing JDK Unsafe, SLF4J-provider, and
log4j-appender warnings.

The literal client command was also attempted:

```bash
cd app/client
yarn test ontologyCapabilityQueryDefinition QueryModeSynchronizer --runInBand
```

Result: exit 1 before Jest discovery. `yarn test` invokes the Cypress wrapper,
and the inherited `ELECTRON_RUN_AS_NODE=1` made Cypress reject its own startup
flags. The direct repository Jest entrypoint executed the named tests:

```bash
cd app/client
yarn jest ontologyCapabilityQueryDefinition QueryModeSynchronizer --runInBand
```

Result: exit 0; 4 suites and 79 tests passed. This is a toolchain alias
limitation, not a source or test failure. No client toolchain changes were made.

After the final whole-branch review fixes, the primary checkout was rebuilt
and the focused server command was rerun with
`OntologyProjectYamlImporterTest` and `ReleaseDependencyScannerTest` included.
It exited successfully. The same direct Jest command exited successfully with
4 suites and 79 tests. This covers the zero-parameter Function Builder
serialization, native single-target Action failure mapping, owner/capability
selection identity, and Function release dependency checks added in the final
fix commit.

The server group includes the Action Execution Service regression coverage for
atomic rejection before audit or handler dispatch. This is the focused
server/API proof that an atomic request does not mutate business data.

## Deployment

Before deployment, the documented service verification was read from
`docs/superpowers/verification/2026-08-22-demo-action-server-native-query.md`.
The pre-deployment `systemctl --user status` check showed `cw-backend`,
`cw-demo-action-server`, `cw-frontend`, and `cw-rts` active.

The primary checkout was read-only checked before integration: it was clean on
`feat/ontology-datasource-plugin`, at
`4e60c5faacb1f25daaafb56b18efc799257db22c`, and was an ancestor of the
candidate. It was then fast-forwarded to the candidate, without staging or
including unrelated worktree changes:

```bash
git merge --ff-only 13a56128a4405964d6fee4d065e6c7a09b6d1b79
```

The candidate was packaged in the isolated worktree before the fast-forward:

```bash
cd app/server
./build.sh -DskipTests
```

Result: success; the staged server JAR and Ontology plugin JAR were produced.
The live backend was stopped, its prior `dist` retained under the local
rollback backup directory, and the staged `dist` copied into the primary
checkout. The existing services were then restarted in dependency order:

```bash
systemctl --user stop cw-backend
systemctl --user restart cw-demo-action-server
systemctl --user start cw-backend
```

After startup, `systemctl --user is-active cw-backend cw-demo-action-server
cw-frontend cw-rts` returned `active` for all four services. Both health checks
returned successfully:

```bash
curl -fsS http://127.0.0.1:8092/actuator/health
curl -fsS http://127.0.0.1:8081/api/v1/health
```

The deployed `dist` contains `server-1.0-SNAPSHOT.jar` and
`celanworksmithOntologyPlugin-1.0-SNAPSHOT.jar`.

The primary checkout was subsequently fast-forwarded from
`13a56128a4405964d6fee4d065e6c7a09b6d1b79` to the final-fix candidate above.
`./build.sh -DskipTests` produced the backend and Ontology plugin artifacts;
the backend was stopped, the Demo Action Server restarted, and the backend
started again. All four units returned `active`; the Demo server health endpoint
returned `{"status":"UP"}`, and the backend health endpoint returned status
200 with `All systems are up`.

## Browser and API Evidence

The Cypress binary itself was verified after unsetting the inherited Electron
runner flag:

```bash
cd app/client
env -u ELECTRON_RUN_AS_NODE yarn cypress verify
```

Result: exit 0. The ignored local configuration inspection found only the
Demo Action Server environment file; no E2E account configuration was present,
and that file was not read.

Playwright 1.59.1 is installed, but browser launch failed before navigation:

```text
browserType.launch: Executable doesn't exist at
/home/gavin/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell
```

No browser was installed or application/toolchain source changed.

The native session fallback exercised the normal local registration and
authentication workflow with generated, unrecorded throwaway account values.
An initially generated `.test` address was rejected by the application's email
validator; a valid `example.com` throwaway address completed signup and form
login. The authenticated native API then verified one isolated workspace,
temporary app creation (`POST /api/v1/applications`, HTTP 201), and Demo
Ontology datasource import (`POST /api/v1/celanworksmith/ontology/datasources`,
HTTP 201). IDs and session values stayed in process memory and were not
recorded. The throwaway accounts/workspaces/apps/datasources are isolated from
manual-test data.

Consequently, the following browser/API checks remain outstanding: owner-first
Function selection; Builder target composition; Advanced hydration;
`CalculateDelayDays` success; malformed and cross-type native Query failures;
owner-first Action selection; and the non-atomic Action native-error/audit
observation. The final case must expect the Demo-data related-object-not-found
error and audit identity, rather than a successful production schedule
mutation, because the Demo seed intentionally has no production-order data.

## Limitations

- Browser/API E2E requires an installed browser executable. Native API setup
  is proven, but the protected Builder/Advanced editor behavior and native
  Query execution cannot be represented faithfully without the browser.
- A successful production schedule mutation remains intentionally out of scope
  for the incomplete Demo seed. The focused Action Execution Service coverage
  is the no-mutation evidence for atomic requests.
- This note contains no local configuration values, credentials, account,
  workspace, datasource, snapshot, or audit identifiers.
