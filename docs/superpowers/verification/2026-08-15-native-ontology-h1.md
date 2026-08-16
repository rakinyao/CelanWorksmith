# H1 Native Query Editor and Metadata Verification
Date: 2026-08-15
Branch: `feat/ontology-datasource-plugin`
Status: `PASSED`

## Scope

H1 adds a metadata-driven property projection selector to the native Object
Query editor. It does not add a Widget mode, a new DataTree root, or a second
execution path.

## Implemented Behavior

- Object Query exposes a `Properties to display` multi-select control.
- The control is enabled only after an Object Type is selected.
- Options come from the pinned snapshot through `ONTOLOGY_OBJECT_PROPERTIES`.
- The selected values are stable property IDs; display names remain editor
  labels.
- The dependent metadata request passes the selected `objectTypeId`.
- A native projection selector overrides the JSON definition projection.
- When the native selector is absent, the JSON definition projection remains
  unchanged.
- Non-list projection selectors and non-string entries are rejected before
  execution.
- Projection values are defensively copied into an immutable list.

## Changed Files

- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/object-query.json`
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java`
- `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyConfigurationTest.java`

## Verification

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin \
  -Dtest=OntologyConfigurationTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: PASS, 16 tests, 0 failures, 0 errors.

Additional checks:

- `jq empty appsmith-plugins/celanworksmithOntologyPlugin/src/main/resources/editor/object-query.json`: PASS.
- Prettier check for `object-query.json`: PASS.
- `git diff --check`: PASS.
- Scoped review: Spec compliance PASS; Code quality PASS; no remaining findings.

Existing Java Unsafe deprecation and multiple SLF4J provider warnings are
non-blocking environment/test-harness warnings.

## Boundary

H1 does not yet provide first-class visual controls for filters, sort, or page
parameters. Those remain part of later native editor usability work. The
advanced JSON control continues to edit the same normalized query definition.
