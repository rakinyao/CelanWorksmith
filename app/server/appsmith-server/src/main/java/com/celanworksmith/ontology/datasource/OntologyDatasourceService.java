package com.celanworksmith.ontology.datasource;

import com.appsmith.external.models.Datasource;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.DatasourceStorageDTO;
import com.appsmith.external.models.Property;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.datasources.base.DatasourceService;
import com.appsmith.server.services.WorkspaceService;
import com.celanworksmith.ontology.datasource.dto.ImportOntologyDatasourceRequest;
import com.celanworksmith.ontology.datasource.dto.OntologyDatasourceSummary;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class OntologyDatasourceService {
    public static final String PLUGIN_ID = "celanworksmith-ontology-plugin";
    private static final String DEFAULT_ENVIRONMENT_ID = "";

    private final WorkspaceService workspaceService;
    private final DatasourceService datasourceService;
    private final Map<OntologyProjectImportSource.Kind, OntologyProjectImportSource> importers;
    private final RuntimeProviderCompatibilityValidator compatibilityValidator;

    public OntologyDatasourceService(
            WorkspaceService workspaceService,
            DatasourceService datasourceService,
            List<OntologyProjectImportSource> importers,
            RuntimeProviderCompatibilityValidator compatibilityValidator) {
        this.workspaceService = workspaceService;
        this.datasourceService = datasourceService;
        this.compatibilityValidator = compatibilityValidator;
        this.importers = indexImporters(importers);
    }

    public Mono<OntologyDatasourceSummary> importDatasource(ImportOntologyDatasourceRequest request) {
        validateRequest(request);
        return workspaceService
                .findById(request.workspaceId(), AclPermission.WORKSPACE_MANAGE_DATASOURCES)
                .switchIfEmpty(
                        Mono.error(new IllegalArgumentException("Workspace datasource administration is required")))
                .then(Mono.defer(
                        () -> importerFor(request.projectImportRequest().sourceKind())
                                .importProject(request.projectImportRequest())))
                .flatMap(snapshot -> compatibilityValidator
                        .validate(snapshot, snapshot.runtimeProviderId())
                        .flatMap(validation -> validation.compatible()
                                ? Mono.just(snapshot)
                                : Mono.error(new IllegalArgumentException("Runtime Provider is incompatible: "
                                        + String.join("; ", validation.errors())))))
                .map(snapshot -> datasource(request, snapshot))
                .flatMap(datasourceService::create)
                .flatMap(this::persistDatasourceId)
                .map(datasource -> summary(datasource, request.changeNote()));
    }

    public Flux<OntologyDatasourceSummary> listDatasourceCandidates(String workspaceId) {
        if (isBlank(workspaceId)) {
            return Flux.error(new IllegalArgumentException("Workspace ID is required"));
        }
        return datasourceService
                .getAllByWorkspaceIdWithStorages(workspaceId, AclPermission.READ_DATASOURCES)
                .filter(datasource -> PLUGIN_ID.equals(datasource.getPluginId()))
                .map(datasource -> summary(datasource, null));
    }

    public Mono<OntologyDatasourceSummary> getDatasourceSummary(String datasourceId) {
        return findOntologyDatasource(datasourceId, AclPermission.READ_DATASOURCES)
                .flatMap(datasource -> loadDatasourceWithStorages(datasource, AclPermission.READ_DATASOURCES))
                .map(datasource -> summary(datasource, null));
    }

    public Mono<OntologyDatasourceSummary> stopDatasource(String datasourceId) {
        return findOntologyDatasource(datasourceId, AclPermission.MANAGE_DATASOURCES)
                .flatMap(datasource -> loadDatasourceWithStorages(datasource, AclPermission.MANAGE_DATASOURCES))
                .flatMap(datasource -> {
                    DatasourceStorageDTO storage = requiredStorage(datasource);
                    storage.setIsConfigured(false);
                    return datasourceService.updateDatasourceStorage(storage, storage.getEnvironmentId(), true);
                })
                .map(datasource -> summary(datasource, null));
    }

    public Mono<Void> deleteDatasource(String datasourceId) {
        return findOntologyDatasource(datasourceId, AclPermission.DELETE_DATASOURCES)
                .flatMap(datasource -> datasourceService.archiveById(datasource.getId()))
                .then();
    }

    private OntologyProjectImportSource importerFor(OntologyProjectImportSource.Kind sourceKind) {
        OntologyProjectImportSource importer = importers.get(sourceKind);
        if (importer == null) {
            throw new IllegalArgumentException("Ontology import source is not configured: " + sourceKind);
        }
        return importer;
    }

    private Datasource datasource(ImportOntologyDatasourceRequest request, OntologyMetadataSnapshot snapshot) {
        Datasource datasource = new Datasource();
        datasource.setName(request.datasourceName());
        datasource.setPluginId(PLUGIN_ID);
        datasource.setWorkspaceId(request.workspaceId());
        datasource.setDatasourceStorages(Map.of(
                DEFAULT_ENVIRONMENT_ID,
                new DatasourceStorageDTO(
                        null,
                        DEFAULT_ENVIRONMENT_ID,
                        configuration(request.datasourceName(), request.workspaceId(), snapshot))));
        return datasource;
    }

    private DatasourceConfiguration configuration(
            String datasourceName, String workspaceId, OntologyMetadataSnapshot snapshot) {
        return DatasourceConfiguration.builder()
                .properties(List.of(
                        property("projectId", snapshot.projectId()),
                        property("projectVersion", snapshot.projectVersion()),
                        property("metadataSnapshotId", snapshot.id()),
                        property("metadataDigest", snapshot.metadataDigest()),
                        property("runtimeProviderId", snapshot.runtimeProviderId()),
                        property("workspaceId", workspaceId),
                        property("datasourceId", "pending"),
                        property("projectName", datasourceName),
                        property("sourceKind", snapshot.sourceKind())))
                .build();
    }

    private Mono<Datasource> persistDatasourceId(Datasource datasource) {
        if (isBlank(datasource.getId())) {
            return Mono.error(new IllegalStateException("Created ontology datasource has no ID"));
        }
        DatasourceStorageDTO storage = requiredStorage(datasource);
        DatasourceConfiguration configuration = storage.getDatasourceConfiguration();
        List<Property> properties = configuration.getProperties().stream()
                .map(property -> property != null && "datasourceId".equals(property.getKey())
                        ? property("datasourceId", datasource.getId())
                        : property)
                .toList();
        configuration.setProperties(List.copyOf(properties));
        storage.setDatasourceId(datasource.getId());
        return datasourceService.updateDatasourceStorage(storage, storage.getEnvironmentId(), true);
    }

    private OntologyDatasourceSummary summary(Datasource datasource, String changeNote) {
        DatasourceStorageDTO storage = requiredStorage(datasource);
        Map<String, String> properties = properties(storage.getDatasourceConfiguration());
        return new OntologyDatasourceSummary(
                datasource.getId(),
                datasource.getName(),
                required(properties, "projectId"),
                required(properties, "projectVersion"),
                required(properties, "sourceKind"),
                required(properties, "runtimeProviderId"),
                required(properties, "metadataDigest"),
                Boolean.FALSE.equals(storage.getIsConfigured()) ? "STOPPED" : "ACTIVE",
                changeNote);
    }

    private Mono<Datasource> findOntologyDatasource(String datasourceId, AclPermission permission) {
        if (isBlank(datasourceId)) {
            return Mono.error(new IllegalArgumentException("Datasource ID is required"));
        }
        return datasourceService
                .findById(datasourceId, permission)
                .filter(datasource -> PLUGIN_ID.equals(datasource.getPluginId()))
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Ontology datasource was not found")));
    }

    private Mono<Datasource> loadDatasourceWithStorages(Datasource datasource, AclPermission permission) {
        return datasourceService
                .getAllByWorkspaceIdWithStorages(datasource.getWorkspaceId(), permission)
                .filter(candidate -> datasource.getId().equals(candidate.getId()))
                .filter(candidate -> PLUGIN_ID.equals(candidate.getPluginId()))
                .singleOrEmpty()
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Ontology datasource was not found")));
    }

    private DatasourceStorageDTO requiredStorage(Datasource datasource) {
        DatasourceStorageDTO storage = datasource.getDatasourceStorages().get(DEFAULT_ENVIRONMENT_ID);
        if (storage == null || storage.getDatasourceConfiguration() == null) {
            throw new IllegalArgumentException("Ontology datasource configuration is missing");
        }
        return storage;
    }

    private static Map<OntologyProjectImportSource.Kind, OntologyProjectImportSource> indexImporters(
            List<OntologyProjectImportSource> importers) {
        Map<OntologyProjectImportSource.Kind, OntologyProjectImportSource> indexed = new LinkedHashMap<>();
        if (importers != null) {
            for (OntologyProjectImportSource importer : importers) {
                if (importer != null) {
                    OntologyProjectImportSource previous = indexed.putIfAbsent(importer.sourceKind(), importer);
                    if (previous != null) {
                        throw new IllegalArgumentException(
                                "Ontology import source is duplicated: " + importer.sourceKind());
                    }
                }
            }
        }
        return indexed;
    }

    private static Map<String, String> properties(DatasourceConfiguration configuration) {
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

    private static Property property(String key, String value) {
        return new Property(key, value);
    }

    private static String required(Map<String, String> properties, String key) {
        String value = properties.get(key);
        if (isBlank(value)) {
            throw new IllegalArgumentException("Ontology datasource property is missing: " + key);
        }
        return value;
    }

    private static void validateRequest(ImportOntologyDatasourceRequest request) {
        if (request == null
                || isBlank(request.workspaceId())
                || isBlank(request.datasourceName())
                || request.projectImportRequest() == null
                || request.projectImportRequest().sourceKind() == null) {
            throw new IllegalArgumentException("Ontology datasource import request is incomplete");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
