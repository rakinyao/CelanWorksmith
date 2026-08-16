package com.celanworksmith.ontology.datasource;

import com.appsmith.external.models.Datasource;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.DatasourceStorageDTO;
import com.appsmith.external.models.Property;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.datasources.base.DatasourceService;
import com.appsmith.server.domains.NewAction;
import com.appsmith.server.repositories.NewActionRepository;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Mono;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

public class OntologyDatasourceUpgradeService {
    private static final String PROJECT_ID = "projectId";
    private static final String PROJECT_VERSION = "projectVersion";
    private static final String SNAPSHOT_ID = "metadataSnapshotId";
    private static final String METADATA_DIGEST = "metadataDigest";
    private static final String RUNTIME_PROVIDER_ID = "runtimeProviderId";
    private static final String PROVIDER_CONTRACT_VERSION = "providerContractVersion";
    private static final String SOURCE_KIND = "sourceKind";

    private final DatasourceService datasourceService;
    private final NewActionRepository actionRepository;
    private final OntologyDatasourceCompatibilityService compatibilityService;
    private final AuditStore auditStore;
    private final Clock clock;
    private final TransactionalOperator transactionalOperator;

    public OntologyDatasourceUpgradeService(
            DatasourceService datasourceService,
            NewActionRepository actionRepository,
            OntologyDatasourceCompatibilityService compatibilityService,
            AuditStore auditStore,
            Clock clock,
            TransactionalOperator transactionalOperator) {
        this.datasourceService = datasourceService;
        this.actionRepository = actionRepository;
        this.compatibilityService = compatibilityService;
        this.auditStore = auditStore;
        this.clock = clock;
        this.transactionalOperator = transactionalOperator;
    }

    public Mono<OntologyDatasourceCompatibilityService.Report> analyzeUpgrade(
            String datasourceId, String candidateSnapshotId) {
        return compatibilityService.analyzeUpgrade(datasourceId, candidateSnapshotId);
    }

    public Mono<OntologyDatasourceUpgradeAudit> applyUpgrade(
            String datasourceId, String candidateSnapshotId, String actor) {
        requireActor(actor);
        return Mono.zip(
                        compatibilityService.datasource(datasourceId),
                        compatibilityService.candidateSnapshot(candidateSnapshotId),
                        compatibilityService.analyzeUpgrade(datasourceId, candidateSnapshotId))
                .flatMap(values -> {
                    Datasource datasource = values.getT1();
                    OntologyMetadataSnapshot candidate = values.getT2();
                    OntologyDatasourceCompatibilityService.Report report = values.getT3();
                    if (report.blocking()) {
                        return Mono.error(
                                new IllegalArgumentException("Ontology datasource upgrade requires manual resolution"));
                    }
                    return compatibilityService.snapshot(datasource).flatMap(current -> enforceOneActiveVersion(
                                    datasource, candidate)
                            .then(updateAndAudit(datasource, current, candidate, actor, report, null)));
                });
    }

    public Mono<OntologyDatasourceUpgradeAudit> rollback(String auditId, String actor) {
        requireActor(actor);
        return auditStore
                .findById(auditId)
                .switchIfEmpty(
                        Mono.error(new IllegalArgumentException("Ontology datasource upgrade audit was not found")))
                .flatMap(original -> Mono.zip(
                                compatibilityService.datasource(original.datasourceId()),
                                compatibilityService.candidateSnapshot(original.beforeSnapshotId()))
                        .flatMap(values -> compatibilityService
                                .snapshot(values.getT1())
                                .flatMap(current -> {
                                    if (!original.afterSnapshotId().equals(current.id())
                                            || !original.afterDigest().equals(current.metadataDigest())) {
                                        return Mono.error(new IllegalArgumentException(
                                                "Ontology datasource no longer matches the audited upgrade"));
                                    }
                                    return auditStore
                                            .findByRollbackOfAuditId(original.id())
                                            .hasElement()
                                            .flatMap(hasRollback -> {
                                                if (hasRollback) {
                                                    return Mono.error(
                                                            new IllegalArgumentException(
                                                                    "Ontology datasource upgrade audit was already rolled back"));
                                                }
                                                return enforceOneActiveVersion(values.getT1(), values.getT2())
                                                        .then(updateAndAudit(
                                                                values.getT1(),
                                                                current,
                                                                values.getT2(),
                                                                actor,
                                                                original.report(),
                                                                original.id()));
                                            });
                                })));
    }

    private Mono<Void> enforceOneActiveVersion(Datasource datasource, OntologyMetadataSnapshot candidate) {
        return actionRepository
                .findByDatasourceId(datasource.getId(), AclPermission.READ_ACTIONS)
                .map(NewAction::getApplicationId)
                .filter(applicationId -> applicationId != null && !applicationId.isBlank())
                .distinct()
                .flatMap(applicationId -> actionRepository
                        .findByApplicationId(applicationId, AclPermission.READ_ACTIONS)
                        .flatMap(action -> datasourceIds(action)
                                .filter(otherDatasourceId -> !datasource.getId().equals(otherDatasourceId)))
                        .distinct()
                        .flatMap(otherDatasourceId -> compatibilityService
                                .datasource(otherDatasourceId)
                                .filter(this::isActive)
                                .flatMap(otherDatasource -> compatibilityService.snapshot(otherDatasource))
                                .filter(otherSnapshot -> candidate.projectId().equals(otherSnapshot.projectId()))
                                .filter(otherSnapshot ->
                                        !candidate.projectVersion().equals(otherSnapshot.projectVersion()))
                                .flatMap(otherSnapshot -> Mono.<Void>error(new IllegalArgumentException(
                                        "Cannot create a second active project version for this application")))))
                .then();
    }

