package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.release.OntologyModelReleaseMapper;
import com.celanworksmith.ontology.release.OntologyModelReleaseParser;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
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
                new ReleaseRuntimeBindingProperties(List.of(new ReleaseRuntimeBindingProperties.Binding(
                        "workspace-a", "business", "managed-business", "demo-mongo-readonly", allowedAssets()))));
        LocalReleaseJsonOntologyProjectImporter importer = new LocalReleaseJsonOntologyProjectImporter(
                snapshotService, resolver, new OntologyModelReleaseParser(), new OntologyModelReleaseMapper());
        OntologyProjectImportRequest request = new OntologyProjectImportRequest(
                OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON, fixtureBytes(), "business-core-demo@1.0.0", "forged-provider", null);

        StepVerifier.create(importer.importProject(request, new OntologyProjectImportContext(
                        "workspace-a", "admin@example.com")))
                .assertNext(snapshot -> {
                    assertThat(snapshot.runtimeProviderId()).isEqualTo("demo-mongo-readonly");
                    assertThat(snapshot.sourceKind()).isEqualTo("local-release-json");
                    assertThat(snapshot.metadataDigest()).startsWith("sha256:");
                    assertThat(snapshot.releaseDigest()).startsWith("sha256:");
                    assertThat(snapshot.releaseDomain()).isEqualTo("business");
                    assertThat(snapshot.managedRuntimeBindingId()).isEqualTo("managed-business");
                    assertThat(snapshot.createdBy()).isEqualTo("admin@example.com");
                })
                .verifyComplete();
    }

    @Test
    void rejectsMissingBindingAndUnavailableAssetBeforeSnapshotPersistence() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        WorkspaceDomainRuntimeBindingResolver resolver = new WorkspaceDomainRuntimeBindingResolver(
                new ReleaseRuntimeBindingProperties(List.of()));
        LocalReleaseJsonOntologyProjectImporter importer = new LocalReleaseJsonOntologyProjectImporter(
                new OntologySnapshotService(repository, Clock.systemUTC()), resolver,
                new OntologyModelReleaseParser(), new OntologyModelReleaseMapper());
        OntologyProjectImportRequest request = new OntologyProjectImportRequest(
                OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON, fixtureBytes(), "business-core-demo@1.0.0", null, null);

        StepVerifier.create(importer.importProject(request))
                .expectErrorMatches(error -> error.getMessage().contains("business"))
                .verify();
        verify(repository, never()).insert(any());
    }

    private static List<String> allowedAssets() {
        String dataset = "${source_dataset_id}";
        return List.of(
                dataset + ":public.ont_supplier",
                dataset + ":public.ont_customer",
                dataset + ":public.ont_contract",
                dataset + ":public.ont_purchase_order");
    }

    private static byte[] fixtureBytes() {
        try {
            return Files.readAllBytes(Path.of("../../../docs/superpowers/fixtures/ontology-model-release-demo.json"));
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
