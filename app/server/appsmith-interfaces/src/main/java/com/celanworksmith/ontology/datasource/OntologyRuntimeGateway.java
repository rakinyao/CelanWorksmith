package com.celanworksmith.ontology.datasource;

import com.fasterxml.jackson.databind.JsonNode;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.Objects;

public interface OntologyRuntimeGateway {
    static <T> List<T> immutableList(List<T> values) {
        return values == null
                ? List.of()
                : values.stream().filter(Objects::nonNull).toList();
    }

    record Snapshot(
            String id,
            String digest,
            List<ObjectTypeMetadata> objectTypes,
            List<FunctionMetadata> functions,
            List<LinkMetadata> links,
            List<ActionMetadata> actions) {
        public Snapshot {
            objectTypes = immutableList(objectTypes);
            functions = immutableList(functions);
            links = immutableList(links);
            actions = immutableList(actions);
        }

        public Snapshot(String id, String digest, List<ObjectTypeMetadata> objectTypes) {
            this(id, digest, objectTypes, List.of(), List.of(), List.of());
        }
    }

    record ObjectTypeMetadata(String id, String displayName, String primaryKey, List<PropertyMetadata> properties) {
        public ObjectTypeMetadata {
            properties = immutableList(properties);
        }

        public ObjectTypeMetadata(String id, String displayName, List<PropertyMetadata> properties) {
            this(id, displayName, null, properties);
        }

        public ObjectTypeMetadata(String id, List<PropertyMetadata> properties) {
            this(id, id, null, properties);
        }
    }

    record PropertyMetadata(
            String id,
            String displayName,
            String dataType,
            boolean hidden,
            boolean required,
            boolean readOnly,
            boolean derived,
            List<String> enumValues,
            String referenceTypeId) {
        public PropertyMetadata {
            enumValues = enumValues == null ? List.of() : List.copyOf(enumValues);
        }

        public PropertyMetadata(String id, String dataType, boolean hidden) {
            this(id, id, dataType, hidden, false, false, false, List.of(), null);
        }

        public PropertyMetadata(String id, String dataType, boolean hidden, boolean required) {
            this(id, id, dataType, hidden, required, false, false, List.of(), null);
        }
    }

    record FunctionMetadata(String id, String displayName, String returnType, List<PropertyMetadata> parameters) {
        public FunctionMetadata {
            parameters = immutableList(parameters);
        }

        public FunctionMetadata(String id, String returnType, List<PropertyMetadata> parameters) {
            this(id, id, returnType, parameters);
        }
    }

    record LinkMetadata(String id, String displayName, String sourceTypeId, String targetTypeId, String cardinality) {
        public LinkMetadata(String id, String sourceTypeId, String targetTypeId) {
            this(id, id, sourceTypeId, targetTypeId, null);
        }
    }

    record ActionMetadata(String id, String displayName, String objectTypeId, List<PropertyMetadata> parameters) {
        public ActionMetadata {
            parameters = immutableList(parameters);
        }

        public ActionMetadata(String id, String objectTypeId, List<PropertyMetadata> parameters) {
            this(id, id, objectTypeId, parameters);
        }
    }

    record ObjectQuery(
            List<String> projection, JsonNode filter, String sortBy, String sortDirection, int offset, int limit) {
        public ObjectQuery {
            projection = immutableList(projection);
        }
    }

    record ObjectQueryResult(List<Map<String, Object>> items, int offset, int limit, long total) {
        public ObjectQueryResult {
            items = immutableList(items);
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