    private Mono<OntologyDatasourceUpgradeAudit> updateAndAudit(
            Datasource datasource,
            OntologyMetadataSnapshot current,
            OntologyMetadataSnapshot candidate,
            String actor,
            OntologyDatasourceCompatibilityService.Report report,
            String rollbackOfAuditId) {
        DatasourceStorageDTO storage =
                updatedStorage(OntologyDatasourceCompatibilityService.requiredStorage(datasource), candidate);
        OntologyDatasourceUpgradeAudit audit = new OntologyDatasourceUpgradeAudit(
                UUID.randomUUID().toString(),
                datasource.getId(),
                current.id(),
                current.metadataDigest(),
                candidate.id(),
                candidate.metadataDigest(),
                actor,
                Instant.now(clock),
                report,
                rollbackOfAuditId);
        Mono<OntologyDatasourceUpgradeAudit> operation = datasourceService
                .updateDatasourceStorage(storage, storage.getEnvironmentId(), true)
                .then(auditStore.save(audit));
        return transactionalOperator == null ? operation : transactionalOperator.transactional(operation);
    }

    private DatasourceConfiguration configuration(DatasourceConfiguration existing, OntologyMetadataSnapshot snapshot) {
        Map<String, Property> properties = new LinkedHashMap<>();
        if (existing.getProperties() != null) {
            for (Property property : existing.getProperties()) {
                if (property != null && property.getKey() != null) {
                    properties.put(property.getKey(), property);
                }
            }
        }
        properties.put(PROJECT_ID, new Property(PROJECT_ID, snapshot.projectId()));
        properties.put(PROJECT_VERSION, new Property(PROJECT_VERSION, snapshot.projectVersion()));
        properties.put(SNAPSHOT_ID, new Property(SNAPSHOT_ID, snapshot.id()));
        properties.put(METADATA_DIGEST, new Property(METADATA_DIGEST, snapshot.metadataDigest()));
        properties.put(RUNTIME_PROVIDER_ID, new Property(RUNTIME_PROVIDER_ID, snapshot.runtimeProviderId()));
        properties.put(
                PROVIDER_CONTRACT_VERSION,
                new Property(PROVIDER_CONTRACT_VERSION, OntologyDatasourceService.PROVIDER_CONTRACT_VERSION));
        properties.put(SOURCE_KIND, new Property(SOURCE_KIND, snapshot.sourceKind()));
        return existing.toBuilder()
                .properties(new ArrayList<>(properties.values()))
                .build();
    }

    private static reactor.core.publisher.Flux<String> datasourceIds(NewAction action) {
        return reactor.core.publisher.Flux.fromStream(() -> Stream.concat(
                        Stream.ofNullable(action.getUnpublishedAction()),
                        Stream.ofNullable(action.getPublishedAction())))
                .map(actionDto -> actionDto.getDatasource())
                .filter(java.util.Objects::nonNull)
                .map(Datasource::getId)
                .filter(id -> id != null && !id.isBlank());
    }

    private DatasourceStorageDTO updatedStorage(DatasourceStorageDTO existing, OntologyMetadataSnapshot candidate) {
        DatasourceStorageDTO updated = new DatasourceStorageDTO();
        updated.setId(existing.getId());
        updated.setDatasourceId(existing.getDatasourceId());
        updated.setEnvironmentId(existing.getEnvironmentId());
        updated.setDatasourceConfiguration(configuration(existing.getDatasourceConfiguration(), candidate));
        updated.setIsConfigured(existing.getIsConfigured());
        updated.setInvalids(existing.getInvalids());
        updated.setMessages(existing.getMessages());
        updated.setPluginId(existing.getPluginId());
        updated.setWorkspaceId(existing.getWorkspaceId());
        return updated;
    }

    private boolean isActive(Datasource datasource) {
        return !Boolean.FALSE.equals(OntologyDatasourceCompatibilityService.requiredStorage(datasource)
                .getIsConfigured());
    }

    private static void requireActor(String actor) {
        if (actor == null || actor.isBlank()) {
            throw new IllegalArgumentException("Upgrade actor is required");
        }
    }

    public interface AuditStore {
        Mono<OntologyDatasourceUpgradeAudit> save(OntologyDatasourceUpgradeAudit audit);

        Mono<OntologyDatasourceUpgradeAudit> findById(String auditId);

        Mono<OntologyDatasourceUpgradeAudit> findByRollbackOfAuditId(String rollbackOfAuditId);
    }
}
