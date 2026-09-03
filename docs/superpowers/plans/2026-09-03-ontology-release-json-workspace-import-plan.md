# Ontology Release JSON Workspace Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a workspace user upload an `ontology-model` v2 Release JSON and
create a native ontology datasource backed by an administrator-managed
workspace/domain runtime environment, then query the generated Demo assets.

**Architecture:** Add a local Release JSON importer and a narrow Release-to-
`OntologyProjectDefinition` mapper. A workspace-domain binding resolver
chooses the managed provider before any snapshot is persisted. Extend the
Mongo runtime adapter to use the imported runtime-table and link mappings for
Release-backed top-level Mongo documents; the existing legacy nested
`properties` document behavior remains unchanged.

**Tech Stack:** Java 21, Spring WebFlux, Jackson `ObjectMapper`, reactive
MongoDB, React/TypeScript, Jest, JUnit 5, Reactor Test, Playwright.

## Global Constraints

- This is an intentionally provisional compatibility implementation while the
  modelling contract is still being finalized; all provisional seams listed in
  `## Contract Change Register` must remain explicit and covered by tests.
- Accept only `format: "ontology-model"` and `format_version: 2`; validate the
  Release SHA-256 digest before persisting a snapshot.
- Do not modify the audited Release fixture or place runtime rows inside it.
- Release JSON must not contain hosts, credentials, connection strings, or
  provider implementation details. Datasource configuration stores only an
  opaque managed binding and Release/snapshot identifiers; the server-side
  immutable snapshot retains the resolved provider ID required by the native
  runtime registry.
- Import resolution is `workspaceId + domain -> managed runtime environment`.
  There is no global fallback, cross-workspace lookup, or importer-visible
  Runtime Provider ID.
- First-release mapping supports `entity_set`, `entity_set_link`, and
  `runtime_binding`; reject Function/Action and unsupported kinds.
- Every Release entity link must be `VERIFIED`; every source/destination field
  and runtime field/primary-key mapping must resolve.
- Preserve the existing `Demo`, `LOCAL_YAML`, and `PLATFORM_RELEASE` behavior.
- Preserve the native datasource -> metadata snapshot ->
  `OntologySnapshotRuntimeGateway` -> `RuntimeProvider` query pipeline.
- Do not add a direct frontend MongoDB path, a parallel ontology state store,
  or a runtime binding selection control for ordinary users.
- Existing legacy `suppliers`/`purchase_orders` collections and nested
  `properties.*` Mongo document behavior remain supported.
- The Demo workspace binding maps `business` to the managed local Mongo
  provider; its Release assets are `ont_supplier`, `ont_customer`,
  `ont_contract`, and `ont_purchase_order`.

## Contract Change Register

The following files are deliberate compatibility seams, not final modelling
platform protocol implementations. Keep their scope isolated; when the
modelling team publishes a final contract, change these units before changing
the datasource controller, UI, or runtime gateway.

| Seam | Temporary responsibility | Future contract change location |
| --- | --- | --- |
| `OntologyModelReleaseParser` | v2 JSON syntax, canonical digest, accepted element kinds | Replace/add parser versions here; do not spread JSON parsing to callers. |
| `OntologyModelReleaseMapper` | maps `entity_set`, `entity_set_link`, `runtime_binding` into legacy project DTOs | Extend here for final localized metadata, composite keys, capabilities, and element kinds. |
| `WorkspaceDomainRuntimeBindingResolver` | resolves one opaque binding by workspace/domain | Add final administrator persistence, environment policy, per-asset overrides, and platform-published binding support here. |
| `LocalReleaseJsonOntologyProjectImporter` | local file bytes -> parsed Release -> mapper -> snapshot | Future remote Release client must feed the same parsed/mapped path. |
| `OntologyMetadataSnapshot` extension | retains domain, Release digest and opaque binding identity | Migrate this snapshot record in one place if the final audit schema changes. |
| `OntologyProjectDefinition` mapping extension | retains explicit Release runtime column and link-field mappings with the immutable snapshot | Replace this metadata extension only if the final common project contract gains a governed runtime-mapping schema. |
| `ReleaseMappedMongoRuntimeAdapter` | reads top-level Release asset documents using mapped field names and link mappings | Replace only this adapter if governed-data transport changes; retain `RuntimeProvider` interface. |
| `ReleaseRuntimeBindingProperties` | development bootstrap for `business -> demo-mongo-readonly` | Replace with restricted administrator-managed binding persistence/configuration. |

The Release JSON remains authoritative for semantic definitions. The local
binding bootstrap is an environment configuration, not a second ontology
definition and not a source of field/link semantics.

