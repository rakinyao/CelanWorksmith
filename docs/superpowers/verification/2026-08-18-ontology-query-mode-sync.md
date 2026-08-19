# Ontology Query Mode Synchronization Checkpoint

**Date:** 2026-08-18
**Scope:** Task 8 verification for synchronized `OBJECT_QUERY` Builder and Advanced JSON modes.
**Status:** Focused automated verification passed; manual browser verification remains pending.

## Automated Evidence

### Frontend Jest

Command:

```bash
cd app/client
yarn jest \
  src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.test.ts \
  src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts \
  src/WidgetQueryGenerators/Ontology/index.test.ts \
  --runInBand --no-cache
```

Result:

```text
Test Suites: 3 passed, 3 total
Tests:       49 passed, 49 total
Snapshots:   0 total
Time:        14.146 s
```

The focused suites cover canonical serialization/parsing and validation,
Builder/Advanced synchronizer behavior, generated Ontology Query definitions
including dynamic bindings, initial-value merging, TOTAL definitions, invalid
Advanced input retention, and metadata-unavailable transitions.

### Ontology Plugin Maven Tests

Command:

```bash
cd app/server
mvn -pl appsmith-plugins/celanworksmithOntologyPlugin -am \
  -Dtest=OntologyActionConfigurationTest,OntologyConfigurationTest,OntologyObjectQueryExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result:

```text
OntologyActionConfigurationTest: Tests run: 21, Failures: 0, Errors: 0
OntologyConfigurationTest:       Tests run: 17, Failures: 0, Errors: 0
OntologyObjectQueryExecutorTest: Tests run: 29, Failures: 0, Errors: 0
Total:                            Tests run: 67, Failures: 0, Errors: 0
BUILD SUCCESS
```

The reactor build includes the `interfaces` dependency so the plugin and
runtime gateway use the same current class definitions. Null/unresolved widget
pagination values now use the configured default page values.

Existing SLF4J provider and log4j appender warnings were also emitted; they did
not affect the test assertions.

### Formatting and Diff Checks

Command:

```bash
cd app/client
yarn exec prettier --check \
  src/WidgetQueryGenerators/Ontology/index.ts \
  src/WidgetQueryGenerators/Ontology/index.test.ts \
  src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.ts \
  src/PluginActionEditor/components/QueryModeSynchronizer/ontologyObjectQueryDefinition.test.ts \
  src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.tsx \
  src/PluginActionEditor/components/QueryModeSynchronizer/QueryModeSynchronizer.test.ts \
  src/pages/Editor/FormControl.tsx \
  src/sagas/OneClickBindingSaga.ts \
  src/sagas/OneClickBindingMessages.ts \
  src/sagas/OneClickBindingMessages.test.ts
```

Result: `All matched files use Prettier code style!` after the controller
formatted the two synchronizer files.

Command:

```bash
git diff --check
```

Result: passed with no whitespace errors.

### Full TypeScript Baseline

Command:

```bash
cd app/client
yarn tsc --noEmit --pretty false
```

Result: fails in the repository-wide type baseline with extensive existing
errors across design-system and widget packages (for example missing JSX
intrinsic element declarations). The focused Jest suites compile and exercise
the changed modules; this task did not modify those unrelated baseline errors.

## Manual Verification Checklist

The following scenarios are the required browser checks. They were recorded
for the next manual validation pass and were not run as part of this
low-memory focused verification:

- [ ] Generate a Table Query for `PurchaseOrder` from the Ontology datasource
      and confirm the generated Query uses native Appsmith Query execution.
- [ ] In Builder mode, configure Object Type, projection, filter, sort, and
      page, switch to Advanced, and confirm the editor contains the exact
      canonical JSON rather than a placeholder example.
- [ ] Edit valid Advanced JSON for filter, sort, and page, switch to Builder,
      and confirm every corresponding control is hydrated.
- [ ] Enter malformed or metadata-invalid Advanced JSON and confirm Advanced
      remains selected, the last valid definition is retained, and an English
      validation error is shown.
- [ ] Use dynamic pagination bindings such as
      `{{Table1.pageSize}}` and `{{Table1.pageOffset}}`; confirm they remain
      unchanged through both mode transitions.
- [ ] Execute the native Table Query and confirm returned rows, filtering,
      sorting, and pagination follow the persisted definition.

## Service and Deployment

No frontend build, plugin deployment, service restart, or health check was
performed for this checkpoint. Task 8 was limited to focused tests and static
verification, and no new runtime artifact was deployed.

## Known Boundaries

- The full repository TypeScript check remains blocked by unrelated existing
  type errors outside this task's changed modules.

## Follow-up Editor Polish

- The Advanced JSON control is explicitly disabled whenever Query Mode is not
  `ADVANCED`, so Builder mode cannot edit the canonical JSON field even if a
  stale control remains visible during form re-evaluation.
- Builder-to-Advanced and generated Query definitions use two-space formatted
  JSON for readability; the underlying canonical serializer retains compact
  output by default for compatibility.
- Follow-up verification: frontend focused suites `49/49`,
  `OntologyConfigurationTest` `17/17`, Prettier, and `git diff --check` passed.
- Manual browser validation is still required before claiming end-to-end
  release readiness.
- The two synchronizer files were formatted; no outstanding Prettier issue remains.
