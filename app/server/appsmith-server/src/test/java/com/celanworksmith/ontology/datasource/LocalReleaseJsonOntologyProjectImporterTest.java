package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.ontology.release.OntologyModelReleaseMapper;
import com.celanworksmith.ontology.release.OntologyModelReleaseParser;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.erdtman.jcs.JsonCanonicalizer;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class LocalReleaseJsonOntologyProjectImporterTest {
    @Test
    void importsReleaseWithResolvedBindingAndDoesNotUseUserProviderInput() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        when(repository.insert(any())).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        OntologySnapshotService snapshotService = new OntologySnapshotService(
                repository, Clock.fixed(Instant.parse("2026-08-13T00:00:00Z"), ZoneOffset.UTC));
        WorkspaceDomainRuntimeBindingResolver resolver = new WorkspaceDomainRuntimeBindingResolver(
                new ReleaseRuntimeBindingProperties(List.of(ReleaseRuntimeBindingTestFixtures.businessBinding(
                        "workspace-a", "managed-business", "demo-mongo-readonly"))));
        LocalReleaseJsonOntologyProjectImporter importer = new LocalReleaseJsonOntologyProjectImporter(
                snapshotService, resolver, new OntologyModelReleaseParser(), new OntologyModelReleaseMapper());
        OntologyProjectImportRequest request = new OntologyProjectImportRequest(
                OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON,
                fixtureBytes(),
                "business-core-demo@1.0.0",
                "forged-provider",
                null);

        StepVerifier.create(importer.importProject(
                        request, new OntologyProjectImportContext("workspace-a", "admin@example.com")))
                .assertNext(snapshot -> {
                    assertThat(snapshot.runtimeProviderId()).isEqualTo("demo-mongo-readonly");
                    assertThat(snapshot.sourceKind()).isEqualTo("local-release-json");
                    assertThat(snapshot.metadataDigest()).startsWith("sha256:");
                    assertThat(snapshot.releaseDigest()).startsWith("sha256:");
                    assertThat(snapshot.releaseDomain()).isEqualTo("business");
                    assertThat(snapshot.managedRuntimeBindingId()).isEqualTo("managed-business");
                    assertThat(snapshot.workspaceId()).isEqualTo("workspace-a");
                    assertThat(snapshot.createdBy()).isEqualTo("admin@example.com");
                })
                .verifyComplete();
    }

    @Test
    void rejectsMissingBindingAndUnavailableAssetBeforeSnapshotPersistence() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        WorkspaceDomainRuntimeBindingResolver resolver =
                new WorkspaceDomainRuntimeBindingResolver(new ReleaseRuntimeBindingProperties(List.of()));
        LocalReleaseJsonOntologyProjectImporter importer = new LocalReleaseJsonOntologyProjectImporter(
                new OntologySnapshotService(repository, Clock.systemUTC()),
                resolver,
                new OntologyModelReleaseParser(),
                new OntologyModelReleaseMapper());
        OntologyProjectImportRequest request = new OntologyProjectImportRequest(
                OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON,
                fixtureBytes(),
                "business-core-demo@1.0.0",
                null,
                null);

        StepVerifier.create(importer.importProject(
                        request, new OntologyProjectImportContext("workspace-a", "admin@example.com")))
                .expectErrorMessage("The workspace release binding is unavailable.")
                .verify();
        verify(repository, never()).insert(any());
    }

    @Test
    void rejectsDirectReleaseImportWithoutAuthorizedContext() {
        LocalReleaseJsonOntologyProjectImporter importer = new LocalReleaseJsonOntologyProjectImporter(
                new OntologySnapshotService(mock(OntologyMetadataSnapshotRepository.class), Clock.systemUTC()),
                new WorkspaceDomainRuntimeBindingResolver(new ReleaseRuntimeBindingProperties(List.of())));
        OntologyProjectImportRequest request = new OntologyProjectImportRequest(
                OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON,
                fixtureBytes(),
                "business-core-demo@1.0.0",
                "forged",
                null);

        StepVerifier.create(importer.importProject(request))
                .expectErrorMessage("Local Release JSON import requires an authorized import context")
                .verify();
    }

    @Test
    void redactsUnavailableAssetReference() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        LocalReleaseJsonOntologyProjectImporter importer = new LocalReleaseJsonOntologyProjectImporter(
                new OntologySnapshotService(repository, Clock.systemUTC()),
                new WorkspaceDomainRuntimeBindingResolver(
                        new ReleaseRuntimeBindingProperties(List.of(new ReleaseRuntimeBindingProperties.Binding(
                                "workspace-a",
                                "business",
                                "managed",
                                "provider",
                                "GOVERNED_DATASET",
                                List.of(new ReleaseRuntimeBindingProperties.AssetAuthorization(
                                        "other-asset", "sha256:" + "0".repeat(64))),
                                List.of())))));

        StepVerifier.create(importer.importProject(
                        new OntologyProjectImportRequest(
                                OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON,
                                fixtureBytes(),
                                null,
                                "forged",
                                null),
                        new OntologyProjectImportContext("workspace-a", "admin@example.com")))
                .expectErrorMatches(
                        error -> error.getMessage().equals("Release runtime assets are unavailable in this workspace.")
                                && !error.getMessage().contains("ont_"))
                .verify();
        verify(repository, never()).insert(any());
    }

    @Test
    void rejectsAnUnapprovedRuntimeColumnOnAnAllowlistedAssetBeforeSnapshotPersistence() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        when(repository.insert(any())).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        LocalReleaseJsonOntologyProjectImporter importer = new LocalReleaseJsonOntologyProjectImporter(
                new OntologySnapshotService(repository, Clock.systemUTC()),
                new WorkspaceDomainRuntimeBindingResolver(new ReleaseRuntimeBindingProperties(List.of(
                        ReleaseRuntimeBindingTestFixtures.businessBinding("workspace-a", "managed", "provider")))));

        StepVerifier.create(importer.importProject(
                        new OntologyProjectImportRequest(
                                OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON,
                                fixtureWithUnapprovedRuntimeColumn(),
                                null,
                                null,
                                null),
                        new OntologyProjectImportContext("workspace-a", "admin@example.com")))
                .expectErrorMessage("Release runtime assets are unavailable in this workspace.")
                .verify();
        verify(repository, never()).insert(any());
    }

    @Test
    void rejectsAnUnexpectedRuntimeProviderKindBeforeSnapshotPersistence() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        LocalReleaseJsonOntologyProjectImporter importer = authorizedImporter(repository);

        StepVerifier.create(importer.importProject(
                        new OntologyProjectImportRequest(
                                OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON,
                                fixtureWithRuntimeValue("provider_kind", "UNMANAGED_DATASET"),
                                null,
                                null,
                                null),
                        new OntologyProjectImportContext("workspace-a", "admin@example.com")))
                .expectErrorMessage("The workspace release binding is unavailable.")
                .verify();

        verify(repository, never()).insert(any());
    }

    @Test
    void rejectsWritableRuntimeBindingsBeforeSnapshotPersistence() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        LocalReleaseJsonOntologyProjectImporter importer = authorizedImporter(repository);

        StepVerifier.create(importer.importProject(
                        new OntologyProjectImportRequest(
                                OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON,
                                fixtureWithRuntimeValue("access_mode", "READ_WRITE"),
                                null,
                                null,
                                null),
                        new OntologyProjectImportContext("workspace-a", "admin@example.com")))
                .expectErrorMessage("The workspace release binding is unavailable.")
                .verify();

        verify(repository, never()).insert(any());
    }

    @Test
    void rejectsAlteredVerifiedLinkMappingsBeforeSnapshotPersistence() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        LocalReleaseJsonOntologyProjectImporter importer = authorizedImporter(repository);

        StepVerifier.create(importer.importProject(
                        new OntologyProjectImportRequest(
                                OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON,
                                fixtureWithAlteredLinkMapping(),
                                null,
                                null,
                                null),
                        new OntologyProjectImportContext("workspace-a", "admin@example.com")))
                .expectErrorMessage("Release runtime assets are unavailable in this workspace.")
                .verify();

        verify(repository, never()).insert(any());
    }

    @Test
    void doesNotDeserializeProviderInputForReleaseRequests() throws Exception {
        ObjectMapper objectMapper = new ObjectMapper();
        String json =
                "{\"sourceKind\":\"LOCAL_RELEASE_JSON\",\"sourceReleaseId\":\"business-core-demo@1.0.0\",\"runtimeProviderId\":{\"forged\":true}}";
        OntologyProjectImportRequest parsed = objectMapper.readValue(json, OntologyProjectImportRequest.class);

        assertThat(parsed.runtimeProviderId()).isNull();
    }

    @Test
    void requiresReleaseProvenanceAtSnapshotBoundary() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        OntologySnapshotService service = new OntologySnapshotService(repository, Clock.systemUTC());
        OntologyProjectDefinition definition =
                new OntologyProjectDefinition("project", "1.0.0", 1, List.of(), List.of(), List.of(), List.of());

        StepVerifier.create(service.createSnapshot(
                        new ImportedOntologyProject(definition, "local-release-json", "release", "provider", "actor")))
                .expectErrorMessage("Local Release JSON provenance is required")
                .verify();
        verify(repository, never()).insert(any());
    }

    private static byte[] fixtureBytes() {
        try {
            return Files.readAllBytes(Path.of("../../../docs/superpowers/fixtures/ontology-model-release-demo.json"));
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static byte[] fixtureWithUnapprovedRuntimeColumn() {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            ObjectNode document = (ObjectNode) objectMapper.readTree(fixtureBytes());
            for (var element : document.withArray("elements")) {
                if ("runtime_binding".equals(element.path("kind").asText())
                        && "contract".equals(element.at("/spec/entity_set").asText())) {
                    ((ObjectNode) element.at("/spec/field_mappings/contract_name")).put("column", "private_salary");
                    return signed(document, objectMapper);
                }
            }
            throw new IllegalStateException("Contract runtime binding is missing");
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static byte[] fixtureWithRuntimeValue(String key, String value) {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            ObjectNode document = (ObjectNode) objectMapper.readTree(fixtureBytes());
            for (var element : document.withArray("elements")) {
                if ("runtime_binding".equals(element.path("kind").asText())) {
                    ((ObjectNode) element.path("spec")).put(key, value);
                    return signed(document, objectMapper);
                }
            }
            throw new IllegalStateException("Runtime binding is missing");
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static byte[] fixtureWithAlteredLinkMapping() {
        try {
            ObjectMapper objectMapper = new ObjectMapper();
            ObjectNode document = (ObjectNode) objectMapper.readTree(fixtureBytes());
            for (var element : document.withArray("elements")) {
                if ("entity_set_link".equals(element.path("kind").asText())
                        && "contract_customer".equals(element.path("name").asText())) {
                    ((ObjectNode) element.at("/spec/field_mappings/0")).put("source_field", "private_salary");
                    return signed(document, objectMapper);
                }
            }
            throw new IllegalStateException("Verified link is missing");
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static LocalReleaseJsonOntologyProjectImporter authorizedImporter(
            OntologyMetadataSnapshotRepository repository) {
        return new LocalReleaseJsonOntologyProjectImporter(
                new OntologySnapshotService(repository, Clock.systemUTC()),
                new WorkspaceDomainRuntimeBindingResolver(new ReleaseRuntimeBindingProperties(List.of(
                        ReleaseRuntimeBindingTestFixtures.businessBinding("workspace-a", "managed", "provider")))));
    }

    private static byte[] signed(ObjectNode document, ObjectMapper objectMapper) {
        try {
            ObjectNode release = (ObjectNode) document.path("release");
            release.remove("release_digest");
            byte[] canonical = new JsonCanonicalizer(objectMapper.writeValueAsBytes(document)).getEncodedUTF8();
            release.put(
                    "release_digest",
                    "sha256:" + hex(MessageDigest.getInstance("SHA-256").digest(canonical)));
            return objectMapper.writeValueAsBytes(document);
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static String hex(byte[] bytes) {
        StringBuilder value = new StringBuilder(bytes.length * 2);
        for (byte current : bytes) value.append(String.format("%02x", current));
        return value.toString();
    }
}