## Files

| Path | Responsibility |
| --- | --- |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelRelease.java` | Parsed v2 Release model and element records. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelReleaseParser.java` | Strict JSON parsing, canonical digest validation, structural validation. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelReleaseMapper.java` | Release element to existing project DTO mapping. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/project/OntologyProjectDefinition.java` | Immutable, persisted project-level runtime mapping metadata. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/ObjectTypeDTO.java` | Backwards-compatible mapped runtime-column metadata. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/LinkTypeDTO.java` | Backwards-compatible explicit source/destination runtime-field metadata. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/WorkspaceDomainRuntimeBinding.java` | Opaque workspace/domain managed binding record. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/WorkspaceDomainRuntimeBindingResolver.java` | Workspace/domain binding lookup contract. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/ReleaseRuntimeBindingProperties.java` | Development bootstrap configuration properties. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/LocalReleaseJsonOntologyProjectImporter.java` | `LOCAL_RELEASE_JSON` import source. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyProjectImportSource.java` | Add `LOCAL_RELEASE_JSON` source kind and server context. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyProjectImportContext.java` | Server-created workspace and authenticated actor context for importers. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyMetadataSnapshot.java` | Persist Release domain, digest, mapping and opaque binding identity. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologySnapshotService.java` | Create snapshots with the extended immutable metadata. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceService.java` | Authorize and construct server import context; persist only opaque binding identity. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologySnapshotRuntimeGateway.java` | Resolve provider exclusively from the persisted snapshot for provider-blind datasource execution. |
| `app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyRuntimeGateway.java` | Provider-blind gateway operations keyed only by immutable snapshot. |
| `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyDatasourceConfiguration.java` | Read opaque binding metadata and no provider implementation ID. |
| `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java` | Call provider-blind gateway operations. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/release/ReleaseDatasourcePinExtractor.java` | Derive the audited provider from the pinned snapshot rather than datasource properties. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/CelanWorksmithConfiguration.java` | Register parser, mapper, resolver, properties, and local JSON importer. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeDataProvider.java` | Branch between legacy nested data and Release-mapped top-level data; use explicit link mappings. |
| `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/RuntimeTableMapping.java` | Allow only Release asset names exposed by a resolved managed binding. |
| `app/client/src/api/OntologyDatasourceApi.ts` | Add `LOCAL_RELEASE_JSON` request type; keep Provider ID optional only for legacy YAML. |
| `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.tsx` | Add JSON source option, file validation, and hidden provider field. |
| `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx` | Release JSON form and request-shape regressions. |
| `app/client/src/i18n/resources/en-US.ts` | English Release JSON import copy. |
| `app/client/src/i18n/resources/zh-CN.ts` | Chinese Release JSON import copy. |
| `scripts/celanworksmith/seed-runtime-mongodb.js` | Keep four Release asset seed calls available for local acceptance. |
| `docs/superpowers/verification/2026-09-03-ontology-release-json-workspace-import.md` | Final automated and manual acceptance record plus provisional seam inventory. |

## Tasks

### Task 1: Strict Release Parser And Legacy DTO Mapper

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelRelease.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelReleaseParser.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release/OntologyModelReleaseMapper.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/project/OntologyProjectDefinition.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/ObjectTypeDTO.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/LinkTypeDTO.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologySnapshotService.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyRuntimeSnapshotProjection.java`
- Create: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/release/OntologyModelReleaseParserTest.java`
- Create: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/release/OntologyModelReleaseMapperTest.java`

**Interfaces:**
- `OntologyModelReleaseParser.parse(byte[] metadata): OntologyModelRelease`
  returns only a valid v2 Release or throws `IllegalArgumentException` with a
  sanitized import-safe reason.
- `OntologyModelReleaseMapper.map(OntologyModelRelease release): OntologyProjectDefinition`
  returns object types, links, no functions/actions, and explicit Release
  runtime-table, runtime-column, primary-key, and source-to-target link-field
  mappings. The mapping is persisted as part of the immutable project
  definition, rather than held in a process-local registry.
- Parser and mapper are the sole v2 Release semantic seam; importer code does
  not inspect raw JSON nodes.

- [ ] **Step 1: Write failing parser and mapping tests**

