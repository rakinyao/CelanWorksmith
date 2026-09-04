# Task 2 Report: Workspace-Domain Managed Binding And Local JSON Import

## Status

Complete. Local Release JSON imports now resolve an exact workspace/domain
managed runtime binding, enforce its allowlisted assets, pin the resolved
provider, and persist Release provenance separately from the canonical mapped
project digest. Existing YAML, Demo, and Platform import sources remain
compatible through the context-aware source adapter.

## Commits

- `feat(ontology): import release JSON by workspace binding`

## TDD Evidence

- RED: the mandated focused Maven command failed during test compilation with
  missing `WorkspaceDomainRuntimeBindingResolver`,
  `ReleaseRuntimeBindingProperties`, `LocalReleaseJsonOntologyProjectImporter`,
  `OntologyProjectImportContext`, and `LOCAL_RELEASE_JSON` symbols.
- GREEN: the same command completed successfully with 3 tests, 0 failures, and
  0 errors (1 resolver test and 2 importer tests).
- Compatibility GREEN: the existing ontology import, datasource service,
  controller, snapshot, parser, and mapper tests completed successfully (25
  focused datasource/import tests; the full `com.celanworksmith.ontology` test
  selection also completed without failures).

## Tests

```text
mvn -pl appsmith-server -am -Dtest=WorkspaceDomainRuntimeBindingResolverTest,LocalReleaseJsonOntologyProjectImporterTest -Dsurefire.failIfNoSpecifiedTests=false test
PASS: 3 tests, 0 failures, 0 errors

mvn -pl appsmith-server -am -Dtest=OntologyProjectImportTest,OntologyDatasourceServiceTest,OntologySnapshotServiceTest,OntologyDatasourceControllerTest -Dsurefire.failIfNoSpecifiedTests=false test
PASS: 25 tests, 0 failures, 0 errors
```

## Files

- Added binding/context/properties/resolver and local Release JSON importer.
- Extended import source kinds, context adaptation, imported project metadata,
  immutable snapshot provenance, and snapshot validation.
- Registered parser, mapper, resolver, importer, and configuration properties
  in `CelanWorksmithConfiguration`.
- Added development-profile business binding for the four exact
  `${source_dataset_id}:public.ont_*` asset references.
- Added resolver/importer tests.

## Self-review

The Release parser and mapper are used as the public immutable contract; raw
JSON is not reinterpreted. Runtime provider input from the request is ignored
for Release JSON. Binding lookup is keyed only by the exact workspace and
domain, with duplicate binding and asset validation at resolver construction.
Snapshot metadata digest remains the canonical mapped-project digest, while
the validated Release digest, domain, and managed binding ID are stored in
separate immutable fields. The HTTP request does not expose `importedBy` to
Jackson; the controller supplies the authenticated actor before authorization
and context creation.

## Concerns

The development binding uses the literal `${source_dataset_id}` token to match
the checked-in Release asset references; deployment should provide the same
managed runtime asset namespace when enabling the development profile. Legacy
one-argument source calls use a non-authenticated compatibility actor and are
intended only for existing internal callers; the authorized datasource service
always creates and passes the server-side context.
