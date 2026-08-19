# T9 Application Release Checkpoint

Date: 2026-08-16
Task: T9 Task 12 cross-task gate/checkpoint
Decision: **PASSED after follow-up verification**

The initial gate was recorded as PARTIAL because the browser environment was
not ready. The follow-up verification below restored the development stack,
fixed the deployed release controller artifact, and completed the browser
scenario. The original environment-blocked result remains documented as
historical evidence.

## Follow-up Verification

The release API 404 was caused by the running backend JAR predating
`ApplicationReleaseController`. The server was rebuilt and redeployed, and
the release service constructor was made explicit for Spring injection. The
backend now listens on `127.0.0.1:8081`; `/api/v1/health` returns HTTP 200.

The browser test also exposed two test/UI issues and was corrected:

- T9 release history assertions now use the create response release ID and a
  pre-existing history count, so repeated development runs are supported.
- Release history renders `release.statusLabel` instead of resolving the
  nested `release.status` translation object as text.

Fresh follow-up results:

- Targeted server release suite: 66 tests, 0 failures, 0 errors, 0 skipped.
- Targeted client release suites: 2 suites, 20 tests, 0 failures.
- T9 Playwright lifecycle: 1 test passed in 54.2 seconds.
- Development health check: HTTP 200; backend, frontend, RTS, and nginx are
  active.

## Initial Gate Record (Historical)

Commands were executed in the required order.

### 1. Targeted server Maven suite

Working directory: `app/server`

