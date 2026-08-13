package com.celanworksmith.ontology.datasource;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionDTO;
import com.appsmith.external.models.Datasource;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.DatasourceStorageDTO;
import com.appsmith.external.models.Property;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.datasources.base.DatasourceService;
import com.appsmith.server.datasourcestorages.base.DatasourceStorageService;
import com.appsmith.server.domains.NewAction;
import com.appsmith.server.repositories.NewActionRepository;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

public class OntologyDatasourceCompatibilityService {
    private static final String DEFAULT_ENVIRONMENT_ID = "";
    private static final String SNAPSHOT_ID = "metadataSnapshotId";
    private static final String METADATA_DIGEST = "metadataDigest";

    private final DatasourceService datasourceService;
    private final DatasourceStorageService datasourceStorageService;
    private final NewActionRepository actionRepository;
    private final OntologyMetadataSnapshotRepository snapshotRepository;

    public OntologyDatasourceCompatibilityService(
            DatasourceService datasourceService,
            DatasourceStorageService datasourceStorageService,
            NewActionRepository actionRepository,
            OntologyMetadataSnapshotRepository snapshotRepository) {
        this.datasourceService = datasourceService;
        this.datasourceStorageService = datasourceStorageService;
        this.actionRepository = actionRepository;
        this.snapshotRepository = snapshotRepository;
    }

    public Mono<Report> analyzeUpgrade(String datasourceId, String candidateSnapshotId) {
        return datasource(datasourceId)
                .flatMap(datasource -> Mono.zip(
                        snapshot(datasource),
                        candidateSnapshot(candidateSnapshotId),
                        actionRepository
                                .findByDatasourceId(datasourceId, AclPermission.READ_ACTIONS)
                                .collectList()))
                .map(values -> analyze(values.getT1(), values.getT2(), values.getT3()));
    }

    Mono<Datasource> datasource(String datasourceId) {
        if (isBlank(datasourceId)) {
            return Mono.error(new IllegalArgumentException("Datasource ID is required"));
        }
        return datasourceService
                .findById(datasourceId, AclPermission.READ_DATASOURCES)
                .flatMap(datasource -> datasourceStorageService
                        .findByDatasource(datasource)
                        .map(datasourceStorageService::createDatasourceStorageDTOFromDatasourceStorage)
                        .collectMap(DatasourceStorageDTO::getEnvironmentId)
                        .map(storages -> {
                            datasource.setDatasourceStorages(storages);
                            return datasource;
                        }))
                .filter(datasource -> OntologyDatasourceService.PLUGIN_ID.equals(datasource.getPluginId()))
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Ontology datasource was not found")));
    }

    Mono<OntologyMetadataSnapshot> snapshot(Datasource datasource) {
        Map<String, String> properties = properties(requiredStorage(datasource).getDatasourceConfiguration());
        String snapshotId = required(properties, SNAPSHOT_ID);
        String digest = required(properties, METADATA_DIGEST);
        return snapshotRepository
                .findById(snapshotId)
                .filter(snapshot -> digest.equals(snapshot.metadataDigest()))
                .switchIfEmpty(
                        Mono.error(new IllegalArgumentException("Pinned ontology metadata snapshot was not found")));
    }

    Mono<OntologyMetadataSnapshot> candidateSnapshot(String candidateSnapshotId) {
        if (isBlank(candidateSnapshotId)) {
            return Mono.error(new IllegalArgumentException("Candidate snapshot ID is required"));
        }
        return snapshotRepository
                .findById(candidateSnapshotId)
                .switchIfEmpty(
                        Mono.error(new IllegalArgumentException("Candidate ontology metadata snapshot was not found")));
    }

