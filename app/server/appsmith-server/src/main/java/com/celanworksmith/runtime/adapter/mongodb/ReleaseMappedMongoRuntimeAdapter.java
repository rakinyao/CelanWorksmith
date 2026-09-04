package com.celanworksmith.runtime.adapter.mongodb;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.runtime.dto.ObjectInstanceDTO;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.celanworksmith.runtime.dto.ObjectSetResult;
import com.celanworksmith.runtime.port.RuntimeProvider;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.bson.Document;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

public final class ReleaseMappedMongoRuntimeAdapter {
    private static final int MAX_LIMIT = 5_000;

    private final ReactiveMongoTemplate template;

    public ReleaseMappedMongoRuntimeAdapter(ReactiveMongoTemplate template) {
        this.template = template;
    }

    public static boolean supports(OntologyProjectDefinition definition) {
        return definition != null
                && !definition.runtimeMappings().objectMappings().isEmpty();
    }

    public RuntimeProvider.RuntimeMetadataCapabilities metadataCapabilities(OntologyProjectDefinition definition) {
        Map<String, Map<String, String>> capabilities = new LinkedHashMap<>();
        definition.objectTypes().forEach(type -> {
            Map<String, String> properties = new LinkedHashMap<>();
            type.properties().forEach(property -> properties.put(property.id(), property.dataType()));
            capabilities.put(type.id(), properties);
        });
        return new RuntimeProvider.RuntimeMetadataCapabilities(capabilities);
    }

    public Mono<ObjectSetResult> queryObjects(
            OntologyProjectDefinition definition, String typeId, ObjectSetQuery supplied) {
        ObjectTypeDTO type = resolveType(definition, typeId);
        ObjectSetQuery query = supplied == null ? ObjectSetQuery.defaults() : supplied;
        validateQuery(type, query);
        Query mongoQuery = buildQuery(definition, type, query);
        String collection = collection(type);
        Mono<List<ObjectInstanceDTO>> items = template.find(mongoQuery, Document.class, collection)
                .map(document -> toDto(definition, type, document))
                .collectList();
        Mono<Long> total = template.count(buildCountQuery(definition, type, query), collection);
        return Mono.zip(items, total)
                .map(tuple -> new ObjectSetResult(
                        type.id(),
                        tuple.getT1(),
                        tuple.getT2() < query.offset() ? tuple.getT2().intValue() : query.offset(),
                        query.limit(),
                        tuple.getT2()));
    }

    public Mono<ObjectInstanceDTO> getObject(OntologyProjectDefinition definition, String typeId, String instanceId) {
        ObjectTypeDTO type = resolveType(definition, typeId);
        Query query =
                Query.query(Criteria.where(primaryKeyColumn(definition, type)).is(primaryKeyValue(type, instanceId)));
        return template.findOne(query, Document.class, collection(type))
                .switchIfEmpty(Mono.error(new CelanWorksmithException(
                        CelanWorksmithErrorCode.OBJECT_NOT_FOUND, "Unknown object: " + typeId + "/" + instanceId)))
                .map(document -> toDto(definition, type, document));
    }

    public Mono<ObjectSetResult> getLinks(
            OntologyProjectDefinition definition,
            String typeId,
            String instanceId,
            String linkTypeId,
            ObjectSetQuery query) {
        ObjectTypeDTO sourceType = resolveType(definition, typeId);
        LinkTypeDTO link = definition.linkTypes().stream()
                .filter(candidate -> candidate.id().equals(linkTypeId)
                        && candidate.sourceTypeId().equals(typeId))
                .findFirst()
                .orElseThrow(() -> new CelanWorksmithException(
                        CelanWorksmithErrorCode.LINK_TYPE_NOT_FOUND,
                        "Link type is not valid for source type: " + typeId + "/" + linkTypeId));
        List<LinkTypeDTO.FieldMapping> mappings = linkMappings(definition, link);
        Query sourceQuery = Query.query(
                Criteria.where(primaryKeyColumn(definition, sourceType)).is(primaryKeyValue(sourceType, instanceId)));
        return template.findOne(sourceQuery, Document.class, collection(sourceType))
                .switchIfEmpty(Mono.error(new CelanWorksmithException(
                        CelanWorksmithErrorCode.OBJECT_NOT_FOUND, "Unknown object: " + typeId + "/" + instanceId)))
                .flatMap(source -> {
                    ObjectTypeDTO targetType = resolveType(definition, link.targetTypeId());
                    Map<String, Object> relationshipValues = new LinkedHashMap<>();
                    for (LinkTypeDTO.FieldMapping mapping : mappings) {
                        Object sourceValue = source.get(column(definition, sourceType, mapping.sourceField()));
                        if (sourceValue == null) {
                            return Mono.error(new CelanWorksmithException(
                                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                                    "Release link source field is unavailable: " + link.id() + "."
                                            + mapping.sourceField()));
                        }
                        relationshipValues.put(mapping.targetField(), sourceValue);
                    }
                    ObjectSetQuery supplied = query == null ? ObjectSetQuery.defaults() : query;
                    return queryObjects(
                            definition,
                            targetType.id(),
                            new ObjectSetQuery(
                                    mergeRelationshipFilter(targetType, supplied.filter(), relationshipValues),
                                    supplied.sortBy(),
                                    supplied.sortDirection(),
                                    supplied.offset(),
                                    supplied.limit(),
                                    supplied.searchText()));
                });
    }

