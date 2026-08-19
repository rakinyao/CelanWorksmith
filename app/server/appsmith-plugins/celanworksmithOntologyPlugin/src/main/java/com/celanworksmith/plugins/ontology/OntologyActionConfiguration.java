package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.ActionConfiguration;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

public record OntologyActionConfiguration(Operation operation, Map<String, Object> definition) {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static final Set<String> PROTECTED_CONTEXT_KEYS = Set.of(
            "projectId",
            "projectVersion",
            "metadataSnapshotId",
            "metadataDigest",
            "runtimeProviderId",
            "callerContext",
            "workspaceId",
            "datasourceId",
            "idempotencyKey",
            "context");
    private static final Set<String> OBJECT_QUERY_RESULT_MODES = Set.of("ROWS", "TOTAL");

    public enum Operation {
        OBJECT_QUERY,
        FUNCTION_QUERY,
        ACTION_QUERY,
        LINK_QUERY
    }

    public static OntologyActionConfiguration from(ActionConfiguration actionConfiguration) {
        if (actionConfiguration == null || actionConfiguration.getFormData() == null) {
            throw new IllegalArgumentException("Ontology action configuration is required");
        }

        Map<String, Object> formData = unwrapUqiValues(actionConfiguration.getFormData());
        for (String protectedKey : PROTECTED_CONTEXT_KEYS) {
            if (formData.containsKey(protectedKey)) {
                throw new IllegalArgumentException("Action configuration cannot override: " + protectedKey);
            }
        }

        Object operationValue = formData.get("operation");
        if (!(operationValue instanceof String operationName)) {
            throw new IllegalArgumentException("Ontology operation is required");
        }

        Operation operation;
        try {
            operation = Operation.valueOf(operationName);
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Unsupported ontology operation: " + operationName, exception);
        }

        boolean builderMode = false;
        boolean advancedMode = false;
        if (operation == Operation.OBJECT_QUERY) {
            Object queryModeValue = formData.get("queryMode");
            if (queryModeValue != null) {
                if (!(queryModeValue instanceof String queryMode)) {
                    throw new IllegalArgumentException("Ontology query mode must be BUILDER or ADVANCED");
                }
                builderMode = "BUILDER".equals(queryMode);
                advancedMode = "ADVANCED".equals(queryMode);
                if (!builderMode && !advancedMode) {
                    throw new IllegalArgumentException("Unsupported ontology query mode: " + queryMode);
                }
            }
        }

        Object definitionValue = builderMode ? Map.of() : parseDefinition(formData.get("definition"));
        if (!(definitionValue instanceof Map<?, ?> rawDefinitionMap)) {
            throw new IllegalArgumentException("Ontology operation definition is required");
        }

        Map<String, Object> definition = new java.util.LinkedHashMap<>();
        rawDefinitionMap.forEach((key, value) -> definition.put(String.valueOf(key), value));
        if (builderMode) {
            mergeBuilderFields(formData, definition);
        } else if (operation != Operation.OBJECT_QUERY || !advancedMode) {
            mergeSelectorFields(formData, definition);
            mergeProjection(formData, definition);
        }
        validateObjectQueryResultMode(operation, definition);
        for (String protectedKey : PROTECTED_CONTEXT_KEYS) {
            if (definition.containsKey(protectedKey)) {
                throw new IllegalArgumentException("Action configuration cannot override: " + protectedKey);
            }
        }
        validateRequiredIdentifier(operation, definition);
        return new OntologyActionConfiguration(operation, Map.copyOf(definition));
    }

    private static Map<String, Object> unwrapUqiValues(Map<String, Object> values) {
        Map<String, Object> unwrapped = new java.util.LinkedHashMap<>();
        values.forEach((key, value) -> {
            Object unwrappedValue = unwrapUqiValue(value);
            if (unwrappedValue != null) {
                unwrapped.put(key, unwrappedValue);
            }
        });
        return Map.copyOf(unwrapped);
    }

    private static Object unwrapUqiValue(Object value) {
        if (value instanceof Map<?, ?> map && map.containsKey("data")) {
            return map.get("data");
        }
        return value;
    }