```java
@Test
void parsesTheAuditedBusinessReleaseAndMapsItsFourObjects() {
    OntologyModelRelease release = parser.parse(fixtureBytes());

    OntologyProjectDefinition definition = mapper.map(release);

    assertThat(definition.projectId()).isEqualTo("business-core-demo");
    assertThat(definition.version()).isEqualTo("1.0.0");
    assertThat(definition.objectTypes()).extracting(ObjectTypeDTO::id)
            .containsExactlyInAnyOrder("supplier", "customer", "contract", "purchase_order");
    assertThat(definition.linkTypes()).extracting(LinkTypeDTO::id)
            .containsExactlyInAnyOrder("contract_customer", "contract_supplier",
                    "purchase_order_contract", "purchase_order_supplier");
}

@Test
void rejectsADigestMismatchBeforeMapping() {
    byte[] tampered = fixtureWithReplacement("business-core-demo", "tampered-model");
    assertThatThrownBy(() -> parser.parse(tampered)).hasMessageContaining("digest");
}

@Test
void rejectsUnsupportedCapabilitiesAndUnverifiedLinks() {
    assertThatThrownBy(() -> mapper.map(releaseWithKind("function"))).hasMessageContaining("unsupported");
    assertThatThrownBy(() -> mapper.map(releaseWithLinkStatus("INFERRED"))).hasMessageContaining("VERIFIED");
}
```

- [ ] **Step 2: Run parser and mapper tests to verify RED**

Run:

```bash
cd app/server
./mvnw -pl appsmith-server -Dtest=OntologyModelReleaseParserTest,OntologyModelReleaseMapperTest test
```

Expected: FAIL because parser and mapper classes do not exist.

- [ ] **Step 3: Implement the immutable v2 parser model**

Use Jackson `ObjectMapper` with explicit records for Release metadata,
elements, fields, links, and runtime bindings. Reproduce the dependency-free
validator rules in Java: required format/version, strict SemVer, canonical
object-key digest excluding only `release.release_digest`, unique
`domain + kind + name`, localized entity/field display text, permitted field
types, primary-key references, runtime binding entity references, and link
field references/cardinality/status. Reject unknown element kinds and reject
Function/Action during this provisional phase.

- [ ] **Step 4: Extend project metadata and implement the Release-to-project mapper**

Extend the existing project DTO contract with backwards-compatible runtime
mapping records: each object property has its mapped runtime column and each
link has its exact source and destination fields. Preserve old constructors so
YAML, Demo, and Platform Release fixtures keep their existing convention-based
values. Include the new records in `OntologySnapshotService` canonical digest
serialization and `OntologyRuntimeSnapshotProjection` only where query
metadata actually needs them.

For each entity set, create `ObjectTypeDTO(entityName, localizedDisplayName,
runtimeTable, primaryKey, properties)`. Select `zh-CN` display text first,
then `en-US`, then fail if neither exists. Map `string`, `integer`,
`decimal`, `boolean`, `date`, `timestamp`, `json`, and `reference` to the
existing runtime type names. Create `PropertyDTO` entries with primary-key
requiredness, read-only/derived metadata, enum values, and reference target.
Map every verified entity link to `LinkTypeDTO` and retain its structured
runtime-link mapping in the mapped project definition for Task 4.

- [ ] **Step 5: Run focused tests to verify GREEN**

Run the Task 1 command from Step 2.

Expected: PASS; assertions prove the fixture maps four objects/four links and
invalid digest/capability/link status never maps.

- [ ] **Step 6: Commit parser and mapper**

```bash
git add app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/release \
  app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/project/OntologyProjectDefinition.java \
  app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/ObjectTypeDTO.java \
  app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/dto/LinkTypeDTO.java \
  app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologySnapshotService.java \
  app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyRuntimeSnapshotProjection.java \
  app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/release
git commit -m "feat(ontology): parse release JSON metadata"
```

