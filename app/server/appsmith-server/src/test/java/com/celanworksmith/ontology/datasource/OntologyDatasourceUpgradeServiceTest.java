package com.celanworksmith.ontology.datasource;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionDTO;
import com.appsmith.external.models.Datasource;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.DatasourceStorageDTO;
import com.appsmith.external.models.Property;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.datasources.base.DatasourceService;
import com.appsmith.server.domains.NewAction;
import com.appsmith.server.repositories.NewActionRepository;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OntologyDatasourceUpgradeServiceTest {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-08-13T01:00:00Z"), ZoneOffset.UTC);

    @Test
    void classifiesAnAddedPropertyAsCompatible() {
        Fixture fixture = fixture(currentSnapshot(), candidateSnapshotWithAddedProperty());

        StepVerifier.create(fixture.service.analyzeUpgrade("datasource-1", "snapshot-2"))
                .assertNext(report -> {
                    assertThat(report.classification())
                            .isEqualTo(OntologyDatasourceCompatibilityService.Classification.COMPATIBLE);
                    assertThat(report.impacts()).isEmpty();
                })
                .verifyComplete();
    }

    @Test
    void blocksDeletingAPropertyReferencedByAnActionStableMetadataId() {
        Fixture fixture = fixture(currentSnapshot(), candidateSnapshotWithoutAmount());
        when(fixture.actions.findByDatasourceId("datasource-1", AclPermission.READ_ACTIONS))
                .thenReturn(Flux.just(action("action-1", "application-1", "datasource-1", "PurchaseOrder", "amount")));

        StepVerifier.create(fixture.service.analyzeUpgrade("datasource-1", "snapshot-2"))
                .assertNext(report -> {
                    assertThat(report.classification())
                            .isEqualTo(OntologyDatasourceCompatibilityService.Classification.BLOCKING);
                    assertThat(report.impacts())
                            .extracting(OntologyDatasourceCompatibilityService.Impact::metadataId)
                            .containsExactly("PurchaseOrder.amount");
                })
                .verifyComplete();
    }

    @Test
    void classifiesAChangedPropertyTypeAsManualAndBlocking() {
        Fixture fixture = fixture(currentSnapshot(), candidateSnapshotWithChangedAmountType());

        StepVerifier.create(fixture.service.analyzeUpgrade("datasource-1", "snapshot-2"))
                .assertNext(report -> {
                    assertThat(report.classification())
                            .isEqualTo(OntologyDatasourceCompatibilityService.Classification.MANUAL);
                    assertThat(report.blocking()).isTrue();
                    assertThat(report.impacts())
                            .extracting(OntologyDatasourceCompatibilityService.Impact::metadataId)
                            .containsExactly("PurchaseOrder.amount");
                })
                .verifyComplete();
    }

    @Test
    void appliesAnExplicitCompatibleUpgradeAndAuditsExactSnapshots() {
        Fixture fixture = fixture(currentSnapshot(), candidateSnapshotWithAddedProperty());
        AtomicReference<DatasourceStorageDTO> updatedStorage = new AtomicReference<>();
        when(fixture.datasources.updateDatasourceStorage(any(), eq(""), eq(true)))
                .thenAnswer(invocation -> {
                    DatasourceStorageDTO storage = invocation.getArgument(0);
                    updatedStorage.set(storage);
                    return Mono.just(fixture.datasource);
                });

        StepVerifier.create(fixture.service.applyUpgrade("datasource-1", "snapshot-2", "admin-2"))
                .assertNext(audit -> {
                    assertThat(audit.beforeSnapshotId()).isEqualTo("snapshot-1");
                    assertThat(audit.beforeDigest()).isEqualTo("sha256:" + "a".repeat(64));
                    assertThat(audit.afterSnapshotId()).isEqualTo("snapshot-2");
                    assertThat(audit.afterDigest()).isEqualTo("sha256:" + "b".repeat(64));
                    assertThat(audit.actor()).isEqualTo("admin-2");
                    assertThat(audit.createdAt()).isEqualTo(Instant.parse("2026-08-13T01:00:00Z"));
                    assertThat(audit.rollbackOfAuditId()).isNull();
                })
                .verifyComplete();

        assertThat(properties(updatedStorage.get().getDatasourceConfiguration()))
                .containsEntry("projectVersion", "2.0.0")
                .containsEntry("metadataSnapshotId", "snapshot-2")
                .containsEntry("metadataDigest", "sha256:" + "b".repeat(64))
                .containsEntry("runtimeProviderId", "demo-mongo-readonly");
    }

    @Test
    void rollbackRestoresTheExactPriorSnapshotAndLinksItsAudit() {
        Fixture fixture = fixture(currentSnapshot(), candidateSnapshotWithAddedProperty());
        OntologyDatasourceUpgradeAudit priorAudit = new OntologyDatasourceUpgradeAudit(
                "audit-1",
                "datasource-1",
                "snapshot-1",
                "sha256:" + "a".repeat(64),
                "snapshot-2",
                "sha256:" + "b".repeat(64),
                "admin-2",
                Instant.parse("2026-08-13T01:00:00Z"),
                new OntologyDatasourceCompatibilityService.Report(
                        OntologyDatasourceCompatibilityService.Classification.COMPATIBLE, false, List.of()),
                null);
        fixture.datasource
                .getDatasourceStorages()
                .get("")
                .setDatasourceConfiguration(configuration(candidateSnapshotWithAddedProperty()));
        when(fixture.auditRepository.findById("audit-1")).thenReturn(Mono.just(priorAudit));
        when(fixture.datasources.updateDatasourceStorage(any(), eq(""), eq(true)))
                .thenReturn(Mono.just(fixture.datasource));

        StepVerifier.create(fixture.service.rollback("audit-1", "admin-3"))
                .assertNext(audit -> {
                    assertThat(audit.afterSnapshotId()).isEqualTo("snapshot-1");
                    assertThat(audit.afterDigest()).isEqualTo("sha256:" + "a".repeat(64));
                    assertThat(audit.rollbackOfAuditId()).isEqualTo("audit-1");
                })
                .verifyComplete();
    }

    @Test
    void rejectsASecondActiveProjectVersionForTheSameApplication() {
        Fixture fixture = fixture(currentSnapshot(), candidateSnapshotWithAddedProperty());
        Datasource otherDatasource = datasource("datasource-2", currentSnapshot());
        when(fixture.actions.findByDatasourceId("datasource-1", AclPermission.READ_ACTIONS))
                .thenReturn(Flux.just(
                        action("action-1", "application-1", "datasource-1", "PurchaseOrder", "amount"),
                        action("action-2", "application-1", "datasource-2", "PurchaseOrder", "amount")));
        when(fixture.actions.findByApplicationId("application-1", AclPermission.READ_ACTIONS))
                .thenReturn(Flux.just(
                        action("action-1", "application-1", "datasource-1", "PurchaseOrder", "amount"),
                        action("action-2", "application-1", "datasource-2", "PurchaseOrder", "amount")));
        when(fixture.datasources.findById("datasource-2", AclPermission.READ_DATASOURCES))
                .thenReturn(Mono.just(otherDatasource));
        when(fixture.datasources.updateDatasourceStorage(any(), eq(""), eq(true)))
                .thenReturn(Mono.just(fixture.datasource));

        StepVerifier.create(fixture.service.applyUpgrade("datasource-1", "snapshot-2", "admin-2"))
                .expectErrorMatches(error -> error instanceof IllegalArgumentException
                        && error.getMessage().contains("second active project version"))
                .verify();
    }

    private static Fixture fixture(OntologyMetadataSnapshot current, OntologyMetadataSnapshot candidate) {
        DatasourceService datasources = mock(DatasourceService.class);
        NewActionRepository actions = mock(NewActionRepository.class);
        OntologyMetadataSnapshotRepository snapshots = mock(OntologyMetadataSnapshotRepository.class);
        OntologyDatasourceUpgradeService.AuditStore auditRepository =
                mock(OntologyDatasourceUpgradeService.AuditStore.class);
        Datasource datasource = datasource("datasource-1", current);
        when(datasources.findById("datasource-1", AclPermission.READ_DATASOURCES))
                .thenReturn(Mono.just(datasource));
        when(snapshots.findById("snapshot-1")).thenReturn(Mono.just(current));
        when(snapshots.findById("snapshot-2")).thenReturn(Mono.just(candidate));
        when(actions.findByDatasourceId("datasource-1", AclPermission.READ_ACTIONS))
                .thenReturn(Flux.empty());
        when(auditRepository.save(any())).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        OntologyDatasourceCompatibilityService compatibility =
                new OntologyDatasourceCompatibilityService(datasources, actions, snapshots);
        return new Fixture(
                new OntologyDatasourceUpgradeService(datasources, actions, compatibility, auditRepository, CLOCK, null),
                datasources,
                actions,
                auditRepository,
                datasource);
    }

    private static OntologyMetadataSnapshot currentSnapshot() {
        return snapshot("snapshot-1", "1.0.0", "sha256:" + "a".repeat(64), "DECIMAL", true);
    }

    private static OntologyMetadataSnapshot candidateSnapshotWithAddedProperty() {
        return snapshot(
                "snapshot-2",
                "2.0.0",
                "sha256:" + "b".repeat(64),
                List.of(
                        new PropertyDTO("amount", "Amount display name", "DECIMAL", false, false, false),
                        new PropertyDTO("status", "Status display name", "STRING", false, false, false)));
    }

    private static OntologyMetadataSnapshot candidateSnapshotWithoutAmount() {
        return snapshot("snapshot-2", "2.0.0", "sha256:" + "b".repeat(64), null, false);
    }

    private static OntologyMetadataSnapshot candidateSnapshotWithChangedAmountType() {
        return snapshot("snapshot-2", "2.0.0", "sha256:" + "b".repeat(64), "STRING", true);
    }

    private static OntologyMetadataSnapshot snapshot(
            String id, String version, String digest, String amountType, boolean includeAmount) {
        List<PropertyDTO> properties = includeAmount
                ? List.of(new PropertyDTO("amount", "Amount display name", amountType, false, false, false))
                : List.of(new PropertyDTO("status", "Status display name", "STRING", false, false, false));
        return snapshot(id, version, digest, properties);
    }

    private static OntologyMetadataSnapshot snapshot(
            String id, String version, String digest, List<PropertyDTO> properties) {
        return new OntologyMetadataSnapshot(
                id,
                "supply-chain",
                version,
                "local-yaml",
                "release-" + version,
                "demo-mongo-readonly",
                "admin-1",
                Instant.parse("2026-08-13T00:00:00Z"),
                digest,
                new OntologyProjectDefinition(
                        "supply-chain",
                        version,
                        1,
                        List.of(new ObjectTypeDTO(
                                "PurchaseOrder", "Purchase order display name", properties, null, "id")),
                        List.of(),
                        List.of(),
                        List.of()));
    }

    private static Datasource datasource(String id, OntologyMetadataSnapshot snapshot) {
        Datasource datasource = new Datasource();
        datasource.setId(id);
        datasource.setPluginId(OntologyDatasourceService.PLUGIN_ID);
        datasource.setWorkspaceId("workspace-1");
        datasource.setDatasourceStorages(Map.of("", new DatasourceStorageDTO(null, "", configuration(snapshot))));
        return datasource;
    }

    private static DatasourceConfiguration configuration(OntologyMetadataSnapshot snapshot) {
        return DatasourceConfiguration.builder()
                .properties(List.of(
                        new Property("projectId", snapshot.projectId()),
                        new Property("projectVersion", snapshot.projectVersion()),
                        new Property("metadataSnapshotId", snapshot.id()),
                        new Property("metadataDigest", snapshot.metadataDigest()),
                        new Property("runtimeProviderId", snapshot.runtimeProviderId()),
                        new Property("sourceKind", snapshot.sourceKind())))
                .build();
    }

    private static NewAction action(
            String id, String applicationId, String datasourceId, String objectTypeId, String propertyId) {
        Datasource datasource = new Datasource();
        datasource.setId(datasourceId);
        ActionConfiguration configuration = new ActionConfiguration();
        configuration.setPluginSpecifiedTemplates(List.of(
                new Property("ontologyObjectTypeId", objectTypeId), new Property("ontologyPropertyId", propertyId)));
        ActionDTO action = new ActionDTO();
        action.setDatasource(datasource);
        action.setActionConfiguration(configuration);
        NewAction newAction = new NewAction();
        newAction.setId(id);
        newAction.setApplicationId(applicationId);
        newAction.setUnpublishedAction(action);
        return newAction;
    }

    private static Map<String, String> properties(DatasourceConfiguration configuration) {
        return configuration.getProperties().stream()
                .collect(java.util.stream.Collectors.toMap(
                        Property::getKey, property -> String.valueOf(property.getValue())));
    }

    private record Fixture(
            OntologyDatasourceUpgradeService service,
            DatasourceService datasources,
            NewActionRepository actions,
            OntologyDatasourceUpgradeService.AuditStore auditRepository,
            Datasource datasource) {}
}