    private static Object parseDefinition(Object definition) {
        if (!(definition instanceof String json)) {
            return definition;
        }
        try {
            return OBJECT_MAPPER.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception exception) {
            throw new IllegalArgumentException("Ontology operation definition must be a JSON object", exception);
        }
    }

    private static void mergeSelectorFields(Map<String, Object> formData, Map<String, Object> definition) {
        for (String field :
                Set.of("objectTypeId", "objectId", "functionId", "actionId", "linkId", "sourceTypeId", "sourceId")) {
            Object value = formData.get(field);
            if (value instanceof String identifier && !identifier.isBlank()) {
                definition.put(field, identifier);
            }
        }
    }

    private static void mergeProjection(Map<String, Object> formData, Map<String, Object> definition) {
        Object value = formData.get("projection");
        if (value == null) {
            return;
        }
        if (!(value instanceof List<?> rawProjection)) {
            throw new IllegalArgumentException("Ontology projection selector must be a list");
        }

        List<String> projection = new ArrayList<>(rawProjection.size());
        for (Object propertyId : rawProjection) {
            if (!(propertyId instanceof String)) {
                throw new IllegalArgumentException("Ontology projection selector entries must be strings");
            }
            projection.add((String) propertyId);
        }
        definition.put("projection", List.copyOf(projection));
    }

    private static void mergeBuilderFields(Map<String, Object> formData, Map<String, Object> definition) {
        mergeSelectorFields(formData, definition);
        mergeProjection(formData, definition);
        copyOptionalFilterField(formData, definition);
        copyStructuredField(formData, definition, "sort", List.class, "Ontology sort selector must be a list");
        copyStructuredField(formData, definition, "page", Map.class, "Ontology page selector must be an object");
        copyResultMode(formData, definition);
    }

    private static void copyResultMode(Map<String, Object> formData, Map<String, Object> definition) {
        Object value = formData.get("resultMode");
        if (value == null) {
            return;
        }
        if (!(value instanceof String resultMode) || !OBJECT_QUERY_RESULT_MODES.contains(resultMode)) {
            throw new IllegalArgumentException("Ontology object query result mode must be ROWS or TOTAL");
        }
        definition.put("resultMode", resultMode);
    }

    private static void validateObjectQueryResultMode(Operation operation, Map<String, Object> definition) {
        if (operation != Operation.OBJECT_QUERY || !definition.containsKey("resultMode")) {
            return;
        }
        Object resultMode = definition.get("resultMode");
        if (!(resultMode instanceof String value) || !OBJECT_QUERY_RESULT_MODES.contains(value)) {
            throw new IllegalArgumentException("Ontology object query result mode must be ROWS or TOTAL");
        }
    }

    String resultMode() {
        return (String) definition.getOrDefault("resultMode", "ROWS");
    }

    private static void copyOptionalFilterField(Map<String, Object> formData, Map<String, Object> definition) {
        Object value = formData.get("filter");
        if (value == null
                || (value instanceof List<?> emptyList && emptyList.isEmpty())
                || (value instanceof Map<?, ?> emptyMap && emptyMap.isEmpty())) {
            return;
        }
        if (!(value instanceof Map<?, ?>)) {
            throw new IllegalArgumentException("Ontology filter selector must be an object");
        }
        definition.put("filter", value);
    }

    private static void copyStructuredField(
            Map<String, Object> formData,
            Map<String, Object> definition,
            String field,
            Class<?> expectedType,
            String errorMessage) {
        Object value = formData.get(field);
        if (value == null) {
            return;
        }
        if (!expectedType.isInstance(value)) {
            throw new IllegalArgumentException(errorMessage);
        }
        definition.put(field, value);
    }

    private static void validateRequiredIdentifier(Operation operation, Map<String, Object> definition) {
        String requiredKey =
                switch (operation) {
                    case OBJECT_QUERY -> "objectTypeId";
                    case FUNCTION_QUERY -> "functionId";
                    case ACTION_QUERY -> "actionId";
                    case LINK_QUERY -> "linkId";
                };
        Object value = definition.get(requiredKey);
        if (!(value instanceof String identifier) || identifier.isBlank()) {
            throw new IllegalArgumentException("Ontology operation definition requires: " + requiredKey);
        }
    }
}
