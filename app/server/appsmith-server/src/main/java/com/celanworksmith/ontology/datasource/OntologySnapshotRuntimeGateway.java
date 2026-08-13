package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
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

    private ObjectTypeMetadata objectTypeMetadata(ObjectTypeDTO objectType) {
        return new ObjectTypeMetadata(
                objectType.id(),
                objectType.properties().stream().map(this::propertyMetadata).toList());
    }

    private PropertyMetadata propertyMetadata(PropertyDTO property) {
        return new PropertyMetadata(
                property.id(), property.dataType().toLowerCase(java.util.Locale.ROOT), property.hidden());
    }
}