### Task 2: Workspace-Domain Managed Binding And Local JSON Import

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/WorkspaceDomainRuntimeBinding.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/WorkspaceDomainRuntimeBindingResolver.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/ReleaseRuntimeBindingProperties.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/LocalReleaseJsonOntologyProjectImporter.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyProjectImportSource.java`
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyProjectImportContext.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyMetadataSnapshot.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologySnapshotService.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/CelanWorksmithConfiguration.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/LocalReleaseJsonOntologyProjectImporterTest.java`
- Test: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/WorkspaceDomainRuntimeBindingResolverTest.java`

**Interfaces:**
- `WorkspaceDomainRuntimeBindingResolver.resolveRequired(String workspaceId, String domain): Mono<WorkspaceDomainRuntimeBinding>`.
- Binding record fields: `workspaceId`, `domain`, `managedBindingId`,
  `runtimeProviderId`, and `allowedAssetRefs`.
- `OntologyProjectImportContext(String workspaceId, String importedBy)` is
  created only after workspace authorization and is never an HTTP field.
- `OntologyProjectImportSource.importProject(OntologyProjectImportRequest request, OntologyProjectImportContext context)` receives that context for every importer.
- `LocalReleaseJsonOntologyProjectImporter.importProject(request, context)` consumes
  `LOCAL_RELEASE_JSON`, parses/maps bytes, resolves binding, verifies every
  `runtime_binding.asset_ref` belongs to `allowedAssetRefs`, and creates an
  immutable snapshot pinned to the binding’s provider.

- [ ] **Step 1: Write failing binding/importer tests**

```java
@Test
void resolvesOnlyTheExactWorkspaceAndDomainBinding() {
    StepVerifier.create(resolver.resolveRequired("workspace-a", "business"))
            .assertNext(binding -> assertThat(binding.runtimeProviderId()).isEqualTo("demo-mongo-readonly"))
            .verifyComplete();

    StepVerifier.create(resolver.resolveRequired("workspace-b", "business"))
            .expectErrorMatches(error -> error.getMessage().contains("workspace runtime environment"))
            .verify();
}

@Test
void importsReleaseWithResolvedBindingAndDoesNotUseUserProviderInput() {
    OntologyProjectImportRequest request = new OntologyProjectImportRequest(
            Kind.LOCAL_RELEASE_JSON, fixtureBytes(), "business-core-demo@1.0.0", null, null);

    StepVerifier.create(importer.importProject(request, new OntologyProjectImportContext(
                    "workspace-a", "admin@example.com")))
            .assertNext(snapshot -> {
                assertThat(snapshot.runtimeProviderId()).isEqualTo("demo-mongo-readonly");
                assertThat(snapshot.sourceKind()).isEqualTo("local-release-json");
                assertThat(snapshot.metadataDigest()).startsWith("sha256:");
            })
            .verifyComplete();
}

@Test
void rejectsMissingBindingAndUnavailableAssetBeforeSnapshotPersistence() {
    StepVerifier.create(importerWithoutBinding.importProject(request))
            .expectErrorMatches(error -> error.getMessage().contains("business"))
            .verify();
    verify(snapshotRepository, never()).save(any());
}
```

- [ ] **Step 2: Run importer tests to verify RED**

Run:

```bash
cd app/server
./mvnw -pl appsmith-server -Dtest=WorkspaceDomainRuntimeBindingResolverTest,LocalReleaseJsonOntologyProjectImporterTest test
```

Expected: FAIL because the binding resolver and JSON importer do not exist.

- [ ] **Step 3: Add explicit provisional binding configuration**

Use `@ConfigurationProperties(prefix = "celanworksmith.ontology.release-bindings")`
with a list of bindings. Each binding contains workspace ID, domain, opaque
managed binding ID, runtime provider ID, and exact allowed asset refs. Validate
duplicates at startup. Resolver returns only the exact workspace/domain match;
errors use the sanitized message `The workspace has no runtime environment
configured for the <domain> domain.`.

- [ ] **Step 4: Implement `LOCAL_RELEASE_JSON` import**

Add the enum value and introduce `OntologyProjectImportContext`; do not add
workspace identity or resolved state to the HTTP-deserialized request. The
controller overwrites the actor, and the service creates the context only after
`WORKSPACE_MANAGE_DATASOURCES` authorization. Parse Release bytes, resolve the
exact workspace/domain binding, ensure every Release runtime `asset_ref` is
allowlisted, map it, and create a snapshot with source kind
`local-release-json`, a canonical *snapshot* metadata digest, the validated
Release digest in a distinct `releaseDigest` field, source release ID, managed
binding ID, resolved internal provider ID, and authenticated actor. Extend
immutable snapshot persistence with `releaseDomain`, `releaseDigest`, and
`managedRuntimeBindingId`; update all constructors/tests explicitly.

- [ ] **Step 5: Register configuration and importer beans**

Register parser, mapper, binding properties/resolver, and importer in
`CelanWorksmithConfiguration`. Preserve Local YAML, Demo, and Platform Release
bean registration. In development configuration, bind `business` to
`demo-mongo-readonly` and the four exact `${source_dataset_id}:public.ont_*`
asset refs; do not set this binding globally.

- [ ] **Step 6: Run focused importer tests to verify GREEN**

Run the Task 2 command from Step 2.

Expected: PASS; exact workspace/domain resolution succeeds, missing/unavailable
bindings leave no snapshot, and browser-supplied provider IDs cannot choose a
different provider.

- [ ] **Step 7: Commit managed binding and importer**

```bash
git add app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource \
  app/server/appsmith-server/src/main/java/com/celanworksmith/CelanWorksmithConfiguration.java \
  app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource
