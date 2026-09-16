package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.dto.ActionTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OntologySnapshotServiceTest {
    private static final Clock FIXED_CLOCK = Clock.fixed(Instant.parse("2026-08-13T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void createsStableDigestForEquivalentMetadataFromDifferentImportSources() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        AtomicReference<OntologyMetadataSnapshot> persistedSnapshot = new AtomicReference<>();
        when(repository.insert(any())).thenAnswer(invocation -> {
            OntologyMetadataSnapshot snapshot = invocation.getArgument(0);
            persistedSnapshot.set(snapshot);
            return Mono.just(snapshot);
        });
        OntologySnapshotService service = new OntologySnapshotService(repository, FIXED_CLOCK);

        OntologyMetadataSnapshot yamlSnapshot = service.createSnapshot(
                        importedProject("local-yaml", "local-upload-1", definitionInSourceOrder()))
                .block();
        OntologyMetadataSnapshot platformSnapshot = service.createSnapshot(
                        importedProject("platform-release", "release-2026-08", definitionInDifferentOrder()))
                .block();

        assertThat(yamlSnapshot).isNotNull();
        assertThat(platformSnapshot).isNotNull();
        assertThat(platformSnapshot.metadataDigest()).isEqualTo(yamlSnapshot.metadataDigest());
        assertThat(persistedSnapshot.get().projectId()).isEqualTo("supply-chain");
        assertThat(persistedSnapshot.get().projectVersion()).isEqualTo("1.0.0");
        assertThat(persistedSnapshot.get().sourceKind()).isEqualTo("platform-release");
        assertThat(persistedSnapshot.get().sourceReleaseId()).isEqualTo("release-2026-08");
        assertThat(persistedSnapshot.get().runtimeProviderId()).isEqualTo("demo-mongo-readonly");
        assertThat(persistedSnapshot.get().createdBy()).isEqualTo("admin-1");
        assertThat(persistedSnapshot.get().createdAt()).isEqualTo(Instant.parse("2026-08-13T00:00:00Z"));
    }

    @Test
    void includesActionTargetBoundInMetadataDigest() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        when(repository.insert(any())).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        OntologySnapshotService service = new OntologySnapshotService(repository, FIXED_CLOCK);

        OntologyMetadataSnapshot one = service.createSnapshot(
                        importedProject("demo", "action-1", definitionWithActionBound(1)))
                .block();
        OntologyMetadataSnapshot two = service.createSnapshot(
                        importedProject("demo", "action-2", definitionWithActionBound(2)))
                .block();

        assertThat(one.metadataDigest()).isNotEqualTo(two.metadataDigest());
    }

    @Test
    void includesActionServerAdapterBindingInMetadataDigest() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        when(repository.insert(any())).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        OntologySnapshotService service = new OntologySnapshotService(repository, FIXED_CLOCK);

        OntologyMetadataSnapshot one = service.createSnapshot(
                        importedProject("demo", "action-adapter-1", definitionWithActionAdapter("1.0.0")))
                .block();
        OntologyMetadataSnapshot two = service.createSnapshot(
                        importedProject("demo", "action-adapter-2", definitionWithActionAdapter("2.0.0")))
                .block();

        assertThat(one.metadataDigest()).isNotEqualTo(two.metadataDigest());
    }

    @Test
    void returnsOnlyThePersistedImmutableSnapshotWhenDigestMatches() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        when(repository.insert(any())).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        OntologySnapshotService service = new OntologySnapshotService(repository, FIXED_CLOCK);
        OntologyMetadataSnapshot snapshot = service.createSnapshot(
                        importedProject("local-yaml", "local-upload-1", definitionInSourceOrder()))
                .block();
        when(repository.findById(snapshot.id())).thenReturn(Mono.just(snapshot));

        StepVerifier.create(service.getRequiredSnapshot(snapshot.id(), snapshot.metadataDigest()))
                .expectNext(snapshot)
                .verifyComplete();

        verify(repository).findById(snapshot.id());
    }

    @Test
    void rejectsRequestedDigestThatDoesNotMatchStoredSnapshot() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        when(repository.insert(any())).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        OntologySnapshotService service = new OntologySnapshotService(repository, FIXED_CLOCK);
        OntologyMetadataSnapshot snapshot = service.createSnapshot(
                        importedProject("local-yaml", "local-upload-1", definitionInSourceOrder()))
                .block();
        when(repository.findById(snapshot.id())).thenReturn(Mono.just(snapshot));

        StepVerifier.create(service.getRequiredSnapshot(snapshot.id(), "sha256:" + "0".repeat(64)))
                .expectError(IllegalArgumentException.class)
                .verify();
    }

    @Test
    void rejectsReleaseSnapshotOwnedByAnotherWorkspace() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        OntologySnapshotService service = new OntologySnapshotService(repository, FIXED_CLOCK);
        OntologyMetadataSnapshot snapshot = new OntologyMetadataSnapshot(
                "release-snapshot",
                "business-core-demo",
                "1.0.0",
                "local-release-json",
                "business-core-demo@1.0.0",
                "demo-mongo-readonly",
                "admin-1",
                FIXED_CLOCK.instant(),
                "sha256:" + "a".repeat(64),
                definitionInSourceOrder(),
                false,
                "business",
                "sha256:" + "b".repeat(64),
                "business-demo-managed",
                "workspace-a");
        when(repository.findById(snapshot.id())).thenReturn(Mono.just(snapshot));

        StepVerifier.create(service.getRequiredSnapshot(snapshot.id(), snapshot.metadataDigest(), "workspace-b"))
                .expectError(OntologySnapshotService.SnapshotWorkspaceMismatchException.class)
                .verify();
    }

    @Test
    void acceptsDemoMetadataAsAnImportSource() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        when(repository.insert(any())).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        OntologySnapshotService service = new OntologySnapshotService(repository, FIXED_CLOCK);

        StepVerifier.create(service.createSnapshot(importedProject("demo", "builtin-demo", definitionInSourceOrder())))
                .assertNext(snapshot -> assertThat(snapshot.sourceKind()).isEqualTo("demo"))
                .verifyComplete();
    }

    @Test
    void persistsDeprecatedImportStateWithBackwardCompatibleDefault() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        when(repository.insert(any())).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        OntologySnapshotService service = new OntologySnapshotService(repository, FIXED_CLOCK);

        OntologyMetadataSnapshot snapshot = service.createSnapshot(new ImportedOntologyProject(
                        definitionInSourceOrder(), "demo", "builtin-demo", "demo-mongo-readonly", "admin-1", true))
                .block();

        assertThat(snapshot.deprecated()).isTrue();
        assertThat(service.createSnapshot(importedProject("demo", "builtin-demo", definitionInSourceOrder()))
                        .block()
                        .deprecated())
                .isFalse();
    }

    private ImportedOntologyProject importedProject(
            String sourceKind, String sourceReleaseId, OntologyProjectDefinition definition) {
        return new ImportedOntologyProject(definition, sourceKind, sourceReleaseId, "demo-mongo-readonly", "admin-1");
    }

    private OntologyProjectDefinition definitionInSourceOrder() {
        return new OntologyProjectDefinition(
                "supply-chain",
                "1.0.0",
                1,
                List.of(
                        object("PurchaseOrder", "purchaseOrder", "DECIMAL"),
                        object("Supplier", "supplierName", "STRING")),
                List.of(),
                List.of(),
                List.of());
    }

    private OntologyProjectDefinition definitionInDifferentOrder() {
        return new OntologyProjectDefinition(
                "supply-chain",
                "1.0.0",
                1,
                List.of(
                        object("Supplier", "supplierName", "STRING"),
                        object("PurchaseOrder", "purchaseOrder", "DECIMAL")),
                List.of(),
                List.of(),
                List.of());
    }

    private OntologyProjectDefinition definitionWithActionBound(int maxItems) {
        OntologyProjectDefinition base = definitionInSourceOrder();
        return new OntologyProjectDefinition(
                base.projectId(),
                base.version(),
                base.schemaVersion(),
                base.objectTypes(),
                base.linkTypes(),
                base.functions(),
                List.of(new ActionTypeDTO(
                        "ApplyContractChange",
                        "Apply contract change",
                        List.of("contract"),
                        true,
                        maxItems,
                        List.of(),
                        true)));
    }

    private OntologyProjectDefinition definitionWithActionAdapter(String adapterVersion) {
        OntologyProjectDefinition base = definitionInSourceOrder();
        return new OntologyProjectDefinition(
                base.projectId(),
                base.version(),
                base.schemaVersion(),
                base.objectTypes(),
                base.linkTypes(),
                base.functions(),
                List.of(new ActionTypeDTO(
                        "ApplyContractChange",
                        "Apply contract change",
                        List.of("contract"),
                        true,
                        1,
                        List.of(),
                        true,
                        "demo-action-server",
                        adapterVersion)));
    }

    private ObjectTypeDTO object(String id, String propertyId, String dataType) {
        return new ObjectTypeDTO(
                id, id, List.of(new PropertyDTO(propertyId, propertyId, dataType, false, false, false)), null, "id");
    }
}
