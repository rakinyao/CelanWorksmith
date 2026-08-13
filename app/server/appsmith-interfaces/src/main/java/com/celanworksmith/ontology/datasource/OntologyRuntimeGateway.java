package com.celanworksmith.ontology.datasource;

import com.fasterxml.jackson.databind.JsonNode;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

public interface OntologyRuntimeGateway {
    record Snapshot(String id, String digest, List<ObjectTypeMetadata> objectTypes) {
        public Snapshot {
            objectTypes = List.copyOf(objectTypes);
        }
    }

    record ObjectTypeMetadata(String id, List<PropertyMetadata> properties) {
        public ObjectTypeMetadata {
            properties = List.copyOf(properties);
        }
    }

    record PropertyMetadata(String id, String dataType, boolean hidden) {}

    record ObjectQuery(
            List<String> projection, JsonNode filter, String sortBy, String sortDirection, int offset, int limit) {
        public ObjectQuery {
            projection = List.copyOf(projection);
        }
    }

    record ObjectQueryResult(List<Map<String, Object>> items, int offset, int limit, long total) {
        public ObjectQueryResult {
            items = List.copyOf(items);
        }
    }

    Mono<Snapshot> getRequiredSnapshot(String snapshotId, String digest);

    Mono<ObjectQueryResult> queryObjects(String providerId, Snapshot snapshot, String objectTypeId, ObjectQuery query);
}
