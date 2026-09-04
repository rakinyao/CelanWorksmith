# Task 4 Report: Release-Mapped Mongo Runtime Query Adapter

## Summary

- Added `ReleaseMappedMongoRuntimeAdapter`, selected exclusively from immutable
  `OntologyProjectDefinition.runtimeMappings` records.
- Release-backed queries read top-level BSON `Document` fields, resolve mapped
  filters, sort, search, primary keys, and explicit release link mappings.
- Preserved legacy Mongo query behavior, including nested `properties.*`
  paths and its existing table allowlist.
- Added definition-specific Mongo metadata capabilities for all Release
  business assets; legacy definitions retain the static capability map.

## TDD Evidence

The focused suite was run after adding regressions for numeric release primary
keys and legacy table isolation. It failed as intended before the fixes:

```text
Tests run: 34, Failures: 2, Errors: 0
- getsReleaseObjectsByTheirMappedPrimaryKey: customer/"1" could not find a
  BSON numeric `source_customer_id`.
- rejectsReleaseAssetTablesForDefinitionsWithoutReleaseMappings: a legacy
  definition using `ont_contract` reached Mongo instead of being rejected.
```

The adapter now coerces public primary-key IDs from the mapped property type
for `INTEGER`, `DECIMAL`, and `BOOLEAN` values before `getObject` or source
link lookup. Release tables are resolved through a separate
`releaseCollectionFor` method, leaving `collectionFor` legacy-only.

## Verification

```bash
cd app/server
mvn -pl appsmith-server -am \
  -Dtest=ReleaseMappedMongoRuntimeAdapterTest,MongoRuntimeDataProviderTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: `Tests run: 35, Failures: 0, Errors: 0, Skipped: 0`; build succeeded.

## Review Follow-ups

- Fixed the default Release sort to use the explicit primary-key mapping.
- Fixed numeric release primary-key lookup and guarded legacy table behavior.
- Fixed primary-key filters, searches, DTO values, and explicit link source
  reads to use the same explicit primary-key mapping as object lookup and
  default sort.
- `ReleaseMappedMongoRuntimeAdapter.java` matches the repository `mongodb*`
  ignore rule and must be staged with `git add -f`.