git commit -m "feat(ontology): import release JSON by workspace binding"
```

### Task 3: Provider-Blind Native Datasource And Gateway Boundary

**Files:**
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceController.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologyDatasourceService.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/dto/ImportOntologyDatasourceRequest.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource/OntologySnapshotRuntimeGateway.java`
- Modify: `app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource/OntologyRuntimeGateway.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyDatasourceConfiguration.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyPlugin.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/main/java/com/celanworksmith/plugins/ontology/OntologyActionConfiguration.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/release/ReleaseDatasourcePinExtractor.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/release/ApplicationReleaseProviderHealthGate.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/release/OntologyReleaseValidator.java`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyDatasourceServiceTest.java`
- Create: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologyDatasourceControllerTest.java`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/OntologySnapshotRuntimeGatewayTest.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyConfigurationTest.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyObjectQueryExecutorTest.java`
- Modify: `app/server/appsmith-plugins/celanworksmithOntologyPlugin/src/test/java/com/celanworksmith/plugins/ontology/OntologyFunctionLinkActionExecutorTest.java`

**Interfaces:**
- For `LOCAL_RELEASE_JSON`, the controller authenticates only the actor; it
  never accepts or resolves a runtime provider ID from HTTP.
- `OntologyDatasourceService.importDatasource` passes an internally built
  `OntologyProjectImportContext` after workspace authorization and persists
  only `managedRuntimeBindingId`, never a provider implementation ID.
- Add provider-blind `OntologyRuntimeGateway` operations that accept a pinned
  `Snapshot` but no `providerId`. `OntologySnapshotRuntimeGateway` reloads the
  immutable snapshot, resolves `persistedSnapshot.runtimeProviderId()`, and
  delegates. Keep the old provider-argument signatures as deprecated defaults
  during this migration, then update every plugin call site to the new methods.

- [ ] **Step 1: Write failing datasource API/service tests**

```java
@Test
void importsReleaseDatasourceWithOpaqueBindingOnly() {
    StepVerifier.create(service.importDatasource(releaseRequest("workspace-1")))
            .assertNext(summary -> assertThat(summary.provider()).isEqualTo("managed:business-demo"))
            .verifyComplete();

    assertThat(properties(createdDatasource.getDatasourceStorages().get("").getDatasourceConfiguration()))
            .containsEntry("managedRuntimeBindingId", "managed:business-demo")
            .doesNotContainKey("runtimeProviderId");
}

@Test
void rejectsFailedReleaseImportWithoutCreatingDatasource() {
    when(importer.importProject(any())).thenReturn(Mono.error(new IllegalArgumentException(
            "The workspace has no runtime environment configured for the business domain.")));

    StepVerifier.create(service.importDatasource(releaseRequest("workspace-1")))
            .expectError(IllegalArgumentException.class)
            .verify();
    verify(datasourceService, never()).create(any());
}
```

- [ ] **Step 2: Run datasource tests to verify RED**

Run:

```bash
cd app/server
./mvnw -pl appsmith-server -Dtest=OntologyDatasourceServiceTest,OntologyDatasourceControllerTest test
```

Expected: FAIL because datasource configuration still always exposes
`runtimeProviderId` and has no opaque managed binding property.

- [ ] **Step 3: Make datasource configuration and plugin execution provider-blind**

Migrate all ontology datasource sources together, rather than creating two
plugin configuration shapes. Store project ID, version, snapshot ID, digest,
workspace ID, datasource ID, source kind, and (when present)
`managedRuntimeBindingId`; do not store `runtimeProviderId`. Update
`OntologyDatasourceConfiguration` to require those stable pins, remove its
provider accessor, and make `OntologyPlugin` invoke provider-blind gateway
operations. Remove `runtimeProviderId` from the protected action-context list
only after proving it cannot enter query execution by another path.

Update `ReleaseDatasourcePinExtractor`, `ApplicationReleaseProviderHealthGate`,
and `OntologyReleaseValidator` to read the provider ID from the pinned
server-side snapshot, not datasource properties. Make summary provider text a
non-sensitive managed binding label. Preserve cleanup behavior when datasource
storage update fails, legacy import success, and audit/provider equality
validation.

- [ ] **Step 4: Preserve sanitized controller errors**

Ensure authenticated actor injection retains raw JSON metadata but cannot alter
the binding. Map parser/binding/provider errors to fixed safe error messages;
do not include request metadata, allowed asset refs, provider IDs, Mongo URI,
or credentials. Add controller tests asserting these values are absent.

- [ ] **Step 5: Run focused datasource tests to verify GREEN**

Run the Task 3 command from Step 2.

Expected: PASS; release imports create native datasource storage only after
import/compatibility success, failures leave no datasource, no datasource or
plugin configuration exposes a provider ID, and legacy YAML import/query and
release-pin assertions still pass.

- [ ] **Step 6: Commit native datasource boundary**

```bash
git add app/server/appsmith-server/src/main/java/com/celanworksmith/ontology/datasource \
  app/server/appsmith-interfaces/src/main/java/com/celanworksmith/ontology/datasource \
  app/server/appsmith-plugins/celanworksmithOntologyPlugin/src \
  app/server/appsmith-server/src/main/java/com/celanworksmith/release \
  app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource
