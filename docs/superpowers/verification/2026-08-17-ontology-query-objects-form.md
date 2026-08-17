# Ontology Query Objects Structured Form Verification

Date: 2026-08-17
Branch: `feat/ontology-datasource-plugin`

## Status

Automated verification passed. The focused implementation is suitable for
review, but the complete nine-step manual UI flow is not cleared because only
the existing limited native-path browser scenario was run. The next phase
should wait for the remaining manual checks.

## Backend Tests

The exact command from the brief was attempted first:

```bash
cd app && ./mvnw -pl server/appsmith-plugins/celanworksmithOntologyPlugin test
```

Result: exit `127`. This checkout has no `app/mvnw` wrapper. The failure is an
environment/repository-layout limitation, not a test or implementation
failure.

The equivalent focused command used the available system Maven and bounded
JVM memory:

```bash
cd app
MAVEN_OPTS='-Xmx2g -XX:MaxMetaspaceSize=512m' \
  mvn -f server/pom.xml \
  -pl appsmith-plugins/celanworksmithOntologyPlugin test
```

Result: exit `0`; `64` tests run, `64` passed, `0` failures, `0` errors, `0`
skipped. Suites: `OntologyActionConfigurationTest` 12,
`OntologyFunctionLinkActionExecutorTest` 16, `OntologyQueryOperatorCatalogTest`
4, `OntologyConfigurationTest` 17, and `OntologyObjectQueryExecutorTest` 15.
Maven reported `BUILD SUCCESS`. Existing multiple-provider SLF4J and log4j
no-appender warnings were non-blocking.

## Client Tests

The brief's helper command was attempted:

```bash
cd app/client
NODE_OPTIONS='--max-old-space-size=2048' \
  yarn g:jest FieldArrayControl DropDownControl PaginationControl --runInBand
```

Result: exit `1` before test discovery. The repository `g:jest` script always
adds `--maxWorkers=50%`, and Jest rejects that together with `--runInBand`.

The equivalent direct Jest command was run serially:

```bash
cd app/client
NODE_OPTIONS='--max-old-space-size=2048' \
  yarn jest --colors --no-cache --silent \
  FieldArrayControl DropDownControl PaginationControl --runInBand
```

Result: `4` suites passed and `31` tests passed.

The changed query-generator and native-binding tests were run separately,
serially, with these commands:

```bash
cd app/client
NODE_OPTIONS='--max-old-space-size=2048' \
  yarn jest --colors --no-cache --silent \
  src/utils/WidgetQueryGeneratorRegistry.test.ts --runInBand
```

Result: `1` suite passed and `6` tests passed.

```bash
cd app/client
NODE_OPTIONS='--max-old-space-size=2048' \
  yarn jest --colors --no-cache --silent \
  src/widgets/TableWidgetV2/widget/__tests__/nativeQueryMode.test.ts \
  --runInBand
```

Result: `1` suite passed and `3` tests passed.

No focused test failed due to an implementation regression. No production fix
was made.

## Resources and Build Artifacts

All `9` ontology plugin resource JSON files were parsed successfully with
Node's `JSON.parse`.

The editor resource shape was checked for the `7` required controls: Query
mode, Object Type, Properties, Filters, Sort, Pagination, and Advanced JSON
definition. The four dependent controls are gated by `objectTypeId`, and the
Advanced JSON control is gated by `ADVANCED` mode.

The focused plugin package command was:

```bash
cd app
MAVEN_OPTS='-Xmx2g -XX:MaxMetaspaceSize=512m' \
  mvn -f server/pom.xml \
  -pl appsmith-plugins/celanworksmithOntologyPlugin package -DskipTests
```

Result: exit `0`; Maven reported `BUILD SUCCESS`. The resulting jar contains
`editor/action-query.json`, `editor/function-query.json`,
`editor/link-query.json`, `editor/object-query.json`, and `editor/root.json`.
The packaged `editor/object-query.json` matches the source byte-for-byte.

No tracked frontend build, bundle, map, or other generated source changed.
The temporary Cypress video was removed and no generated output is included
in the documentation commit.

## Browser and Manual Evidence

The existing browser scenario was run without adding automation:

```bash
cd app/client
unset ELECTRON_RUN_AS_NODE
CYPRESS_BASE_URL=http://127.0.0.1 \
  CYPRESS_USERNAME="$(cat /tmp/cw-d0-user)" \
  CYPRESS_PASSWORD='<local verification credential>' \
  ./node_modules/.bin/cypress run \
  --spec cypress/e2e/CelanWorksmith/OntologyDatasourceNativePath_spec.ts \
  --browser electron
```

Result: `1` test passed in `1m46s`. It imported the demo datasource, created a
native PurchaseOrder query, bound a native Table, and verified zero execution
on binding followed by one execution after explicit Run. Cypress also emitted
the existing missing `.env` and browser-family warnings.

The exact Task 6 manual flow remains unfinished:

| Check | Result |
| --- | --- |
| Create Query with `Query Objects` | Covered by existing scenario |
| Select `PurchaseOrder` | Covered by existing scenario |
| `delayDays` with `gt 0` | Not run |
| Descending sort by `delayDays` | Not run |
| Limit `2`, offset `0` | Not run |
| Run and bind to native Table | Covered by existing scenario |
| Change to `Supplier` and clear dependent fields | Not run |
| Advanced JSON edit, run, restore Builder | Not run |
| Invalid operator/value blocks run with English error | Not run |

The live backend health endpoint returned HTTP `200`. The frontend initially
returned nginx `502` because the dev server was not running; the existing
client dev server was then started in memory and returned HTTP `200` on ports
80 and 3000. No full manual browser session was completed after that startup.

## Scope and Concerns

- Function, Action, and Link redesign remain out of scope.
- Widget visual optimization remains out of scope.
- No ontology-specific parallel execution path, `$objects` binding, or Object
  Widget mode was added.
- No datasource contract document update is required; the current structured
  form design already documents operator metadata, canonical fields, advanced
  JSON, native Table binding, and the excluded operations.
- The missing Maven wrapper and the `g:jest` flag conflict should be resolved
  by repository/tooling owners separately; neither indicates an implementation
  regression.

## Gate Decision

Automated checks and package/resource verification pass. The next phase is not
fully cleared until the nine-step manual UI flow records results for filters,
sorting, pagination, dependent-field clearing, Advanced JSON, and invalid
input handling.