```bash
mvn -q -pl appsmith-server \
  -Dtest=ApplicationReleaseSnapshotTest,MongoApplicationReleaseRepositoryTest,ApplicationReleaseSnapshotBuilderTest,ReleaseDatasourcePinExtractorTest,ReleaseDependencyScannerTest,ApplicationReleaseValidationServiceTest,OntologyReleaseValidatorTest,ApplicationReleaseProviderHealthGateTest,ApplicationReleaseControllerTest,ApplicationReleasePublishCoordinatorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Initial result: **PASS**, exit code `0`.

- Surefire summary: 65 tests, 0 failures, 0 errors, 0 skipped.
- The three `ReleaseDatasourcePinExtractorTest` expectations now assert the
  formal project identity (`project-1`, `2.4.0`) returned by the extractor.
- This resolves the previous test-contract mismatch; no production extractor
  behavior was changed in this fix. The release production package and this
  test are currently untracked working-tree content from the preceding T9
  implementation, so Git tracked-diff state alone cannot establish provenance.
- JVM, Lombok, Byte Buddy, and multiple-SLF4J warnings were emitted; they are
  non-blocking.

### 2. Targeted client Jest suites (Initial Run)

Working directory: `app/client`

```bash
npx jest src/actions/applicationReleaseActions.test.ts src/pages/AppIDE/components/ApplicationReleasePanel/index.test.tsx --runInBand
```

Initial result: **PASS**, exit code `0`.

- Test suites: 2 passed, 0 failed.
- Tests: 19 passed, 0 failed.
- Snapshots: 0.

### 3. T9 Playwright browser verification (Initial Run)

Working directory: `app/client`

```bash
PLAYWRIGHT_PROJECT=t9 npx playwright test playwright/tests/t9/application-release.spec.ts --config=playwright/d0.config.ts
```

Result: **FAIL**, exit code `1`, classified as **environment failure**.

- Playwright selected one `[t9]` test and one worker.
- Chromium launched successfully after installing the Playwright `v1217`
  browser bundle.
- The test stopped at its environment precondition before login because these
  variables are unset: `CW_D0_USERNAME`, `CW_D0_PASSWORD`,
  `CW_D0_WORKSPACE_ID`, `CW_T9_APPLICATION_URL`, and `CW_T9_APPLICATION_ID`.
- Therefore native Datasource/Query UI and the release lifecycle remain
  runtime-uncertified. This is not a browser feature pass.
- The Node `NO_COLOR`/`FORCE_COLOR` warning is informational and separate from
  the missing test environment variables.

### 4. Repository diff check (Initial Run)

Working directory: repository root

```bash
git diff --check
```

Result: **PASS**, exit code `0`, no output.

## Tasks 1-11 Evidence

| Task | Evidence and final review disposition |
| --- | --- |
| 1 | Release model records, validation, recursive defensive copies, and nested diagnostic details. Focused Maven verification passed; final review SPEC/QUALITY PASS. |
| 2 | Insert-only Mongo release persistence, deterministic listing, lifecycle status updates, and active pointer behavior. Focused tests and the real local Mongo integration test passed; final review SPEC/QUALITY PASS. |
| 3 | Safe public-view snapshot projection, canonical digest, total pin ordering, and datasource/auth/body secret redaction. Focused builder test passed with 9 tests; final review SPEC/QUALITY PASS. |
| 4 | Native datasource pin extraction, compact storage-backed Ontology resolution, dependency scanning, stable diagnostics, deterministic storage fallback, and formal project identity extraction. Final focused suite and the T12 server suite pass; final review SPEC/QUALITY PASS. |
| 5 | Persisted deprecated state, provider identity/capability validation, digest errors, and stable sequential diagnostics. Affected focused tests reported 24 passed; final review SPEC/QUALITY PASS with two non-blocking test/maintenance risks. |
| 6 | Provider health gate, exact pin/digest checks, real Mongo runtime provider capability path, adapter shape validation, and Spring wiring. Gate/configuration tests reported 6 + 7 passed; final review had no P0/P1 and retained one P2 static Action Server boundary-evidence limitation. |
| 7 | Permission-aware candidate loading, one shared extraction, diagnostics persistence, blocking activation protection, list/active/rollback, and cross-application isolation. Targeted evidence reported 40 passed; final review SPEC/QUALITY PASS with four P2 evidence gaps. |
| 8 | Native publish coordinator ordering and failure preservation. Coordinator tests reported 5 passed; the broader `RefactoringServiceCETest` was blocked by missing `APPSMITH_DB_URL`/`APPSMITH_MONGODB_URI`, correctly classified as environment failure. Final review SPEC PASS/QUALITY PASS with two P2 evidence gaps. |
| 9 | Six release API paths, Redux state, structured diagnostics, activation error convergence, and reducer composition. Focused Jest reported 1 suite/6 tests passed; final review had no P0/P1/P2 findings. |
| 10 | Real release API lifecycle wiring, response failure handling, gate invalidation, i18n severity/status, native publish separation, and history actions. Current targeted Jest reported 2 suites/19 tests passed; final review SPEC/QUALITY PASS, with 9 non-blocking ESLint warnings in prior evidence. |
| 11 | Native Datasource/Query browser scenario and release lifecycle assets; T9 project selection was corrected. Focused Playwright launches Chromium but stops at the required environment precondition because credentials and application variables are unavailable; final review SPEC PARTIAL/QUALITY PASS. |

## Legacy Path Audit

The Task 13 legacy inventory remains the audit baseline. The release checkpoint
and Playwright scenario use the native Datasource/Query path only; no `$objects`,
`$functions`, `$actions`, `$variables`, removed Object Widget mode, legacy
loader, reducer, or side-channel execution action is restored or used.

The inventory classifies legacy DataTree roots/variables/execution projections,
AppIDE loaders, ontology-specific Redux/saga/action paths, object-mode widgets,
and direct legacy runtime endpoints for removal or archive-readable treatment.
Native Datasource import, the Ontology plugin, provider/snapshot services, and
ordinary Appsmith Action/DataTree registries remain retain-native boundaries.
The inventory also records unresolved native import and repeated Table refresh
issues; those are not resolved by this checkpoint and are not grounds to
restore legacy paths.

## Action Server Deferred

Action Server request/response, authorization, retry, timeout, progress, audit,
and remote protocol behavior remain explicitly deferred. Tasks 6-8 only verify
adapter/reference shape, health-boundary behavior, and the absence of a new
protocol call. T9 adds no Action Server contract and no second execution chain.

## Current Workspace Revalidation (2026-08-18)

The T9 implementation remains present in checkpoint commit `c5c9a7dc67`. The
current uncommitted changes are later Ontology Query-mode work and did not
modify the T9 release package.

The original server command using only `-pl appsmith-server` encountered a
stale installed `appsmith-interfaces` artifact after the current workspace's
`primaryKey` interface change. Re-running through the Maven reactor with
`-am` compiled the current interface and produced:

- Targeted server release suite: 65 tests, 0 failures, 0 errors.
- Targeted client Release API/Redux/Panel suites: 2 suites, 20 tests, 0 failures.
- Prettier: passed for the T9 client files.
- ESLint: 0 errors and 9 non-blocking existing warnings.
- Single-worker T9 Playwright: selected the `[t9]` project but stopped before
  the test body because `CW_D0_USERNAME`, `CW_D0_PASSWORD`,
  `CW_D0_WORKSPACE_ID`, `CW_T9_APPLICATION_URL`, and `CW_T9_APPLICATION_ID`
  are unset.

The browser result is recorded as an environment limitation. It does not
replace the prior follow-up result that passed the complete T9 browser
scenario.

## T9 Non-Goals

- Do not restore removed Ontology loaders, reducers, Object Widget modes, or
  side-channel execution actions.
- Do not change the Action Server request/response contract.
- Do not add automatic Ontology upgrades, Provider failover, or background
  release activation.
- Do not add production deployment, production ACL policy, or a secret-
  management replacement.
- Do not change native Table, Form, Search, pagination, or Query rendering;
  those remain native Widget concerns.

## Gate Disposition

The implementation gate is **PASSED** based on the follow-up verification at
the top of this checkpoint: the server suite, client suites, and complete T9
browser scenario passed. The 2026-08-18 revalidation independently confirms
the server and client results, while its browser run remains environment-
blocked because the required `CW_*` variables are not available.
