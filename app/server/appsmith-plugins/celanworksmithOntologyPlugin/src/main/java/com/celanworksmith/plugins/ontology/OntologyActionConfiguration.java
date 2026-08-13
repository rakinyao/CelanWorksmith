package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.ActionConfiguration;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

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

        Object definitionValue = parseDefinition(formData.get("definition"));
        if (!(definitionValue instanceof Map<?, ?> rawDefinition)) {
            throw new IllegalArgumentException("Ontology operation definition is required");
        }

        Map<String, Object> definition = rawDefinition.entrySet().stream()
                .collect(java.util.stream.Collectors.toUnmodifiableMap(
                        entry -> String.valueOf(entry.getKey()), Map.Entry::getValue));
        for (String protectedKey : PROTECTED_CONTEXT_KEYS) {
            if (definition.containsKey(protectedKey)) {
                throw new IllegalArgumentException("Action configuration cannot override: " + protectedKey);
            }
        }
        validateRequiredIdentifier(operation, definition);
        return new OntologyActionConfiguration(operation, definition);
    }

    private static Map<String, Object> unwrapUqiValues(Map<String, Object> values) {
        return values.entrySet().stream()
                .collect(java.util.stream.Collectors.toUnmodifiableMap(
                        Map.Entry::getKey, entry -> unwrapUqiValue(entry.getValue())));
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