    static Report analyze(
            OntologyMetadataSnapshot current, OntologyMetadataSnapshot candidate, List<NewAction> actions) {
        if (!current.projectId().equals(candidate.projectId())) {
            throw new IllegalArgumentException("Candidate snapshot belongs to another ontology project");
        }
        Map<String, String> currentProperties = propertyTypes(current);
        Map<String, String> candidateProperties = propertyTypes(candidate);
        Set<String> referencedMetadataIds = actions.stream()
                .flatMap(action -> referencedMetadataIds(action).stream())
                .collect(Collectors.toSet());
        List<Impact> deletedReferences = currentProperties.keySet().stream()
                .filter(metadataId -> !candidateProperties.containsKey(metadataId))
                .filter(referencedMetadataIds::contains)
                .map(metadataId -> new Impact(metadataId, ImpactKind.DELETED_PROPERTY_REFERENCED))
                .toList();
        List<Impact> changedTypes = currentProperties.entrySet().stream()
                .filter(entry -> candidateProperties.containsKey(entry.getKey()))
                .filter(entry -> !entry.getValue().equals(candidateProperties.get(entry.getKey())))
                .map(entry -> new Impact(entry.getKey(), ImpactKind.PROPERTY_TYPE_CHANGED))
                .toList();
        List<Impact> impacts = new java.util.ArrayList<>(deletedReferences);
        impacts.addAll(changedTypes);
        if (!deletedReferences.isEmpty()) {
            return new Report(Classification.BLOCKING, true, List.copyOf(impacts));
        }
        if (!changedTypes.isEmpty()) {
            return new Report(Classification.MANUAL, true, List.copyOf(impacts));
        }
        return new Report(Classification.COMPATIBLE, false, List.of());
    }

    static DatasourceStorageDTO requiredStorage(Datasource datasource) {
        DatasourceStorageDTO storage = datasource.getDatasourceStorages() == null
                ? null
                : datasource.getDatasourceStorages().get(DEFAULT_ENVIRONMENT_ID);
        if (storage == null || storage.getDatasourceConfiguration() == null) {
            throw new IllegalArgumentException("Ontology datasource configuration is missing");
        }
        return storage;
    }

    static Map<String, String> properties(DatasourceConfiguration configuration) {
        Map<String, String> values = new LinkedHashMap<>();
        if (configuration.getProperties() != null) {
            for (Property property : configuration.getProperties()) {
                if (property != null && property.getKey() != null && property.getValue() != null) {
                    values.put(property.getKey(), String.valueOf(property.getValue()));
                }
            }
        }
        return values;
    }

    static String required(Map<String, String> properties, String key) {
        String value = properties.get(key);
        if (isBlank(value)) {
            throw new IllegalArgumentException("Ontology datasource property is missing: " + key);
        }
        return value;
    }

    private static Map<String, String> propertyTypes(OntologyMetadataSnapshot snapshot) {
        Map<String, String> propertyTypes = new LinkedHashMap<>();
        for (ObjectTypeDTO objectType : snapshot.definition().objectTypes()) {
            for (PropertyDTO property : objectType.properties()) {
                propertyTypes.put(objectType.id() + "." + property.id(), property.dataType());
            }
        }
        return propertyTypes;
    }

    private static Set<String> referencedMetadataIds(NewAction action) {
        return java.util.stream.Stream.of(action.getUnpublishedAction(), action.getPublishedAction())
                .filter(java.util.Objects::nonNull)
                .map(ActionDTO::getActionConfiguration)
                .filter(java.util.Objects::nonNull)
                .map(ActionConfiguration::getPluginSpecifiedTemplates)
                .filter(java.util.Objects::nonNull)
                .flatMap(List::stream)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                Property::getKey,
                                property -> String.valueOf(property.getValue()),
                                (left, right) -> right),
                        values -> {
                            String objectTypeId = values.get("ontologyObjectTypeId");
                            String propertyId = values.get("ontologyPropertyId");
                            return !isBlank(objectTypeId) && !isBlank(propertyId)
                                    ? Set.of(objectTypeId + "." + propertyId)
                                    : Set.of();
                        }));
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public enum Classification {
        COMPATIBLE,
        MANUAL,
        BLOCKING
    }

    public enum ImpactKind {
        DELETED_PROPERTY_REFERENCED,
        PROPERTY_TYPE_CHANGED
    }

    public record Impact(String metadataId, ImpactKind kind) {}

    public record Report(Classification classification, boolean blocking, List<Impact> impacts) {}
}
