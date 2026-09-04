package com.celanworksmith.ontology.datasource;

import com.appsmith.server.datasources.base.DatasourceService;
import com.celanworksmith.runtime.dto.FunctionExecutionRequest;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.Map;

public class OntologySnapshotRuntimeGateway implements OntologyRuntimeGateway {
    private final OntologySnapshotService snapshotService;
    private final RuntimeProviderRegistry runtimeProviderRegistry;
    private final DatasourceService datasourceService;

    public OntologySnapshotRuntimeGateway(
            OntologySnapshotService snapshotService, RuntimeProviderRegistry runtimeProviderRegistry) {
        this(snapshotService, runtimeProviderRegistry, null);
    }

    public OntologySnapshotRuntimeGateway(
            OntologySnapshotService snapshotService,
            RuntimeProviderRegistry runtimeProviderRegistry,
            DatasourceService datasourceService) {
        this.snapshotService = snapshotService;
        this.runtimeProviderRegistry = runtimeProviderRegistry;
        this.datasourceService = datasourceService;
    }

    @Override
    public Mono<Snapshot> getRequiredSnapshot(String snapshotId, String digest) {
        return snapshotService.getRequiredSnapshot(snapshotId, digest).map(OntologyRuntimeSnapshotProjection::project);
    }

    @Override
    public Mono<Snapshot> getRequiredSnapshot(
            String snapshotId, String digest, String workspaceId, String datasourceId) {
        return requiredSnapshot(snapshotId, digest, workspaceId, datasourceId)
                .map(OntologyRuntimeSnapshotProjection::project);
    }

    public Mono<Snapshot> fromLoadedSnapshot(OntologyMetadataSnapshot snapshot) {
        return Mono.just(OntologyRuntimeSnapshotProjection.project(snapshot));
    }

    @Override
    public Mono<ObjectQueryResult> queryObjects(Snapshot snapshot, String objectTypeId, ObjectQuery query) {
        ObjectSetQuery providerQuery = new ObjectSetQuery(
                query.filter(), query.sortBy(), query.sortDirection(), query.offset(), query.limit());
        return queryObjects(requiredSnapshot(snapshot), objectTypeId, providerQuery);
    }

    @Override
    public Mono<ObjectQueryResult> queryObjects(
            String workspaceId, String datasourceId, Snapshot snapshot, String objectTypeId, ObjectQuery query) {
        ObjectSetQuery providerQuery = new ObjectSetQuery(
                query.filter(), query.sortBy(), query.sortDirection(), query.offset(), query.limit());
        return queryObjects(requiredSnapshot(snapshot, workspaceId, datasourceId), objectTypeId, providerQuery);
    }

    private Mono<ObjectQueryResult> queryObjects(
            Mono<OntologyMetadataSnapshot> persistedSnapshots, String objectTypeId, ObjectSetQuery providerQuery) {
        return persistedSnapshots
                .flatMap(persistedSnapshot -> runtimeProviderRegistry
                        .resolveRequired(persistedSnapshot.runtimeProviderId())
                        .queryObjects(persistedSnapshot.definition(), objectTypeId, providerQuery))
                .map(result -> new ObjectQueryResult(
                        result.items().stream()
                                .map(item -> {
                                    Map<String, Object> values = new LinkedHashMap<>();
                                    values.put("id", item.id());
                                    values.putAll(item.properties());
                                    return values;
                                })
                                .toList(),
                        result.offset(),
                        result.limit(),
                        result.total()));
    }

    @Override
    public Mono<Object> executeFunction(
            Snapshot snapshot, String functionId, OntologyObjectSet targets, Map<String, Object> parameters) {
        return executeFunction(requiredSnapshot(snapshot), functionId, targets, parameters);
    }

    @Override
    public Mono<Object> executeFunction(
            String workspaceId,
            String datasourceId,
            Snapshot snapshot,
            String functionId,
            OntologyObjectSet targets,
            Map<String, Object> parameters) {
        return executeFunction(requiredSnapshot(snapshot, workspaceId, datasourceId), functionId, targets, parameters);
    }

    private Mono<Object> executeFunction(
            Mono<OntologyMetadataSnapshot> persistedSnapshots,
            String functionId,
            OntologyObjectSet targets,
            Map<String, Object> parameters) {
        return persistedSnapshots.flatMap(persistedSnapshot -> runtimeProviderRegistry
                .resolveRequired(persistedSnapshot.runtimeProviderId())
                .executeFunction(
                        persistedSnapshot.definition(), functionId, new FunctionExecutionRequest(targets, parameters)));
    }

    @Override
    public Mono<java.util.List<Map<String, Object>>> resolveLink(
            Snapshot snapshot, String sourceTypeId, String sourceId, String linkId) {
        return resolveLink(requiredSnapshot(snapshot), sourceTypeId, sourceId, linkId);
    }

    @Override
    public Mono<java.util.List<Map<String, Object>>> resolveLink(
            String workspaceId,
            String datasourceId,
            Snapshot snapshot,
            String sourceTypeId,
            String sourceId,
            String linkId) {
        return resolveLink(requiredSnapshot(snapshot, workspaceId, datasourceId), sourceTypeId, sourceId, linkId);
    }

    private Mono<java.util.List<Map<String, Object>>> resolveLink(
            Mono<OntologyMetadataSnapshot> persistedSnapshots, String sourceTypeId, String sourceId, String linkId) {
        return persistedSnapshots.flatMap(persistedSnapshot -> runtimeProviderRegistry
                .resolveRequired(persistedSnapshot.runtimeProviderId())
                .getLinks(persistedSnapshot.definition(), sourceTypeId, sourceId, linkId, ObjectSetQuery.defaults())
                .map(result -> result.items().stream()
                        .map(item -> {
                            Map<String, Object> values = new LinkedHashMap<>();
                            values.put("id", item.id());
                            values.putAll(item.properties());
                            return values;
                        })
                        .toList()));
    }

    private Mono<OntologyMetadataSnapshot> requiredSnapshot(Snapshot snapshot) {
        if (snapshot == null
                || snapshot.id() == null
                || snapshot.id().isBlank()
                || snapshot.digest() == null
                || snapshot.digest().isBlank()) {
            return Mono.error(new IllegalArgumentException("Pinned ontology snapshot is required"));
        }
        return snapshotService.getRequiredSnapshot(snapshot.id(), snapshot.digest());
    }

    private Mono<OntologyMetadataSnapshot> requiredSnapshot(
            Snapshot snapshot, String workspaceId, String datasourceId) {
        if (snapshot == null) return Mono.error(new IllegalArgumentException("Pinned ontology snapshot is required"));
        return requiredSnapshot(snapshot.id(), snapshot.digest(), workspaceId, datasourceId);
    }

    private Mono<OntologyMetadataSnapshot> requiredSnapshot(
            String snapshotId, String digest, String workspaceId, String datasourceId) {
        if (isBlank(snapshotId) || isBlank(digest) || isBlank(workspaceId) || isBlank(datasourceId)) {
            return Mono.error(
                    new IllegalArgumentException("Pinned ontology snapshot, workspace and datasource are required"));
        }
        if (datasourceService == null) {
            return Mono.error(new IllegalStateException("Datasource ownership verification is not configured"));
        }
        return datasourceService
                .findById(datasourceId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Ontology datasource was not found")))
                .filter(datasource -> workspaceId.equals(datasource.getWorkspaceId()))
                .switchIfEmpty(Mono.error(
                        new IllegalArgumentException("Ontology datasource is unavailable for this workspace")))
                .then(snapshotService.getRequiredSnapshot(snapshotId, digest, workspaceId));
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
