# H5 Platform Provider and Upgrade Verification

Date: 2026-08-15
Branch: `feat/ontology-datasource-plugin`

## Gate Decision

`PASSED` as a verification-only phase. Existing importer, Provider, snapshot,
Datasource, compatibility, upgrade, audit, and rollback implementations satisfy
the current development contract; no production code was changed in H5.

Verified behavior:

- local YAML, Demo, and platform release inputs normalize to pinned snapshots;
- platform imports use the requested release and preserve Provider identity;
- Provider health/capability and object/property mapping checks run before
  Datasource creation;
- one native Ontology Datasource can be listed for multiple Apps without
  application-local duplicate binding state;
- stable project/version/snapshot/digest identity is retained;
- compatible, manual, and blocking upgrade impacts are reported;
- explicit upgrade and exact rollback are audited;
- conflicting active versions and invalid rollback transitions are rejected;
- automatic version switching is not present.

## Focused Verification

```bash
cd app/server
mvn -q -pl appsmith-server \
  -Dtest=OntologyDatasourceControllerTest,OntologyDatasourceServiceTest,OntologyDatasourceUpgradeServiceTest,OntologyMetadataSnapshotRepositoryWiringTest,OntologyProjectImportTest,OntologyProjectYamlImporterTest,OntologySnapshotRuntimeGatewayTest,OntologySnapshotServiceTest,RuntimeProviderCompatibilityValidatorTest,MongoOntologyProjectRegistryTest \
  -Dsurefire.failIfNoSpecifiedTests=false test
```

Result: `PASS`, exit code `0`. MongoDB connected successfully at
`localhost:27017`. Maven emitted only existing JVM/Byte Buddy, multiple SLF4J,
and normal driver logging warnings.

## Boundary Notes

The runtime Provider remains behind the pinned Datasource configuration. YAML
is an exchange/version format, not a Widget or Query runtime dependency. A
future platform importer can replace the YAML importer while preserving the
same normalized snapshot and native Query definitions.

## Files

- `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceService.java`
- `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceUpgradeService.java`
- `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceCompatibilityService.java`
- `.superpowers/sdd/2026-08-15-native-ontology-next-phase/h5-provider-brief.md`
