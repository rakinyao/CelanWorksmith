package com.celanworksmith.release;

import com.celanworksmith.ontology.datasource.OntologyMetadataSnapshot;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway;
import com.celanworksmith.ontology.datasource.OntologySnapshotService;
import com.celanworksmith.ontology.datasource.ProviderValidationResult;
import com.celanworksmith.ontology.datasource.RuntimeProviderCompatibilityValidator;
import com.celanworksmith.ontology.dto.ActionTypeDTO;
import com.celanworksmith.ontology.dto.FunctionDTO;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.release.model.ReleaseDatasourcePin;
import com.celanworksmith.release.model.ReleaseDependency;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class OntologyReleaseValidatorTest {
    private final OntologySnapshotService snapshotService = mock(OntologySnapshotService.class);
    private final OntologyRuntimeGateway runtimeGateway = mock(OntologyRuntimeGateway.class);
    private final RuntimeProviderCompatibilityValidator compatibilityValidator =
            mock(RuntimeProviderCompatibilityValidator.class);
    private final OntologyReleaseValidator validator =
            new OntologyReleaseValidator(snapshotService, runtimeGateway, compatibilityValidator);

    @Test
    void validatesMixedReferencedMetadataAgainstOneSnapshot() {
        ReleaseDatasourcePin pin = pin();
        OntologyRuntimeGateway.Snapshot snapshot = snapshot();
        when(snapshotService.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshotEntity()));
        when(runtimeGateway.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshot));
        when(compatibilityValidator.validate(
                        any(OntologyMetadataSnapshot.class), org.mockito.ArgumentMatchers.eq("provider-1")))
                .thenReturn(Mono.just(new ProviderValidationResult(true, List.of())));

        List<ReleaseDiagnostic> diagnostics = validator
                .validate(
                        pin,
                        List.of(
                                dependency("OBJECT_TYPE", "Order", "query.objectTypeId"),
                                dependency("PROPERTY", "name", "query.projection[0]"),
                                dependency("FUNCTION", "total", "query.functionId"),
                                dependency("LINK", "customer", "query.linkId"),
                                dependency("ONTOLOGY_ACTION", "archive", "query.actionId")))
                .block();

        assertThat(diagnostics).isEmpty();
        verify(snapshotService).getRequiredSnapshot("snapshot-1", "digest-1");
        verifyNoInteractions(runtimeGateway);
    }

    @Test
    void mapsMissingSnapshotAndDigestErrorsToStableBlockingDiagnostics() {
        ReleaseDatasourcePin pin = pin();
        when(snapshotService.getRequiredSnapshot("snapshot-1", "digest-1"))
                .thenReturn(Mono.error(new IllegalArgumentException("secret snapshot internals")));

        List<ReleaseDiagnostic> diagnostics = validator.validate(pin, List.of()).block();

        assertThat(diagnostics)
                .extracting("severity", "code", "path", "message")
                .containsExactly(org.assertj.core.groups.Tuple.tuple(
                        ReleaseDiagnostic.Severity.BLOCKING,
                        "RELEASE_ONTOLOGY_SNAPSHOT_UNAVAILABLE",
                        "datasources[ontology-1].metadataSnapshot",
                        "Ontology metadata snapshot is unavailable"));
        assertThat(diagnostics.get(0).message()).doesNotContain("secret");
    }

    @Test
    void mapsDigestMismatchToStableBlockingDiagnostic() {
        ReleaseDatasourcePin pin = pin();
        when(snapshotService.getRequiredSnapshot("snapshot-1", "digest-1"))
                .thenReturn(Mono.error(new OntologySnapshotService.SnapshotDigestMismatchException()));

        List<ReleaseDiagnostic> diagnostics = validator.validate(pin, List.of()).block();

        assertThat(diagnostics)
                .extracting("code", "path", "message")
                .containsExactly(org.assertj.core.groups.Tuple.tuple(
                        "RELEASE_ONTOLOGY_SNAPSHOT_DIGEST_MISMATCH",
                        "datasources[ontology-1].metadataSnapshot",
                        "Ontology metadata snapshot digest does not match"));
    }

    @Test
    void reportsMissingReferencedPropertyAsBlockingWithoutRepeatingMetadataRules() {
        ReleaseDatasourcePin pin = pin();
        OntologyRuntimeGateway.Snapshot snapshot = snapshot();
        when(snapshotService.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshotEntity()));
        when(runtimeGateway.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshot));
        when(compatibilityValidator.validate(
                        any(OntologyMetadataSnapshot.class), org.mockito.ArgumentMatchers.eq("provider-1")))
                .thenReturn(Mono.just(new ProviderValidationResult(true, List.of())));

        List<ReleaseDiagnostic> diagnostics = validator
                .validate(pin, List.of(dependency("PROPERTY", "missing", "query.projection[0]")))
                .block();

        assertThat(diagnostics)
                .extracting("code", "path")
                .containsExactly(org.assertj.core.groups.Tuple.tuple(
                        "RELEASE_ONTOLOGY_METADATA_NOT_FOUND", "query.projection[0]"));
    }

    @Test
    void mapsProviderCompatibilityErrorsToBlockingDiagnosticsWithoutProviderText() {
        ReleaseDatasourcePin pin = pin();
        when(snapshotService.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshotEntity()));
        when(compatibilityValidator.validate(
                        any(OntologyMetadataSnapshot.class), org.mockito.ArgumentMatchers.eq("provider-1")))
                .thenReturn(Mono.just(
                        new ProviderValidationResult(false, List.of("Missing property mapping: Order.secretToken"))));
        when(runtimeGateway.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshot()));

        List<ReleaseDiagnostic> diagnostics = validator.validate(pin, List.of()).block();

        assertThat(diagnostics)
                .extracting("severity", "code", "path", "message")
                .containsExactly(org.assertj.core.groups.Tuple.tuple(
                        ReleaseDiagnostic.Severity.BLOCKING,
                        "RELEASE_ONTOLOGY_PROVIDER_INCOMPATIBLE",
                        "datasources[ontology-1].providerId",
                        "Runtime provider metadata mapping is incompatible"));
        assertThat(diagnostics.get(0).message()).doesNotContain("secretToken");
    }

    @Test
    void rejectsProviderIdentityMismatchAsBlocking() {
        ReleaseDatasourcePin pin = pin();
        OntologyMetadataSnapshot snapshot = snapshotEntity();
        snapshot = new OntologyMetadataSnapshot(
                snapshot.id(),
                snapshot.projectId(),
                snapshot.projectVersion(),
                snapshot.sourceKind(),
                snapshot.sourceReleaseId(),
                "other-provider",
                snapshot.createdBy(),
                snapshot.createdAt(),
                snapshot.metadataDigest(),
                snapshot.definition());
        when(snapshotService.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshot));
        when(runtimeGateway.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshot()));

        List<ReleaseDiagnostic> diagnostics = validator.validate(pin, List.of()).block();

        assertThat(diagnostics)
                .extracting("severity", "code", "path")
                .containsExactly(org.assertj.core.groups.Tuple.tuple(
                        ReleaseDiagnostic.Severity.BLOCKING,
                        "RELEASE_ONTOLOGY_PROVIDER_INCOMPATIBLE",
                        "datasources[ontology-1].providerId"));
    }

    @Test
    void reportsDeprecatedCompatibilityAsWarningAndProjectChangeAsInfo() {
        ReleaseDatasourcePin pin = new ReleaseDatasourcePin(
                "ontology-1",
                "ontology-plugin",
                "ONTOLOGY",
                "provider-1",
                "snapshot-1",
                "digest-1",
                "1",
                "project-1",
                "0.9");
        when(snapshotService.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshotEntity()));
        when(runtimeGateway.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshot()));
        when(compatibilityValidator.validate(
                        any(OntologyMetadataSnapshot.class), org.mockito.ArgumentMatchers.eq("provider-1")))
                .thenReturn(Mono.just(new ProviderValidationResult(true, List.of(), List.of("deprecated metadata"))));

        List<ReleaseDiagnostic> diagnostics = validator.validate(pin, List.of()).block();

        assertThat(diagnostics)
                .extracting("severity", "code", "path", "message", "details")
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(
                                ReleaseDiagnostic.Severity.WARNING,
                                "RELEASE_ONTOLOGY_METADATA_DEPRECATED",
                                "datasources[ontology-1].metadataSnapshot",
                                "Referenced ontology metadata is deprecated but compatible",
                                java.util.Map.of()),
                        org.assertj.core.groups.Tuple.tuple(
                                ReleaseDiagnostic.Severity.INFO,
                                "RELEASE_ONTOLOGY_PROJECT_VERSION_CHANGED",
                                "datasources[ontology-1].metadataSnapshot",
                                "Ontology project or version changed",
                                java.util.Map.of("projectId", "project-1", "projectVersion", "1")));
    }

    private static ReleaseDatasourcePin pin() {
        return new ReleaseDatasourcePin(
                "ontology-1", "ontology-plugin", "ONTOLOGY", "provider-1", "snapshot-1", "digest-1", "1");
    }

    private static ReleaseDependency dependency(String kind, String id, String path) {
        return new ReleaseDependency(kind, "ontology-1", id, path);
    }

    private static OntologyRuntimeGateway.Snapshot snapshot() {
        return new OntologyRuntimeGateway.Snapshot(
                "snapshot-1",
                "digest-1",
                List.of(new OntologyRuntimeGateway.ObjectTypeMetadata(
                        "Order", List.of(new OntologyRuntimeGateway.PropertyMetadata("name", "string", false)))),
                List.of(new OntologyRuntimeGateway.FunctionMetadata("total", "number", List.of())),
                List.of(new OntologyRuntimeGateway.LinkMetadata("customer", "Order", "Customer")),
                List.of(new OntologyRuntimeGateway.ActionMetadata("archive", "Order", List.of())));
    }

    private static OntologyMetadataSnapshot snapshotEntity() {
        OntologyProjectDefinition definition = new OntologyProjectDefinition(
                "project-1",
                "1",
                1,
                List.of(new ObjectTypeDTO(
                        "Order", "Order", List.of(new PropertyDTO("name", "Name", "STRING", false, false, false)))),
                List.of(new LinkTypeDTO("customer", "Customer", "Order", "Customer", "ONE")),
                List.of(new FunctionDTO("total", "Total", "NUMBER", List.of(), true)),
                List.of(new ActionTypeDTO("archive", "Archive", "Order", List.of(), true)));
        return new OntologyMetadataSnapshot(
                "snapshot-1",
                "project-1",
                "1",
                "demo",
                null,
                "provider-1",
                "test",
                java.time.Instant.EPOCH,
                "digest-1",
                definition);
    }
}
