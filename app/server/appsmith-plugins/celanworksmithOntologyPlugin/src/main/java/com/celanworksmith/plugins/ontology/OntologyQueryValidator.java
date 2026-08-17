package com.celanworksmith.plugins.ontology;

import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.ActionMetadata;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.FunctionMetadata;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.LinkMetadata;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.ObjectQuery;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.ObjectTypeMetadata;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.PropertyMetadata;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.Snapshot;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class OntologyQueryValidator {
    private static final int DEFAULT_OFFSET = 0;
    private static final int DEFAULT_LIMIT = 50;
    private static final int MAX_LIMIT = 1_000;

    private final ObjectMapper objectMapper;

    OntologyQueryValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    ObjectQuery validateObjectQuery(OntologyActionConfiguration configuration, Snapshot snapshot) {
        if (configuration.operation() != OntologyActionConfiguration.Operation.OBJECT_QUERY) {
            throw new IllegalArgumentException("Ontology executor only supports OBJECT_QUERY");
        }

        Map<String, Object> definition = configuration.definition();
        String objectTypeId = requiredStableId(definition, "objectTypeId");
        ObjectTypeMetadata objectType = objectType(snapshot, objectTypeId);
        Map<String, PropertyMetadata> properties = propertiesById(objectType);
        List<String> projection = projection(definition, properties);
        JsonNode filter = filter(definition, objectTypeId, properties);
        Sort sort = sort(definition, properties);
        Page page = page(definition);
        return new ObjectQuery(projection, filter, sort.propertyId(), sort.direction(), page.offset(), page.limit());
    }

    Map<String, Object> validateFunctionParameters(OntologyActionConfiguration configuration, Snapshot snapshot) {
        String functionId = requiredStableId(configuration.definition(), "functionId");
        FunctionMetadata function = snapshot.functions().stream()
                .filter(candidate -> functionId.equals(candidate.id()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown ontology function: " + functionId));
        return parameters(configuration.definition(), function.parameters(), "function");
    }

    Map<String, Object> validateActionParameters(OntologyActionConfiguration configuration, Snapshot snapshot) {
        String actionId = requiredStableId(configuration.definition(), "actionId");
        ActionMetadata action = snapshot.actions().stream()
                .filter(candidate -> actionId.equals(candidate.id()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown ontology action: " + actionId));
        String objectTypeId = requiredStableId(configuration.definition(), "objectTypeId");
        if (!objectTypeId.equals(action.objectTypeId())) {
            throw new IllegalArgumentException("Ontology action does not apply to object type: " + objectTypeId);
        }
        requiredStableId(configuration.definition(), "objectId");
        return parameters(configuration.definition(), action.parameters(), "action");
    }

    private Map<String, Object> parameters(
            Map<String, Object> definition, List<PropertyMetadata> metadata, String operationName) {
        Object supplied = definition.getOrDefault("parameters", Map.of());
        if (!(supplied instanceof Map<?, ?> rawParameters)) {
            throw new IllegalArgumentException("Ontology " + operationName + " parameters must be an object");
        }
        List<PropertyMetadata> visibleParameters =
                metadata.stream().filter(parameter -> !parameter.hidden()).toList();
        Map<String, Object> parameters = new LinkedHashMap<>();
        for (Map.Entry<?, ?> entry : rawParameters.entrySet()) {
            if (!(entry.getKey() instanceof String parameterId)) {
                throw new IllegalArgumentException("Ontology " + operationName + " parameter IDs must be strings");
            }
            PropertyMetadata parameter = visibleParameters.stream()
                    .filter(candidate -> parameterId.equals(candidate.id()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Unknown ontology " + operationName + " parameter: " + parameterId));
            JsonNode value = objectMapper.valueToTree(entry.getValue());
            if (!matchesType(value, parameter.dataType())) {
                throw new IllegalArgumentException("Ontology " + operationName + " parameter " + parameterId
                        + " must be an " + parameter.dataType().toLowerCase(java.util.Locale.ROOT));
            }
            parameters.put(parameterId, entry.getValue());
        }
        for (PropertyMetadata parameter : visibleParameters) {
            if (parameter.required() && !parameters.containsKey(parameter.id())) {
                throw new IllegalArgumentException(
                        "Ontology " + operationName + " parameter is required: " + parameter.id());
            }
        }
        return Map.copyOf(parameters);
    }

    void validateLink(OntologyActionConfiguration configuration, Snapshot snapshot) {
        String linkId = requiredStableId(configuration.definition(), "linkId");
        String sourceTypeId = requiredStableId(configuration.definition(), "sourceTypeId");
        requiredStableId(configuration.definition(), "sourceId");
        LinkMetadata link = snapshot.links().stream()
                .filter(candidate -> linkId.equals(candidate.id()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown ontology link: " + linkId));
        if (!sourceTypeId.equals(link.sourceTypeId())) {
            throw new IllegalArgumentException("Ontology link does not apply to source type: " + sourceTypeId);
        }
    }

    private ObjectTypeMetadata objectType(Snapshot snapshot, String objectTypeId) {
        return snapshot.objectTypes().stream()
                .filter(candidate -> objectTypeId.equals(candidate.id()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown ontology object type: " + objectTypeId));
    }

    private Map<String, PropertyMetadata> propertiesById(ObjectTypeMetadata objectType) {
        Map<String, PropertyMetadata> properties = new LinkedHashMap<>();
        for (PropertyMetadata property : objectType.properties()) {
            if (property == null || isBlank(property.id())) {
                throw new IllegalArgumentException("Ontology snapshot has invalid property metadata");
            }
            if (!property.hidden() && properties.putIfAbsent(property.id(), property) != null) {
                throw new IllegalArgumentException("Ontology snapshot has invalid property metadata");
            }
        }
        return java.util.Collections.unmodifiableMap(properties);
    }

    private List<String> projection(Map<String, Object> definition, Map<String, PropertyMetadata> properties) {
        Object value = definition.get("projection");
        if (value == null) {
            return properties.values().stream()
                    .filter(property -> !property.hidden())
                    .map(PropertyMetadata::id)
                    .toList();
        }
        if (!(value instanceof List<?> rawProjection) || rawProjection.isEmpty()) {
            throw new IllegalArgumentException("Ontology projection must be a non-empty list of stable property IDs");
        }
        return rawProjection.stream()
                .map(propertyId -> stablePropertyId(propertyId, properties))
                .toList();
    }

    private JsonNode filter(
            Map<String, Object> definition, String objectTypeId, Map<String, PropertyMetadata> properties) {
        Object value = definition.get("filter");
        if (value == null) {
            return null;
        }
        JsonNode filter = objectMapper.valueToTree(value);
        if (!filter.isObject() || !filter.path("conditions").isArray()) {
            throw new IllegalArgumentException("Ontology filter must contain a conditions array");
        }
        List<JsonNode> conditions = new java.util.ArrayList<>();
        for (JsonNode condition : filter.path("conditions")) {
            conditions.add(normalizeCondition(condition, properties));
        }
        Map<String, Object> normalized = new LinkedHashMap<>();
        normalized.put("typeId", objectTypeId);
        normalized.put("version", 1);
        normalized.put("conditions", conditions);
        return objectMapper.valueToTree(normalized);
    }

    private JsonNode normalizeCondition(JsonNode condition, Map<String, PropertyMetadata> properties) {
        if (!condition.isObject()) {
            throw new IllegalArgumentException("Ontology filter conditions must be objects");
        }
        PropertyMetadata property = properties.get(condition.path("propertyId").asText());
        if (property == null) {
            throw new IllegalArgumentException("Unknown ontology property in filter");
        }
        String operator = condition.path("operator").asText();
        if (OntologyQueryOperatorCatalog.operatorsFor(property.dataType()).stream()
                .noneMatch(candidate -> candidate.value().equals(operator))) {
            throw new IllegalArgumentException("Invalid ontology filter operator for property: " + property.id());
        }
        if (!"isEmpty".equals(operator)) {
            JsonNode filterValue = normalizeValue(condition.get("value"), property.dataType());
            if (filterValue == null || !matchesType(filterValue, property.dataType())) {
                throw new IllegalArgumentException("Invalid ontology filter value for property: " + property.id());
            }
            ObjectNode normalizedCondition = condition.deepCopy();
            normalizedCondition.set("value", filterValue);
            return normalizedCondition;
        }
        return condition;
    }

    private Sort sort(Map<String, Object> definition, Map<String, PropertyMetadata> properties) {
        Object value = definition.get("sort");
        if (value == null) {
            return new Sort(null, "asc");
        }
        if (!(value instanceof List<?> rawSort)
                || rawSort.size() != 1
                || !(rawSort.getFirst() instanceof Map<?, ?> entry)) {
            throw new IllegalArgumentException("Ontology sort must contain exactly one property and direction");
        }
        Object propertyId = entry.get("propertyId");
        Object direction = entry.get("direction");
        String stablePropertyId = stablePropertyId(propertyId, properties);
        if (!(direction instanceof String rawDirection)
                || !("ASC".equals(rawDirection) || "DESC".equals(rawDirection))) {
            throw new IllegalArgumentException("Ontology sort direction must be ASC or DESC");
        }
        return new Sort(stablePropertyId, rawDirection.toLowerCase(java.util.Locale.ROOT));
    }

    private Page page(Map<String, Object> definition) {
        Object value = definition.get("page");
        if (value == null) {
            return new Page(DEFAULT_OFFSET, DEFAULT_LIMIT);
        }
        if (!(value instanceof Map<?, ?> page)) {
            throw new IllegalArgumentException("Ontology page must contain integer offset and limit");
        }
        int offset = nonNegativeInteger(page.get("offset"), "offset");
        int limit = positiveInteger(page.get("limit"), "limit");
        if (limit > MAX_LIMIT) {
            throw new IllegalArgumentException("Ontology page limit must not exceed " + MAX_LIMIT);
        }
        return new Page(offset, limit);
    }

    private int nonNegativeInteger(Object value, String field) {
        JsonNode normalized = normalizeValue(objectMapper.valueToTree(value), "integer");
        if (!normalized.isIntegralNumber() || !normalized.canConvertToInt() || normalized.intValue() < 0) {
            throw new IllegalArgumentException("Ontology page " + field + " must be a non-negative integer");
        }
        return normalized.intValue();
    }

    private int positiveInteger(Object value, String field) {
        JsonNode normalized = normalizeValue(objectMapper.valueToTree(value), "integer");
        if (!normalized.isIntegralNumber() || !normalized.canConvertToInt() || normalized.intValue() <= 0) {
            throw new IllegalArgumentException("Ontology page " + field + " must be a positive integer");
        }
        return normalized.intValue();
    }

    private String stablePropertyId(Object value, Map<String, PropertyMetadata> properties) {
        if (!(value instanceof String propertyId) || isBlank(propertyId) || !properties.containsKey(propertyId)) {
            throw new IllegalArgumentException("Unknown ontology property");
        }
        return propertyId;
    }

    private String requiredStableId(Map<String, Object> definition, String field) {
        Object value = definition.get(field);
        if (!(value instanceof String identifier) || isBlank(identifier)) {
            throw new IllegalArgumentException("Ontology definition requires stable ID: " + field);
        }
        return identifier;
    }

    private boolean matchesType(JsonNode value, String dataType) {
        return switch (dataType) {
            case "integer" -> value.isIntegralNumber();
            case "number", "decimal" -> value.isNumber();
            case "boolean" -> value.isBoolean();
            case "date", "datetime", "string" -> value.isTextual();
            default -> value.isTextual() || value.isNumber() || value.isBoolean();
        };
    }

    private JsonNode normalizeValue(JsonNode value, String dataType) {
        if (value == null || !value.isTextual()) {
            return value;
        }

        String literal = value.textValue();
        try {
            return switch (dataType) {
                case "integer" -> objectMapper.getNodeFactory().numberNode(new java.math.BigInteger(literal));
                case "number", "decimal" -> objectMapper.getNodeFactory().numberNode(new java.math.BigDecimal(literal));
                case "boolean" ->
                    "true".equals(literal) || "false".equals(literal)
                            ? objectMapper.getNodeFactory().booleanNode(Boolean.parseBoolean(literal))
                            : value;
                default -> value;
            };
        } catch (NumberFormatException exception) {
            return value;
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record Sort(String propertyId, String direction) {}

    private record Page(int offset, int limit) {}
}
