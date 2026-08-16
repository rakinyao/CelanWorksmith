# T9 Application Release E2E Verification

Date: 2026-08-16
Branch: `feat/ontology-datasource-plugin`

Workspace state: pre-existing uncommitted T9/native-path changes were present;
this task adds only the listed Playwright/config/report files and creates no
commit.

## Scope

- Browser test: `app/client/playwright/tests/t9/application-release.spec.ts`
- Native Datasource/Query paths remain the only application paths exercised.
- Demo Ontology Datasource uses the Mongo-backed runtime Provider.
- No browser test code references `$objects`, `$functions`, `$actions`, or `$variables`.
- Action Server protocol remains deferred.

## Commands and Prerequisites

Client command:

```bash
(cd app/client && PLAYWRIGHT_PROJECT=t9 npx playwright test playwright/tests/t9/application-release.spec.ts --config=playwright/d0.config.ts)
```

The standalone config defaults to the existing D0 project. The T9 project is
selected explicitly with `PLAYWRIGHT_PROJECT=t9`; the default D0 invocation
does not include T9.

Service startup commands were not run in this verification because the required
credentials and application environment variables were absent. The commands
that would have been used are recorded here:

```bash
# Frontend, port 3000
(cd app/client && npm run start)

# Backend API, port 8081
java -jar app/server/dist/server-1.0-SNAPSHOT.jar --server.port=8081

# RTS, port 8091
(cd app/client/packages/rts && npm run start -- --port 8091)

# nginx, port 80, using the local nginx configuration
sudo nginx -c /etc/nginx/nginx.conf
```

None of these commands was started by this run: the focused test could not
launch because the Playwright-managed Chromium executable was not installed,
and the required environment variables were also absent. Starting the service
stack would not have produced a meaningful browser result. Frontend, backend,
RTS, and nginx were therefore not exercised.

The test requires `CW_D0_USERNAME`, `CW_D0_PASSWORD`, `CW_D0_WORKSPACE_ID`,
`CW_T9_APPLICATION_URL`, and `CW_T9_APPLICATION_ID`. The development client
and backend must be running,
the authenticated user must be able to open the target application and create
Datasources/releases, MongoDB must be available for release snapshots and the
active pointer, and Redis must be available for the normal Appsmith session.

## Scenario

The single scenario imports a Demo Ontology Datasource through the application
API as setup, then opens the app editor, selects that datasource through the
Datasources UI, creates a native query, and selects `Purchase Order` in the
native Object type control. It then runs a successful preflight, creates and
manually activates a snapshot, creates a second snapshot, rolls back manually,
and intercepts a later activate request with a structured Provider
compatibility diagnostic. It verifies that the active release remains
unchanged after that mocked failure; the browser test does not connect to or
mutate MongoDB directly.

## Result

Status: `FAIL` (environment precondition)

Focused Playwright result: `1 failed`, exit code `1`, one worker. Playwright
failed before the test body because its default Chromium executable was not
installed. A separate shell check confirmed that all five required variables
were unset, so the scenario could not be meaningfully retried in this
environment. Harness warnings: Node reported that `NO_COLOR` was ignored
because `FORCE_COLOR` was set.

Observed command output:

```text
Running 1 test using 1 worker
1 failed [t9] ... application-release.spec.ts
Error: browserType.launch: Executable doesn't exist at
/home/gavin/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell

Environment check:
CW_D0_USERNAME=UNSET
CW_D0_PASSWORD=UNSET
CW_D0_WORKSPACE_ID=UNSET
CW_T9_APPLICATION_URL=UNSET
CW_T9_APPLICATION_ID=UNSET
```

The development client/backend, authenticated login, MongoDB, and Redis
prerequisites were not exercised. This is an environment limitation, not a
passing result.

Active-release behavior: the mocked 422 activation response must expose
`RELEASE_ONTOLOGY_PROVIDER_INCOMPATIBLE` at
`datasources.demoOntology.providerId`; the active release must remain the
pre-failure release.

Action Server: deferred. T9 verifies only the release adapter boundary and does
not define request/response, authorization, retry, timeout, progress, or audit
protocol behavior.

## Follow-up Verification

Date: 2026-08-16

The development backend was rebuilt and redeployed after the initial
environment-blocked run. The running artifact contains the release controller,
and the Spring release service constructor is explicitly injectable. The T9
scenario then completed successfully:

- `PLAYWRIGHT_PROJECT=t9`: 1 test passed.
- Native Demo Ontology Datasource import and Purchase Order Query creation
  completed without a release API 404.
- Preflight, release creation, activation, second release creation, rollback,
  and blocked activation preservation all passed.
- `/api/v1/health` returned HTTP 200.

The release-history test was made repeatable for existing development history,
and the UI status label was corrected to avoid rendering the nested i18n
translation object as text.
