# Release JSON Workspace Import Verification

Date: 2026-09-04

## Automated Evidence

The generated runtime data is deterministic and is the source used by the
native-path integration test:

```bash
node scripts/celanworksmith/generate-business-core-runtime-data.mjs
node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs
node --test scripts/celanworksmith/seed-runtime-mongodb.test.mjs
```

The generated `ont_*` fixture contains 15 suppliers, 75 customers, 260
contracts, and 95 purchase orders. The integration test starts an isolated
MongoDB container, seeds those four collections, imports the audited Release
through `OntologyDatasourceService`, reads the persisted datasource snapshot,
and queries through `OntologySnapshotRuntimeGateway`.

```bash
cd app/server
TESTCONTAINERS_RYUK_DISABLED=true mvn -pl appsmith-server -am \
  -Dtest=ReleaseJsonDatasourceIntegrationTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: passed, 1 test, 0 failures. The test asserts all four generated
assets, Chinese supplier and customer values, a `contract_customer` traversal,
a supplier filter, contract pagination, and the contract total aggregate.

The complete selected Maven verification command is:

```bash
cd app/server
TESTCONTAINERS_RYUK_DISABLED=true mvn -pl appsmith-server -am \
  -Dtest=OntologyModelReleaseParserTest,OntologyModelReleaseMapperTest,WorkspaceDomainRuntimeBindingResolverTest,LocalReleaseJsonOntologyProjectImporterTest,OntologyDatasourceServiceTest,OntologyDatasourceControllerTest,ReleaseMappedMongoRuntimeAdapterTest,MongoRuntimeDataProviderTest,ReleaseJsonDatasourceIntegrationTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: passed. The selected suite covers 70 tests with 0 failures or errors.

The repository declares Yarn 3.5.1 under `app/client`. Dependencies were
restored without a proxy using:

```bash
cd app/client
corepack yarn install --immutable
corepack yarn g:jest src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx
```

The focused client test explicitly selects `en-US` for its English accessible
name assertions and restores the product default `zh-CN` after each case.
Result: passed, 8 tests, 0 failures.

The browser coverage is intentionally local-only and does not use the
configured external default URL. It requires an explicitly supplied local
`PLAYWRIGHT_BASE_URL`, an existing local test user, and a workspace whose
`business` domain is bound to the seeded runtime provider:

```bash
cd app/client
PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 \
CW_RELEASE_JSON_USERNAME=<existing-local-user> \
CW_RELEASE_JSON_PASSWORD=<existing-local-password> \
CW_RELEASE_JSON_WORKSPACE_ID=<business-bound-workspace-id> \
npx playwright test --config=playwright/d0.config.ts \
  playwright/tests/d0/ontology-release-json-import.spec.ts
```

The test uploads the fixture bytes as `LOCAL_RELEASE_JSON`, selects the
created datasource in an application, executes a Supplier query, and waits
for Chinese runtime rows. It is skipped when those local-only inputs are not
present. No production account or external system is contacted.

The dedicated `d0` Playwright configuration discovers this test (one test
listed). Its fixture path is rooted at the repository rather than `app/docs`.
In this environment the focused run is skipped because there is no explicit
local base URL, user, password, or business-bound workspace. This is a local
runtime prerequisite, not a test-discovery or fixture-path failure.

Docker Hub cannot currently supply Testcontainers' Ryuk helper image in this
environment. A direct pull stalled, then a temporary proxy-environment retry
reported that the Docker Desktop daemon has no HTTPS proxy configured. The
local `mongo:8` image is available, so the isolated integration test uses the
documented `TESTCONTAINERS_RYUK_DISABLED=true` workaround. This setting is
not committed and does not bypass the MongoDB container or native runtime
pipeline.

## Manual Acceptance

For a local runtime environment, first generate and seed the same data:

```bash
node scripts/celanworksmith/generate-business-core-runtime-data.mjs
mongosh <local-runtime-uri> scripts/celanworksmith/seed-runtime-mongodb.js
```

Create or use a local test workspace with an administrator-managed
`business` binding to `demo-mongo-readonly`. Import
`docs/superpowers/fixtures/ontology-model-release-demo.json` through the
native datasource import form, create a query from its datasource, select
Supplier, and run it. The result contains Chinese supplier names. Verify the
same datasource can query Customer, Contract, and Purchase Order; filter a
supplier code, paginate Contracts, and open the Contract-to-Customer link.

## Contract Change Register

All changes remain provisional until the final modelling contract is
published. Final integration must preserve the native datasource -> immutable
metadata snapshot -> `OntologySnapshotRuntimeGateway` -> `RuntimeProvider`
pipeline.

| Seam | Current file | Replacement trigger |
| --- | --- | --- |
| v2 Release syntax, digest, accepted kinds | `OntologyModelReleaseParser` | Final parser/version contract. |
| Release entity/link/runtime binding mapping | `OntologyModelReleaseMapper` | Final localized metadata, composite-key, capability, and element-kind contract. |
| workspace/domain opaque binding resolution | `WorkspaceDomainRuntimeBindingResolver` | Administrator persistence, policy, per-asset override, and platform binding contract. |
| local file import to parsed/mapped snapshot | `LocalReleaseJsonOntologyProjectImporter` | Remote Release client feeding the same parsed/mapped path. |
| immutable domain/digest/binding audit fields | `OntologyMetadataSnapshot` | Final audit schema. |
| explicit runtime columns and link fields | `OntologyProjectDefinition` | Governed common runtime-mapping schema. |
| mapped top-level Mongo transport | `ReleaseMappedMongoRuntimeAdapter` | Governed-data transport change while retaining `RuntimeProvider`. |
| development `business` bootstrap | `ReleaseRuntimeBindingProperties` | Restricted administrator-managed binding persistence/configuration. |

## Non-Goals

This verification does not prove modelling-platform connectivity, production
governed-data access, administrator UI for domain bindings, per-asset
overrides, Function/Action mapping, or Release signing.