    private Query buildCountQuery(OntologyProjectDefinition definition, ObjectTypeDTO type, ObjectSetQuery query) {
        Criteria filterCriteria = criteria(definition, type, query.filter());
        Criteria searchCriteria = searchCriteria(definition, type, query.searchText());
        return searchCriteria == null
                ? new Query(filterCriteria)
                : new Query(new Criteria().andOperator(filterCriteria, searchCriteria));
    }

    private Query buildQuery(OntologyProjectDefinition definition, ObjectTypeDTO type, ObjectSetQuery query) {
        Query mongoQuery = buildCountQuery(definition, type, query);
        mongoQuery.skip(query.offset()).limit(query.limit());
        String sortBy = query.sortBy();
        String field = sortBy == null || sortBy.isBlank()
                ? primaryKeyColumn(definition, type)
                : column(definition, type, sortBy);
        mongoQuery.with(Sort.by(
                "desc".equalsIgnoreCase(query.sortDirection()) ? Sort.Direction.DESC : Sort.Direction.ASC, field));
        return mongoQuery;
    }

    private Criteria criteria(OntologyProjectDefinition definition, ObjectTypeDTO type, JsonNode filter) {
        if (filter == null || filter.isNull()) return new Criteria();
        if (!filter.isObject()) {
            throw new CelanWorksmithException(CelanWorksmithErrorCode.FILTER_INVALID, "filter must be a JSON object");
        }
        List<Criteria> conditions = new ArrayList<>();
        if (filter.has("conditions") || filter.has("typeId") || filter.has("version")) {
            if (!type.id().equals(filter.path("typeId").asText())
                    || filter.path("version").asInt() != 1
                    || !filter.path("conditions").isArray()) {
                throw new CelanWorksmithException(
                        CelanWorksmithErrorCode.FILTER_INVALID,
                        "filter must be a version 1 object filter for " + type.id());
            }
            for (JsonNode condition : filter.path("conditions")) {
                conditions.add(condition(
                        definition,
                        type,
                        condition.path("propertyId").asText(""),
                        condition.path("operator").asText(""),
                        condition.get("value")));
            }
        } else {
            filter.fields()
                    .forEachRemaining(entry ->
                            conditions.add(simpleCondition(definition, type, entry.getKey(), entry.getValue())));
        }
        return conditions.isEmpty() ? new Criteria() : new Criteria().andOperator(conditions.toArray(new Criteria[0]));
    }