git commit -m "feat(ontology): hide release runtime providers"
```

### Task 4: Release-Mapped Mongo Runtime Query Adapter

**Files:**
- Create: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/ReleaseMappedMongoRuntimeAdapter.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/MongoRuntimeDataProvider.java`
- Modify: `app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb/RuntimeTableMapping.java`
- Create: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/ReleaseMappedMongoRuntimeAdapterTest.java`
- Modify: `app/server/appsmith-server/src/test/java/com/celanworksmith/runtime/MongoRuntimeDataProviderTest.java`

**Interfaces:**
- `ReleaseMappedMongoRuntimeAdapter` receives the immutable mapped project
  definition, whose explicit runtime mapping records were added in Task 1, and maps top-level document fields to
  `ObjectInstanceDTO.properties`.
- It builds filters/sorts/searches against the runtime-binding mapped column,
  not legacy `properties.<field>` paths.
- Link traversal receives explicit source/destination field mapping from the
  Release; it must not infer `<type>Id` names.

- [ ] **Step 1: Write failing Release-mapped query tests**

```java
@Test
void queriesTopLevelReleaseAssetFieldsAndReturnsChineseProperties() {
    StepVerifier.create(provider.queryObjects(releaseDefinition, "contract", ObjectSetQuery.defaults()))
            .assertNext(result -> {
                assertThat(result.total()).isPositive();
                assertThat(result.items().getFirst().properties()).containsKey("contract_name");
                assertThat(result.items().getFirst().properties().get("contract_name")).isInstanceOf(String.class);
            })
            .verifyComplete();
}

@Test
void traversesContractCustomerUsingTheReleaseFieldMapping() {
    StepVerifier.create(provider.getLinks(releaseDefinition, "contract", "CON-2025-001",
                    "contract_customer", ObjectSetQuery.defaults()))
            .assertNext(result -> assertThat(result.typeId()).isEqualTo("customer"))
            .verifyComplete();
}
```

- [ ] **Step 2: Run runtime adapter tests to verify RED**

Run:

```bash
cd app/server
./mvnw -pl appsmith-server -Dtest=ReleaseMappedMongoRuntimeAdapterTest,MongoRuntimeDataProviderTest test
```

Expected: FAIL because the provider uses legacy `properties.*` paths and
convention-based `<type>Id` relationship inference.

- [ ] **Step 3: Implement isolated Release-mapped document behavior**

Route only project definitions carrying the explicit Release runtime-mapping
records to the new adapter. It queries the runtime table named by the mapped
entity’s `runtimeTable`, and allows only the fixed legacy tables plus the
explicitly supported `ont_*` Release tables in `RuntimeTableMapping`. Import
validation already proves that every mapped table is authorized by the exact
workspace/domain binding before it becomes part of a snapshot. The adapter
reads the mapped primary key and emits mapped top-level field values as DTO
properties. Leave legacy query behavior unchanged. Do not use a process-local
`sourceKind` flag, because runtime calls receive the immutable definition from
the persisted snapshot.

For filters, sort, and search, resolve ontology property to its explicit
runtime binding column. For links, obtain the exact `source_field ->
destination_field` mapping retained by Task 1/2 and issue the target query on
the mapped destination column. Never construct a reference property name from
the type ID.

- [ ] **Step 4: Extend metadata compatibility capability lookup**

Make the Mongo provider report capabilities for resolved Release assets from
the importer mapping/allowed binding rather than the fixed `Supplier` /
`PurchaseOrder` legacy capability map. Validate all four `business` assets and
their normalized field types before datasource creation. Keep the static legacy
capability map for non-Release snapshots.

- [ ] **Step 5: Run focused runtime adapter tests to verify GREEN**

Run the Task 4 command from Step 2.

Expected: PASS; Release-backed top-level asset queries, filters, pagination,
aggregates, and four explicit relationship mappings work, while existing
legacy Mongo provider tests remain green.

- [ ] **Step 6: Commit Release-mapped runtime adapter**

```bash
git add app/server/appsmith-server/src/main/java/com/celanworksmith/runtime/adapter/mongodb \
  app/server/appsmith-server/src/test/java/com/celanworksmith/runtime
