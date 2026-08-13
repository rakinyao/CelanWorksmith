package com.celanworksmith.ontology.datasource;

import com.fasterxml.jackson.databind.JsonNode;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

public interface OntologyRuntimeGateway {
    record Snapshot(
            String id,
            String digest,
            List<ObjectTypeMetadata> objectTypes,
            List<FunctionMetadata> functions,
            List<LinkMetadata> links,
            List<ActionMetadata> actions) {
        public Snapshot {
            objectTypes = List.copyOf(objectTypes);
            functions = List.copyOf(functions);
            links = List.copyOf(links);
            actions = List.copyOf(actions);
        }

        public Snapshot(String id, String digest, List<ObjectTypeMetadata> objectTypes) {
            this(id, digest, objectTypes, List.of(), List.of(), List.of());
        }
    }

    record ObjectTypeMetadata(String id, List<PropertyMetadata> properties) {
        public ObjectTypeMetadata {
            properties = List.copyOf(properties);
        }
    }

    record PropertyMetadata(String id, String dataType, boolean hidden, boolean required) {
        public PropertyMetadata(String id, String dataType, boolean hidden) {
            this(id, dataType, hidden, false);
        }
    }

    record FunctionMetadata(String id, String returnType, List<PropertyMetadata> parameters) {
        public FunctionMetadata {
            parameters = List.copyOf(parameters);
        }
    }

    record LinkMetadata(String id, String sourceTypeId, String targetTypeId) {}

    record ActionMetadata(String id, String objectTypeId, List<PropertyMetadata> parameters) {
        public ActionMetadata {
            parameters = List.copyOf(parameters);
        }
    }

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

    default Mono<Object> executeFunction(
            String providerId, Snapshot snapshot, String functionId, Map<String, Object> parameters) {
        return Mono.error(new UnsupportedOperationException("Ontology function execution is not configured"));
    }

    default Mono<List<Map<String, Object>>> resolveLink(
            String providerId, Snapshot snapshot, String sourceTypeId, String sourceId, String linkId) {
        return Mono.error(new UnsupportedOperationException("Ontology link execution is not configured"));
    }
}
