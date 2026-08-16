package com.celanworksmith.ontology.datasource;

import com.celanworksmith.runtime.dto.FunctionExecutionRequest;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.Map;

public class OntologySnapshotRuntimeGateway implements OntologyRuntimeGateway {
    private final OntologySnapshotService snapshotService;
    private final RuntimeProviderRegistry runtimeProviderRegistry;

    public OntologySnapshotRuntimeGateway(
            OntologySnapshotService snapshotService, RuntimeProviderRegistry runtimeProviderRegistry) {
        this.snapshotService = snapshotService;
        this.runtimeProviderRegistry = runtimeProviderRegistry;
    }

    @Override
    public Mono<Snapshot> getRequiredSnapshot(String snapshotId, String digest) {
        return snapshotService.getRequiredSnapshot(snapshotId, digest).map(OntologyRuntimeSnapshotProjection::project);
    }

    public Mono<Snapshot> fromLoadedSnapshot(OntologyMetadataSnapshot snapshot) {
        return Mono.just(OntologyRuntimeSnapshotProjection.project(snapshot));
    }

    @Override
    public Mono<ObjectQueryResult> queryObjects(
            String providerId, Snapshot snapshot, String objectTypeId, ObjectQuery query) {
        if (snapshot == null
                || snapshot.id() == null
                || snapshot.id().isBlank()
                || snapshot.digest() == null
                || snapshot.digest().isBlank()) {
            return Mono.error(new IllegalArgumentException("Pinned ontology snapshot is required"));
        }
        ObjectSetQuery providerQuery = new ObjectSetQuery(
                query.filter(), query.sortBy(), query.sortDirection(), query.offset(), query.limit());
        return snapshotService
                .getRequiredSnapshot(snapshot.id(), snapshot.digest())
                .flatMap(persistedSnapshot -> runtimeProviderRegistry
                        .resolveRequired(providerId)
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
            String providerId, Snapshot snapshot, String functionId, Map<String, Object> parameters) {
        return requiredSnapshot(snapshot).flatMap(persistedSnapshot -> runtimeProviderRegistry
                .resolveRequired(providerId)
                .executeFunction(persistedSnapshot.definition(), functionId, new FunctionExecutionRequest(parameters)));
    }

    @Override
    public Mono<java.util.List<Map<String, Object>>> resolveLink(
            String providerId, Snapshot snapshot, String sourceTypeId, String sourceId, String linkId) {
        return requiredSnapshot(snapshot).flatMap(persistedSnapshot -> runtimeProviderRegistry
                .resolveRequired(providerId)
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
}