git commit -m "feat(ontology): query release mapped Mongo assets"
```

### Task 5: Release JSON Import Form And Localization

**Files:**
- Modify: `app/client/src/api/OntologyDatasourceApi.ts`
- Modify: `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.tsx`
- Modify: `app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx`
- Modify: `app/client/src/i18n/resources/en-US.ts`
- Modify: `app/client/src/i18n/resources/zh-CN.ts`

**Interfaces:**
- Frontend source union contains `LOCAL_RELEASE_JSON`.
- Request carries JSON file bytes as `metadata`, source kind, datasource name,
  and optional change note; no runtime provider field is sent for this source.

- [ ] **Step 1: Write failing UI tests**

```tsx
it("uploads a Release JSON file without showing or sending a provider ID", async () => {
  render(<OntologyDatasourceImport workspaceId="workspace-1" onImported={jest.fn()} />);
  await user.selectOptions(screen.getByLabelText("Source"), "LOCAL_RELEASE_JSON");
  await user.upload(screen.getByLabelText("Release JSON file"), new File(["{}"], "business.json", {
    type: "application/json",
  }));
  await user.click(screen.getByRole("button", { name: "Import ontology" }));

  expect(screen.queryByLabelText("Runtime provider ID")).not.toBeInTheDocument();
  expect(OntologyDatasourceApi.importDatasource).toHaveBeenCalledWith(expect.objectContaining({
    projectImportRequest: expect.objectContaining({ sourceKind: "LOCAL_RELEASE_JSON", runtimeProviderId: undefined }),
  }));
});
```

- [ ] **Step 2: Run UI test to verify RED**

Run:

```bash
cd app/client
pnpm test OntologyDatasourceImport.test.tsx --runInBand
```

Expected: FAIL because `LOCAL_RELEASE_JSON` is absent and the form only
recognizes YAML file uploads.

- [ ] **Step 3: Add source and localized form copy**

Add source label, Release JSON file label, required-file error, and safe
binding/asset-unavailable error labels to both locale resources. Use existing
i18n calls; no hardcoded visible strings. Keep user-facing source option and
error copy English in `en-US` and Chinese in `zh-CN`.

- [ ] **Step 4: Implement source-specific form behavior**

Add a `releaseJsonFile` state and `.json,application/json` accept attribute.
Require it only for `LOCAL_RELEASE_JSON`. Show it only for that source; hide
YAML and provider fields. Preserve the legacy YAML provider validation and
Platform Release ID behavior. Ensure source switching clears irrelevant file
and validation state, and only the selected source’s metadata reaches the API.

- [ ] **Step 5: Run focused UI tests to verify GREEN**

Run the Task 5 command from Step 2.

Expected: PASS; JSON request shape, hidden provider, validation, import
success/failure UI, and legacy source regressions all pass.

- [ ] **Step 6: Commit Release JSON form**

```bash
git add app/client/src/api/OntologyDatasourceApi.ts \
  app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.tsx \
  app/client/src/pages/Editor/IntegrationEditor/OntologyDatasourceImport.test.tsx \
  app/client/src/i18n/resources/en-US.ts \
  app/client/src/i18n/resources/zh-CN.ts
