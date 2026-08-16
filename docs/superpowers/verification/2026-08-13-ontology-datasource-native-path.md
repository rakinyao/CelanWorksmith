# Historical Task 12: Ontology Datasource Native Path Verification

> **Historical gate record:** Task 13 proceeded after this automated gate in
> the single-user development environment, including the documented manual-gate
> override. The legacy Object-mode path has since been removed. Current status
> and remaining manual checks are in
> [the replacement checkpoint](2026-08-13-ontology-datasource-replacement-checkpoint.md).

Date: 2026-08-14

## Scope

This record verifies the replacement path introduced by
`celanworksmith-ontology-plugin`:

```text
Ontology Datasource -> native Query/Action -> Query.data or Query.run() -> native Widget
```

The temporary AppIDE ontology loaders, Object widget modes, and `$objects`-style
DataTree roots are explicitly outside this path. They must remain until the
manual gate below passes.

## Automated Evidence

The following command completed successfully from `app/server`:

```bash
mvn -q -pl appsmith-interfaces -DskipTests install
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin -am test-compile -DskipTests
mvn -pl appsmith-plugins/celanworksmithOntologyPlugin \
  -DskipUTs=false \
  -Dtest=OntologyConfigurationTest,OntologyObjectQueryExecutorTest,OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false surefire:test
```

Result: 31 tests, 0 failures, 0 errors.

Verified contracts:

- Datasource configuration requires a fixed project/version/snapshot/digest/provider tuple.
- Object queries use only the pinned metadata, produce standard array results, and expose a native datasource structure.
- Metadata selectors return snapshot-derived Object, Property, Function, Action, and Link identifiers.
- Function and Link queries validate against the fixed snapshot before invoking the Provider.
- Action queries route only through the workspace Action Server protocol and preserve the audit ID on success and domain failure.
- Caller-provided Action Server context cannot override datasource project or snapshot identity.

The Integration Editor import component also passed its focused client suite:

```bash
cd app/client
yarn jest src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx --runInBand
```

Result: 4 tests, 0 failures. It verifies Demo import request serialization,
Platform Release pinning, native datasource-list refresh only after success,
visible import failure state, and Local YAML required fields.

Targeted client TypeScript validation also completed successfully:

```bash
cd app/client
yarn tsc --noEmit --pretty false
```

The current server lifecycle/import tests cover Demo YAML normalization and
ordinary datasource persistence, but cannot be freshly recompiled in this
checkout because of the baseline test-compilation limitation below. They are
therefore not recorded as fresh Task 12 evidence.

## Server Test Limitation

The controller and lifecycle suites currently cannot be freshly test-compiled
because the unrelated `RuntimeControllerAclTest` has ambiguous calls to the
two `RuntimeProvider` overloads for `queryObjects` and `getLinks`. A targeted
Surefire invocation can otherwise reuse stale compiled test classes, so its
success is not treated as fresh evidence. This is a pre-existing compilation
error and is not changed by the datasource work.

The import controller's production sources compile successfully with:

```bash
cd app/server
mvn -q -pl appsmith-server compile -DskipTests
```

The controller test added for this stage asserts that the authenticated session
email replaces any client-supplied `importedBy` value before import.

## Required Browser Gate

Complete these steps on a build containing the ontology plugin before Task 13:

1. Open the Datasources creation screen as a user with datasource-management permission.
2. In **Ontology datasource**, choose **Demo**, enter a datasource name, and import it.
3. Confirm the datasource appears in the ordinary workspace datasource list.
4. Create an ordinary Query using that datasource and choose an Object query for `PurchaseOrder`.
5. Run the Query and bind a standard Table to `{{PurchaseOrdersQuery.data}}`.
6. Confirm standard Table columns, search, sorting, and pagination remain native Table behavior.
7. Create and run a Function Query, a Link Query, and an Action Query. Confirm Action behavior is reported through the normal Query result/error contract.
8. Open a second App in the same workspace and confirm it can select the same workspace datasource without an App-specific ontology binding.
9. Attempt to import a second active version of the same project for the same App and confirm the lifecycle uniqueness rule blocks it.

Only after all nine checks pass may the legacy Object-mode execution path be
removed. Record the environment URL, datasource ID, query IDs, and actual
results in this file before starting Task 13.

## Gate Status

- Automated plugin execution gate: passed on 2026-08-14 (31 tests).
- Client import UI gate: passed on 2026-08-14 (4 tests and TypeScript check).
- Fresh server lifecycle/controller test compilation: blocked by the baseline
  `RuntimeControllerAclTest` ambiguity described above.
- Repository wiring regression: passed on 2026-08-14. The focused Spring
  context test verifies that `OntologyMetadataSnapshotRepository` can be
  created from configured Mongo properties when its test-only constructor is
  present.
- Browser/native deployment environment: ready on 2026-08-14. The deployed
  server loads `celanworksmith-ontology-plugin@1.0-SNAPSHOT`; backend health
  and the browser entry both return `200` at `http://10.10.110.129/`.
- Browser/native deployment gate: not started. The nine required manual cases
  above must be recorded before Task 13 begins.
- Task 13 legacy-path removal: prohibited until the browser gate is complete.
