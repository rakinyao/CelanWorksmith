# D1 Pinned Metadata and Native Query Verification

Date: 2026-08-14

## Scope

D1 extends the native Ontology Datasource metadata and Query editor contract.
It does not add a Widget mode, a new DataTree root, or a second execution
path.

## Implemented Contract

- Object, Function, Action, Link, and visible Property metadata triggers return
  stable IDs together with safe display labels and semantic fields.
- Hidden properties are excluded from metadata options and cannot be supplied
  as Function or Action parameters.
- Object Query editor defaults include projection, typed filter conditions,
  sort, and offset/limit page fields inside `definition`.
- Action and Link object-type controls use the native metadata trigger rather
  than free-form Object Type text.
- Query execution still validates the pinned snapshot and returns the normal
  array-valued Appsmith result for Object Query.
- DTO metadata is mapped through `OntologySnapshotRuntimeGateway`; no live
  project lookup or Widget-specific state was introduced.

## Verification

Focused plugin suite:

```bash
cd app/server
mvn -q -pl appsmith-plugins/celanworksmithOntologyPlugin \
  -Dtest=OntologyConfigurationTest,OntologyObjectQueryExecutorTest,OntologyFunctionLinkActionExecutorTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: PASS, 37 tests.

The review regression was verified RED first: hidden Function parameters were
accepted before the validator change. After filtering hidden metadata before
parameter lookup and required-parameter checks, the focused suite passed.

Server compilation:

```bash
cd app/server
mvn -q -pl appsmith-server -am -DskipTests compile
```

Result: PASS.

Formatting and whitespace:

```bash
cd app/client
./node_modules/.bin/prettier --check src/i18n/resources/en-US.ts
cd ../server
git diff --check
```

Result: PASS.

Scoped review: APPROVED after the hidden-parameter filtering fix. The review
also recorded that broader label-sanitization and DTO mapping coverage can be
expanded later; they are not required to change the current native contract.

## Residual Gates

- D0 native Table execution-count evidence is complete and recorded in
  `2026-08-14-ontology-native-path-stabilization.md`.
- D1 does not claim browser-level Query editor interaction; the current proof
  is plugin/resource contract coverage. D2 owns native Widget compatibility.
