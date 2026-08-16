package com.celanworksmith.release;

import com.celanworksmith.application.CelanworksmithApplicationBindingResolver;
import com.celanworksmith.ontology.datasource.OntologyMetadataSnapshot;
import com.celanworksmith.ontology.datasource.OntologySnapshotService;
import com.celanworksmith.ontology.datasource.RuntimeProviderCompatibilityValidator;
import com.celanworksmith.ontology.datasource.RuntimeProviderRegistry;
import com.celanworksmith.ontology.datasource.WorkspaceActionServerConfigurationResolver;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.release.model.ActionServerAdapterReference;
import com.celanworksmith.release.model.ReleaseDatasourcePin;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import com.celanworksmith.runtime.adapter.mongodb.MongoRuntimeDataProvider;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ApplicationReleaseProviderHealthGateTest {
    private final OntologySnapshotService snapshotService = mock(OntologySnapshotService.class);
    private final ReactiveMongoTemplate mongoTemplate = mock(ReactiveMongoTemplate.class);
    private final CelanworksmithApplicationBindingResolver bindingResolver =
            mock(CelanworksmithApplicationBindingResolver.class);
    private final MongoRuntimeDataProvider demoProvider = new MongoRuntimeDataProvider(mongoTemplate, bindingResolver);
    private final RuntimeProviderCompatibilityValidator compatibilityValidator =
            new RuntimeProviderCompatibilityValidator(new RuntimeProviderRegistry(List.of(demoProvider)));
    private final ApplicationReleaseProviderHealthGate gate =
            new ApplicationReleaseProviderHealthGate(snapshotService, compatibilityValidator);

    @Test
    void acceptsTheMongoBackedDemoProviderUsingTheExactPin() {
        ReleaseDatasourcePin pin = pin("demo-mongo-readonly", "snapshot-1", "digest-1");
        OntologyMetadataSnapshot snapshot = snapshot("snapshot-1", "digest-1", "demo-mongo-readonly");
        when(snapshotService.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshot));

        assertThat(gate.check(List.of(pin)).block()).isEmpty();

        verify(snapshotService).getRequiredSnapshot("snapshot-1", "digest-1");
        verifyNoInteractions(mongoTemplate, bindingResolver);
    }

    @Test
    void mapsAnUnavailableProviderToAStableDiagnostic() {
        ReleaseDatasourcePin pin = pin("missing-provider", "snapshot-1", "digest-1");
        OntologyMetadataSnapshot snapshot = snapshot("snapshot-1", "digest-1", "missing-provider");
        when(snapshotService.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshot));

        assertThat(gate.check(List.of(pin)).block())
                .extracting("severity", "code", "path")
                .containsExactly(org.assertj.core.groups.Tuple.tuple(
                        ReleaseDiagnostic.Severity.BLOCKING,
                        "RELEASE_ONTOLOGY_PROVIDER_UNAVAILABLE",
                        "datasources[ontology-1].providerId"));
    }

    @Test
    void mapsAnIncompatibleProviderResultToAStableDiagnostic() {
        ReleaseDatasourcePin pin = pin("demo-mongo-readonly", "snapshot-1", "digest-1");
        OntologyMetadataSnapshot snapshot = snapshot("snapshot-1", "digest-1", "demo-mongo-readonly", "STRING");
        when(snapshotService.getRequiredSnapshot("snapshot-1", "digest-1")).thenReturn(Mono.just(snapshot));

        assertThat(gate.check(List.of(pin)).block())
                .extracting("severity", "code", "path", "message", "details")
                .containsExactly(org.assertj.core.groups.Tuple.tuple(
                        ReleaseDiagnostic.Severity.BLOCKING,
                        "RELEASE_ONTOLOGY_PROVIDER_INCOMPATIBLE",
                        "datasources[ontology-1].providerId",
                        "Runtime provider metadata mapping is incompatible",
                        java.util.Map.of()));
    }

    @Test
    void mapsDigestMismatchWithoutAcceptingAnotherSnapshot() {
        ReleaseDatasourcePin pin = pin("demo-mongo-readonly", "snapshot-1", "digest-1");
        when(snapshotService.getRequiredSnapshot("snapshot-1", "digest-1"))
                .thenReturn(Mono.error(new OntologySnapshotService.SnapshotDigestMismatchException()));

        assertThat(gate.check(List.of(pin)).block())
                .extracting(ReleaseDiagnostic::code)
                .containsExactly("RELEASE_ONTOLOGY_SNAPSHOT_DIGEST_MISMATCH");

        verify(snapshotService).getRequiredSnapshot("snapshot-1", "digest-1");
    }

    @Test
    void validatesAdapterShapeWithoutInvokingAnActionServerProtocol() {
        ActionServerAdapterConfigurationValidator validator = new ActionServerAdapterConfigurationValidator();
        WorkspaceActionServerConfigurationResolver actionServerResolver =
                mock(WorkspaceActionServerConfigurationResolver.class);

        assertThat(validator.validate(
                        new ActionServerAdapterReference("ontology-actions", "v1", "https://actions.example")))
                .isEmpty();
        assertThat(validator.validate(new ActionServerAdapterReference("ontology-actions", "v1", "not a uri")))
                .extracting(ReleaseDiagnostic::code)
                .containsExactly("RELEASE_ACTION_SERVER_ADAPTER_INVALID");
        assertThat(validator.validate(new ActionServerAdapterReference("-bad", "v1", "ftp://actions.example")))
                .extracting(ReleaseDiagnostic::path)
                .containsExactly("actionServer.adapterId", "actionServer.endpoint");
        assertThat(validator.validate(
                        new ActionServerAdapterReference("ontology-actions", "v 1", "https:///missing-host")))
                .extracting(ReleaseDiagnostic::path)
                .containsExactly("actionServer.adapterVersion", "actionServer.endpoint");
        assertThat(validator.validate(null)).extracting(ReleaseDiagnostic::path).containsExactly("actionServer");
        org.junit.jupiter.api.Assertions.assertAll(
                () -> org.junit.jupiter.api.Assertions.assertThrows(
                        IllegalArgumentException.class,
                        () -> new ActionServerAdapterReference(null, "v1", "https://actions.example")),
                () -> org.junit.jupiter.api.Assertions.assertThrows(
                        IllegalArgumentException.class,
                        () -> new ActionServerAdapterReference("actions", "", "https://actions.example")),
                () -> org.junit.jupiter.api.Assertions.assertThrows(
                        IllegalArgumentException.class, () -> new ActionServerAdapterReference("actions", "v1", null)));
        verifyNoInteractions(actionServerResolver);
    }

    @Test
    void ignoresNonOntologyPins() {
        assertThat(gate.check(List.of(new ReleaseDatasourcePin("db-1", "postgres", "NATIVE", null, null, null, null)))
                        .block())
                .isEmpty();
        verifyNoInteractions(snapshotService);
    }

    private ReleaseDatasourcePin pin(String providerId, String snapshotId, String digest) {
        return new ReleaseDatasourcePin(
                "ontology-1", "ontology-plugin", "ONTOLOGY", providerId, snapshotId, digest, "1");
    }

    private OntologyMetadataSnapshot snapshot(String id, String digest, String providerId) {
        return snapshot(id, digest, providerId, "DECIMAL");
    }

    private OntologyMetadataSnapshot snapshot(String id, String digest, String providerId, String amountType) {
        OntologyProjectDefinition definition = new OntologyProjectDefinition(
                "celanworksmith-demo",
                "1.0.0",
                1,
                List.of(new ObjectTypeDTO(
                        "PurchaseOrder",
                        "Purchase Order",
                        List.of(new PropertyDTO("amount", "Amount", amountType, true, false, false)),
                        null,
                        "id")),
                List.of(),
                List.of(),
                List.of());
        return new OntologyMetadataSnapshot(
                id,
                definition.projectId(),
                definition.version(),
                "demo",
                "builtin-demo",
                providerId,
                "admin-1",
                Instant.parse("2026-08-13T00:00:00Z"),
                digest,
                definition);
    }
}