    private Criteria searchCriteria(OntologyProjectDefinition definition, ObjectTypeDTO type, String searchText) {
        if (searchText == null || searchText.isBlank()) return null;
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                java.util.regex.Pattern.quote(searchText.trim()), java.util.regex.Pattern.CASE_INSENSITIVE);
        List<Criteria> fields = new ArrayList<>();
        type.properties()
                .forEach(property -> fields.add(
                        Criteria.where(column(definition, type, property.id())).regex(pattern)));
        return new Criteria().orOperator(fields.toArray(new Criteria[0]));
    }

    private Criteria simpleCondition(
            OntologyProjectDefinition definition, ObjectTypeDTO type, String property, JsonNode value) {
        requireProperty(type, property, "filter");
        Criteria criteria = Criteria.where(column(definition, type, property));
        if (!value.isObject()) return criteria.is(value(value));
        value.fields().forEachRemaining(entry -> applyOperator(criteria, entry.getKey(), entry.getValue()));
        return criteria;
    }

    private Criteria condition(
            OntologyProjectDefinition definition,
            ObjectTypeDTO type,
            String property,
            String operator,
            JsonNode value) {
        requireProperty(type, property, "filter");
        String field = column(definition, type, property);
        Criteria criteria = Criteria.where(field);
        if ("isEmpty".equals(operator)) {
            return new Criteria()
                    .orOperator(
                            Criteria.where(field).is(null),
                            Criteria.where(field).is(""));
        }
        if (value == null) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.FILTER_INVALID, "Filter value is required for operator: " + operator);
        }
        return applyOperator(
                criteria,
                "$"
                        + switch (operator) {
                            case "equals" -> "eq";
                            case "contains", "startsWith" -> "regex";
                            case "gt", "gte", "lt", "lte" -> operator;
                            default ->
                                throw new CelanWorksmithException(
                                        CelanWorksmithErrorCode.FILTER_INVALID,
                                        "Unsupported filter operator: " + operator);
                        },
                value,
                operator);
    }

    private Criteria applyOperator(Criteria criteria, String operator, JsonNode value) {
        return applyOperator(criteria, operator, value, operator);
    }

    private Criteria applyOperator(Criteria criteria, String operator, JsonNode value, String original) {
        Object converted = value(value);
        switch (operator) {
            case "$eq" -> criteria.is(converted);
            case "$ne" -> criteria.ne(converted);
            case "$gt" -> criteria.gt(converted);
            case "$gte" -> criteria.gte(converted);
            case "$lt" -> criteria.lt(converted);
            case "$lte" -> criteria.lte(converted);
            case "$in" -> criteria.in(value.isArray() ? values(value) : List.of());
            case "$regex" ->
                criteria.regex(("contains".equals(original) ? ".*" : "^")
                        + java.util.regex.Pattern.quote(value.asText())
                        + ("contains".equals(original) ? ".*" : ""));
            default ->
                throw new CelanWorksmithException(
                        CelanWorksmithErrorCode.FILTER_INVALID, "Unsupported filter operator: " + original);
        }
        return criteria;
    }

    private List<Object> values(JsonNode node) {
        List<Object> values = new ArrayList<>();
        node.forEach(value -> values.add(value(value)));
        return values;
    }

    private Object value(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isIntegralNumber()) return node.longValue();
        if (node.isFloatingPointNumber()) return node.decimalValue();
        if (node.isBoolean()) return node.booleanValue();
        return node.asText();
    }

    private void validateQuery(ObjectTypeDTO type, ObjectSetQuery query) {
        if (query.offset() < 0 || query.limit() < 1 || query.limit() > MAX_LIMIT) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "offset must be non-negative and limit must be between 1 and " + MAX_LIMIT);
        }
        if (!"asc".equalsIgnoreCase(query.sortDirection()) && !"desc".equalsIgnoreCase(query.sortDirection())) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "sortDirection must be asc or desc");
        }
        if (query.sortBy() != null && !query.sortBy().isBlank()) requireProperty(type, query.sortBy(), "sort");
    }

    private void requireProperty(ObjectTypeDTO type, String property, String kind) {
        if (type.properties().stream().map(PropertyDTO::id).noneMatch(property::equals)) {
            throw new CelanWorksmithException(
                    "sort".equals(kind)
                            ? CelanWorksmithErrorCode.INVALID_ARGUMENT
                            : CelanWorksmithErrorCode.FILTER_INVALID,
                    "Unknown " + kind + " property: " + type.id() + "." + property);
        }
    }

    private ObjectInstanceDTO toDto(OntologyProjectDefinition definition, ObjectTypeDTO type, Document document) {
        Object primaryKey = document.get(primaryKeyColumn(definition, type));
        if (primaryKey == null) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Release object has no mapped primary key: " + type.id());
        }
        Map<String, Object> properties = new LinkedHashMap<>();
        type.properties()
                .forEach(property ->
                        properties.put(property.id(), document.get(column(definition, type, property.id()))));
        return new ObjectInstanceDTO(String.valueOf(primaryKey), type.id(), properties);
    }

    private List<LinkTypeDTO.FieldMapping> linkMappings(OntologyProjectDefinition definition, LinkTypeDTO link) {
        return definition.runtimeMappings().linkMappings().stream()
                .filter(mapping -> mapping.linkTypeId().equals(link.id()))
                .findFirst()
                .map(OntologyProjectDefinition.LinkRuntimeMapping::fieldMappings)
                .filter(mappings -> !mappings.isEmpty())
                .orElseThrow(() -> new CelanWorksmithException(
                        CelanWorksmithErrorCode.INVALID_ARGUMENT, "Release link has no field mapping: " + link.id()));
    }

    private String primaryKeyColumn(OntologyProjectDefinition definition, ObjectTypeDTO type) {
        return definition.runtimeMappings().objectMappings().stream()
                .filter(mapping -> mapping.objectTypeId().equals(type.id()))
                .findFirst()
                .map(mapping -> mapping.primaryKeyMappings().get(type.primaryKey()))
                .filter(column -> column != null && !column.isBlank())
                .orElseThrow(() -> new CelanWorksmithException(
                        CelanWorksmithErrorCode.INVALID_ARGUMENT,
                        "Release object type has no primary key mapping: " + type.id()));
    }

    private Object primaryKeyValue(ObjectTypeDTO type, String instanceId) {
        PropertyDTO property = type.properties().stream()
                .filter(candidate -> candidate.id().equals(type.primaryKey()))
                .findFirst()
                .orElseThrow(() -> new CelanWorksmithException(
                        CelanWorksmithErrorCode.INVALID_ARGUMENT,
                        "Release object type has no primary key property: " + type.id()));
        try {
            return switch (property.dataType().toUpperCase(Locale.ROOT)) {
                case "INTEGER" -> Long.parseLong(instanceId);
                case "DECIMAL" -> new BigDecimal(instanceId);
                case "BOOLEAN" -> booleanValue(instanceId);
                default -> instanceId;
            };
        } catch (NumberFormatException exception) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "Invalid " + property.dataType() + " primary key: " + instanceId);
        }
    }

    private boolean booleanValue(String instanceId) {
        if ("true".equalsIgnoreCase(instanceId)) return true;
        if ("false".equalsIgnoreCase(instanceId)) return false;
        throw new CelanWorksmithException(
                CelanWorksmithErrorCode.INVALID_ARGUMENT, "Invalid BOOLEAN primary key: " + instanceId);
    }

    private String column(OntologyProjectDefinition definition, ObjectTypeDTO type, String property) {
        if (type.primaryKey().equals(property)) return primaryKeyColumn(definition, type);
        ObjectTypeDTO.RuntimePropertyMapping mapping =
                type.runtimePropertyMappings().get(property);
        if (mapping == null || mapping.column() == null || mapping.column().isBlank()) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "Release property has no runtime column: " + type.id() + "." + property);
        }
        return mapping.column();
    }

    private ObjectTypeDTO resolveType(OntologyProjectDefinition definition, String typeId) {
        return definition.objectTypes().stream()
                .filter(type -> type.id().equals(typeId))
                .findFirst()
                .orElseThrow(() -> new CelanWorksmithException(
                        CelanWorksmithErrorCode.OBJECT_TYPE_NOT_FOUND, "Unknown object type: " + typeId));
    }

    private String collection(ObjectTypeDTO type) {
        if (type.runtimeTable() == null || type.runtimeTable().isBlank()) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Object type has no runtime table: " + type.id());
        }
        return RuntimeTableMapping.releaseCollectionFor(type.runtimeTable());
    }

    private JsonNode mergeRelationshipFilter(
            ObjectTypeDTO targetType, JsonNode supplied, Map<String, Object> relationshipValues) {
        if (supplied == null || supplied.isNull()) {
            ObjectNode filter = JsonNodeFactory.instance.objectNode();
            relationshipValues.forEach(
                    (property, value) -> filter.set(property, JsonNodeFactory.instance.pojoNode(value)));
            return filter;
        }
        if (!supplied.isObject()) {
            throw new CelanWorksmithException(CelanWorksmithErrorCode.FILTER_INVALID, "filter must be a JSON object");
        }
        ObjectNode merged = supplied.deepCopy();
        if (supplied.has("conditions") || supplied.has("typeId") || supplied.has("version")) {
            if (!targetType.id().equals(supplied.path("typeId").asText())
                    || supplied.path("version").asInt() != 1
                    || !supplied.path("conditions").isArray()) {
                throw new CelanWorksmithException(
                        CelanWorksmithErrorCode.FILTER_INVALID,
                        "filter must be a version 1 object filter for " + targetType.id());
            }
            ArrayNode conditions = (ArrayNode) merged.get("conditions");
            relationshipValues.forEach((property, value) -> conditions
                    .addObject()
                    .put("propertyId", property)
                    .put("operator", "equals")
                    .set("value", JsonNodeFactory.instance.pojoNode(value)));
            return merged;
        }
        relationshipValues.forEach((property, value) -> merged.set(property, JsonNodeFactory.instance.pojoNode(value)));
        return merged;
    }
}