git commit -m "feat(ontology): import release JSON from workspace"
```

### Task 6: End-To-End Demo Binding Verification And Change Register

**Files:**
- Create: `app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/ReleaseJsonDatasourceIntegrationTest.java`
- Create: `app/client/playwright/tests/d0/ontology-release-json-import.spec.ts`
- Create: `docs/superpowers/verification/2026-09-03-ontology-release-json-workspace-import.md`

**Interfaces:**
- Test bootstrap seeds `ont_*` data and creates a test workspace `business`
  binding before import.
- Integration test calls the same datasource import API used by the form, then
  queries supplier, customer, contract, and purchase order through
  `OntologySnapshotRuntimeGateway`.

- [ ] **Step 1: Write failing native-path integration test**

```java
@Test
void importsTheReleaseAndQueriesAllFourGeneratedAssetsThroughTheNativeGateway() {
    String datasourceId = importRelease("workspace-business");

    StepVerifier.create(gateway.queryObjects(datasourceId, "supplier", ObjectSetQuery.defaults()))
            .assertNext(result -> assertThat(result.items()).isNotEmpty())
            .verifyComplete();
    StepVerifier.create(gateway.queryObjects(datasourceId, "customer", ObjectSetQuery.defaults()))
            .assertNext(result -> assertThat(result.items()).isNotEmpty())
            .verifyComplete();
    StepVerifier.create(gateway.queryObjects(datasourceId, "contract", ObjectSetQuery.defaults()))
            .assertNext(result -> assertThat(result.items()).isNotEmpty())
            .verifyComplete();
    StepVerifier.create(gateway.queryObjects(datasourceId, "purchase_order", ObjectSetQuery.defaults()))
            .assertNext(result -> assertThat(result.items()).isNotEmpty())
            .verifyComplete();
}
```

- [ ] **Step 2: Run integration test to verify RED**

Run:

```bash
cd app/server
./mvnw -pl appsmith-server -Dtest=ReleaseJsonDatasourceIntegrationTest test
```

Expected: FAIL until parser, binding, datasource, and Release-mapped runtime
adapter are integrated.

- [ ] **Step 3: Complete automated end-to-end coverage**

Make the integration test use the generated fixture seed loader or an
equivalent isolated test Mongo setup. Assert at least one Chinese business
field, a relationship traversal, a filter, pagination, and an aggregate
response. Add Playwright coverage that uploads the Release fixture, verifies
the created datasource is selectable, runs a query, and observes Chinese rows.
Use the configured Playwright browser installation; do not create production
accounts or access external systems.

- [ ] **Step 4: Write the verification record and change register**

Record exact Maven, client test, Playwright, fixture seed, and manual commands.
List all eight provisional seams from `## Contract Change Register`, their
current files, replacement trigger (final modelling contract), and the rule
that final integration must preserve the native datasource/snapshot/runtime
gateway pipeline.

State explicitly that this verification does not prove modelling-platform
connectivity, production governed-data access, administrator UI for domain
bindings, per-asset overrides, Function/Action mapping, or Release signing.

- [ ] **Step 5: Run final verification**

Run:

```bash
node scripts/celanworksmith/generate-business-core-runtime-data.mjs
node --test scripts/celanworksmith/generate-business-core-runtime-data.test.mjs
node --test scripts/celanworksmith/seed-runtime-mongodb.test.mjs
cd app/server && ./mvnw -pl appsmith-server -Dtest=OntologyModelReleaseParserTest,OntologyModelReleaseMapperTest,WorkspaceDomainRuntimeBindingResolverTest,LocalReleaseJsonOntologyProjectImporterTest,OntologyDatasourceServiceTest,OntologyDatasourceControllerTest,ReleaseMappedMongoRuntimeAdapterTest,MongoRuntimeDataProviderTest,ReleaseJsonDatasourceIntegrationTest test
cd ../../app/client && pnpm test OntologyDatasourceImport.test.tsx --runInBand
cd ../.. && npx playwright test app/client/playwright/tests/d0/ontology-release-json-import.spec.ts
git diff --check
```

Expected: all selected tests pass; generated fixtures remain deterministic;
the integration proves all four assets are queried through the native path.

- [ ] **Step 6: Commit verification**

```bash
git add app/server/appsmith-server/src/test/java/com/celanworksmith/ontology/datasource/ReleaseJsonDatasourceIntegrationTest.java \
  app/client/playwright/tests/d0/ontology-release-json-import.spec.ts \
  docs/superpowers/verification/2026-09-03-ontology-release-json-workspace-import.md
git commit -m "test(ontology): verify release JSON workspace import"
```

## Plan Self-Review

- Task 1 isolates provisional Release parsing and mapping from all import
  callers; digest, fields, links, runtime bindings, and capability exclusion
  are covered.
- Task 2 provides exact workspace/domain resolution with no global fallback,
  creates immutable Release audit metadata, and retains a dedicated future
  contract seam.
- Task 3 ensures the public datasource API is provider-blind, cleans up on
  failure, and preserves existing source kinds.
- Task 4 directly addresses the existing top-level Release fixture versus
  legacy nested Mongo document mismatch and removes convention-based relation
  inference only for definitions carrying explicit Release runtime mappings.
- Task 5 implements the explicit user-facing JSON import option without
  provider selection and routes new copy through i18n.
- Task 6 proves the four generated assets work through the native pipeline and
  documents every temporary contract seam and non-goal.
