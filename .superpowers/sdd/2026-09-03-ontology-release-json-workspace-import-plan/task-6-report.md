# Task 6 Report: Release JSON Native-Path Verification

## Changes

- Added `ReleaseJsonDatasourceIntegrationTest`, backed by an isolated
  Testcontainers MongoDB instance and the generated four-asset runtime data.
- Added a local-only Playwright flow that imports Release JSON, selects the
  resulting datasource, runs a Supplier query, and checks Chinese rows.
- Added the verification record and provisional contract change register.

## TDD And Verification

- The first native test compilation exposed incorrect test wiring for
  `RuntimeProviderCompatibilityValidator`; the validator requires a
  `RuntimeProviderRegistry`.
- The first executable test run exposed an invalid null sort direction in the
  test request. The native query contract requires `asc` or `desc`; the test
  now uses `asc` for its default request.
- `TESTCONTAINERS_RYUK_DISABLED=true mvn -pl appsmith-server -am
  -Dtest=ReleaseJsonDatasourceIntegrationTest
  -Dsurefire.failIfNoSpecifiedTests=false test` passed: 1 test, 0 failures.
- The selected Maven suite passed: 70 tests, 0 failures or errors.
- `corepack yarn install --immutable` completed with Yarn 3.5.1. The deferred
  client test explicitly selects `en-US` for its English label assertions and
  restores the default `zh-CN` after each case. It passed: 8 tests, 0
  failures. A matcher not registered by the Jest environment was replaced
  with the equivalent standard Jest null assertion.
- The dedicated `playwright/d0.config.ts` discovers the new test. The fixture
  path was corrected to resolve from the repository root. The focused run is
  skipped only when its explicitly required local URL, user, password, and
  business-bound workspace are absent.
- Docker Hub was unavailable to Docker Desktop for the Ryuk helper image even
  with temporary proxy environment variables. The local `mongo:8` image let
  the isolated integration test run with Ryuk disabled; no environment or
  proxy configuration was committed.

## Remaining Verification

- Local Playwright acceptance requires a running local application, an
  existing test user, and a workspace bound to the seeded `business` runtime.
