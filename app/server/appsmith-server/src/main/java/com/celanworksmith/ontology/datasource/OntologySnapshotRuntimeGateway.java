package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
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
        return snapshotService
                .getRequiredSnapshot(snapshotId, digest)
                .map(snapshot -> new Snapshot(
                        snapshot.id(),
                        snapshot.metadataDigest(),
                        snapshot.definition().objectTypes().stream()
                                .map(this::objectTypeMetadata)
                                .toList(),
                        snapshot.definition().functions().stream()
                                .map(function -> new FunctionMetadata(
                                        function.id(),
                                        function.returnType(),
                                        function.parameters().stream()
                                                .map(this::propertyMetadata)
                                                .toList()))
                                .toList(),
                        snapshot.definition().linkTypes().stream()
                                .map(link -> new LinkMetadata(link.id(), link.sourceTypeId(), link.targetTypeId()))
                                .toList(),
                        snapshot.definition().actions().stream()
                                .map(action -> new ActionMetadata(
                                        action.id(),
                                        action.objectTypeId(),
                                        action.parameters().stream()
                                                .map(this::propertyMetadata)
                                                .toList()))
                                .toList()));
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

    private ObjectTypeMetadata objectTypeMetadata(ObjectTypeDTO objectType) {
        return new ObjectTypeMetadata(
                objectType.id(),
                objectType.properties().stream().map(this::propertyMetadata).toList());
    }

    private PropertyMetadata propertyMetadata(PropertyDTO property) {
        return new PropertyMetadata(
                property.id(),
                property.dataType().toLowerCase(java.util.Locale.ROOT),
                property.hidden(),
                property.required());
    }
}
