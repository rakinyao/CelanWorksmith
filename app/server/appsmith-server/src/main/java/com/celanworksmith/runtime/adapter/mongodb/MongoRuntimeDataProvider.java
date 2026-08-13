package com.celanworksmith.runtime.adapter.mongodb;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.application.CelanworksmithApplicationBindingResolver;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.runtime.adapter.mock.MockRuntimeProvider;
import com.celanworksmith.runtime.context.CelanworksmithRuntimeContext;
import com.celanworksmith.runtime.dto.ObjectInstanceDTO;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.celanworksmith.runtime.dto.ObjectSetResult;
import com.celanworksmith.runtime.mock.MockDataStore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mongodb.reactivestreams.client.MongoClient;
import com.mongodb.reactivestreams.client.MongoClients;
import jakarta.annotation.PreDestroy;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class MongoRuntimeDataProvider extends MockRuntimeProvider {
    private final ReactiveMongoTemplate template;
    private final CelanworksmithApplicationBindingResolver resolver;
    private final MongoClient client;
    private final String providerId;

    public MongoRuntimeDataProvider(ReactiveMongoTemplate template, CelanworksmithApplicationBindingResolver resolver) {
        this(template, resolver, null, new MockDataStore(), "demo-mongo-readonly");
    }

    public MongoRuntimeDataProvider(
            MongoRuntimeProperties properties, CelanworksmithApplicationBindingResolver resolver) {
        this(properties, resolver, new MockDataStore(false));
    }

    public MongoRuntimeDataProvider(
            MongoRuntimeProperties properties,
            CelanworksmithApplicationBindingResolver resolver,
            MockDataStore legacyStore) {
        super(legacyStore);
        this.client = MongoClients.create(properties.getUri());
        this.template = new ReactiveMongoTemplate(client, properties.getDatabase());
        this.resolver = resolver;
        this.providerId = properties.getProviderId();
    }

    private MongoRuntimeDataProvider(
            ReactiveMongoTemplate template,
            CelanworksmithApplicationBindingResolver resolver,
            MongoClient client,
            MockDataStore legacyStore,
            String providerId) {
        super(legacyStore);
        this.template = template;
        this.resolver = resolver;
        this.client = client;
        this.providerId = providerId;
    }

    @Override
    public String providerId() {
        return providerId;
    }

    @Override
    public Mono<RuntimeMetadataCapabilities> metadataCapabilities() {
        return Mono.just(new RuntimeMetadataCapabilities(Map.of(
                "PurchaseOrder",
                Map.of(
                        "supplierId", "REFERENCE",
                        "status", "ENUM",
                        "amount", "DECIMAL",
                        "delayDays", "INTEGER"),
                "Supplier",
                Map.of("name", "STRING"))));
    }

    @Override
    public Mono<ObjectSetResult> queryObjects(
            CelanworksmithRuntimeContext context, String typeId, ObjectSetQuery query) {
        if (context == null || context.legacyDefault() || context.applicationId() == null) {
            return super.queryObjects(typeId, query);
        }
        return resolveType(context.applicationId(), typeId).flatMap(type -> queryMongo(type, query));
    }

    @Override
    public Mono<ObjectSetResult> queryObjects(
            OntologyProjectDefinition definition, String typeId, ObjectSetQuery query) {
        if (definition == null) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Ontology project definition is required"));
        }
        return resolveType(definition, typeId).flatMap(type -> queryMongo(type, query));
    }

    @Override
    public Mono<ObjectInstanceDTO> getObject(CelanworksmithRuntimeContext context, String typeId, String instanceId) {
        if (context == null || context.legacyDefault() || context.applicationId() == null) {
            return super.getObject(typeId, instanceId);
        }
        return resolveType(context.applicationId(), typeId).flatMap(type -> {
            Query query = Query.query(Criteria.where("_id").is(instanceId));
            return template.findOne(query, MongoRuntimeObjectDocument.class, collection(type))
                    .switchIfEmpty(Mono.error(new CelanWorksmithException(
                            CelanWorksmithErrorCode.OBJECT_NOT_FOUND, "Unknown object: " + typeId + "/" + instanceId)))
                    .map(document -> toDto(document, typeId));
        });
    }

    @Override
    public Mono<ObjectSetResult> getLinks(
            CelanworksmithRuntimeContext context,
            String typeId,
            String instanceId,
            String linkTypeId,
            ObjectSetQuery query) {
        if (context == null || context.legacyDefault() || context.applicationId() == null) {
            return super.getLinks(typeId, instanceId, linkTypeId, query);
        }
        return resolver.resolve(context.applicationId()).flatMap(binding -> {
            ObjectTypeDTO sourceType = binding.project().objectTypes().stream()
                    .filter(candidate -> candidate.id().equals(typeId))
                    .findFirst()
                    .orElseThrow(() -> new CelanWorksmithException(
                            CelanWorksmithErrorCode.OBJECT_TYPE_NOT_FOUND, "Unknown object type: " + typeId));
            LinkTypeDTO link = binding.project().linkTypes().stream()
                    .filter(candidate -> candidate.id().equals(linkTypeId)
                            && candidate.sourceTypeId().equals(typeId))
                    .findFirst()
                    .orElseThrow(() -> new CelanWorksmithException(
                            CelanWorksmithErrorCode.LINK_TYPE_NOT_FOUND,
                            "Link type is not valid for source type: " + typeId + "/" + linkTypeId));
            return template.findOne(
                            Query.query(Criteria.where("_id").is(instanceId)),
                            MongoRuntimeObjectDocument.class,
                            collection(sourceType))
                    .switchIfEmpty(Mono.error(new CelanWorksmithException(
                            CelanWorksmithErrorCode.OBJECT_NOT_FOUND, "Unknown object: " + typeId + "/" + instanceId)))
                    .then(resolveType(binding.project(), link.targetTypeId()))
                    .flatMap(targetType -> {
                        String reference = typeId.substring(0, 1).toLowerCase() + typeId.substring(1) + "Id";
                        ObjectSetQuery supplied = query == null ? ObjectSetQuery.defaults() : query;
                        ObjectSetQuery linkQuery = new ObjectSetQuery(
                                mergeRelationshipFilter(targetType, supplied.filter(), reference, instanceId),
                                supplied.sortBy(),
                                supplied.sortDirection(),
                                supplied.offset(),
                                supplied.limit(),
                                supplied.searchText());
                        return queryMongo(targetType, linkQuery);
                    });
        });
    }

    private Mono<ObjectSetResult> queryMongo(ObjectTypeDTO type, ObjectSetQuery supplied) {
        ObjectSetQuery query = supplied == null ? ObjectSetQuery.defaults() : supplied;
        validateQuery(type, query);
        Query mongoQuery = buildQuery(type, query);
        String collection = collection(type);
        Mono<List<ObjectInstanceDTO>> items = template.find(mongoQuery, MongoRuntimeObjectDocument.class, collection)
                .map(document -> toDto(document, type.id()))
                .collectList();
        Mono<Long> total = template.count(buildCountQuery(type, query), collection);
        return Mono.zip(items, total)
                .map(tuple -> new ObjectSetResult(
                        type.id(),
                        tuple.getT1(),
                        tuple.getT2() < query.offset() ? tuple.getT2().intValue() : query.offset(),
                        query.limit(),
                        tuple.getT2()));
    }

    private Query buildCountQuery(ObjectTypeDTO type, ObjectSetQuery query) {
        Criteria filterCriteria = criteria(type, query.filter());
        Criteria searchCriteria = searchCriteria(type, query.searchText());
        if (searchCriteria == null) return new Query(filterCriteria);
        return new Query(new Criteria().andOperator(filterCriteria, searchCriteria));
    }

    private Query buildQuery(ObjectTypeDTO type, ObjectSetQuery query) {
        Query mongoQuery = buildCountQuery(type, query);
        mongoQuery.skip(query.offset()).limit(query.limit());
        String sortBy = query.sortBy();
        String field = sortBy == null || sortBy.isBlank() || "id".equals(sortBy) ? "_id" : "properties." + sortBy;
        mongoQuery.with(Sort.by(
                "desc".equalsIgnoreCase(query.sortDirection()) ? Sort.Direction.DESC : Sort.Direction.ASC, field));
        return mongoQuery;
    }

    private Criteria criteria(ObjectTypeDTO type, JsonNode filter) {
        if (filter == null || filter.isNull()) return new Criteria();
        if (!filter.isObject())
            throw new CelanWorksmithException(CelanWorksmithErrorCode.FILTER_INVALID, "filter must be a JSON object");
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
                String property = condition.path("propertyId").asText("");
                conditions.add(
                        condition(type, property, condition.path("operator").asText(""), condition.get("value")));
            }
        } else {
            filter.fields()
                    .forEachRemaining(entry -> conditions.add(simpleCondition(type, entry.getKey(), entry.getValue())));
        }
        return conditions.isEmpty() ? new Criteria() : new Criteria().andOperator(conditions.toArray(new Criteria[0]));
    }

    private Criteria searchCriteria(ObjectTypeDTO type, String searchText) {
        if (searchText == null || searchText.isBlank()) return null;
        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(
                java.util.regex.Pattern.quote(searchText.trim()), java.util.regex.Pattern.CASE_INSENSITIVE);
        List<Criteria> fields = new ArrayList<>();
        fields.add(Criteria.where("_id").regex(pattern));
        type.properties()
                .forEach(property ->
                        fields.add(Criteria.where("properties." + property.id()).regex(pattern)));
        return new Criteria().orOperator(fields.toArray(new Criteria[0]));
    }

    private Criteria simpleCondition(ObjectTypeDTO type, String property, JsonNode value) {
        requireProperty(type, property, "filter");
        Criteria criteria = Criteria.where("properties." + property);
        if (!value.isObject()) return criteria.is(value(value));
        value.fields().forEachRemaining(entry -> applyOperator(criteria, entry.getKey(), entry.getValue()));
        return criteria;
    }

    private Criteria condition(ObjectTypeDTO type, String property, String operator, JsonNode value) {
        requireProperty(type, property, "filter");
        Criteria criteria = Criteria.where("properties." + property);
        if ("isEmpty".equals(operator)) {
            return new Criteria()
                    .orOperator(
                            Criteria.where("properties." + property).is(null),
                            Criteria.where("properties." + property).is(""));
        }
        if (value == null)
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.FILTER_INVALID, "Filter value is required for operator: " + operator);
        return applyOperator(
                criteria,
                "$"
                        + switch (operator) {
                            case "equals" -> "eq";
                            case "contains" -> "regex";
                            case "startsWith" -> "regex";
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
            case "$in" ->
                criteria.in(value.isArray() ? value.elements().hasNext() ? values(value) : List.of() : List.of());
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
        List<Object> result = new ArrayList<>();
        node.forEach(value -> result.add(value(value)));
        return result;
    }

    private Object value(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (node.isIntegralNumber()) return node.longValue();
        if (node.isFloatingPointNumber()) return node.decimalValue();
        if (node.isBoolean()) return node.booleanValue();
        return node.asText();
    }

    private void validateQuery(ObjectTypeDTO type, ObjectSetQuery query) {
        if (query.offset() < 0 || query.limit() < 1 || query.limit() > 100)
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "offset must be non-negative and limit must be between 1 and 100");
        if (!"asc".equalsIgnoreCase(query.sortDirection()) && !"desc".equalsIgnoreCase(query.sortDirection()))
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "sortDirection must be asc or desc");
        if (query.sortBy() != null && !query.sortBy().isBlank() && !"id".equals(query.sortBy()))
            requireProperty(type, query.sortBy(), "sort");
    }

    private void requireProperty(ObjectTypeDTO type, String property, String kind) {
        if (type.properties().stream().map(PropertyDTO::id).noneMatch(property::equals))
            throw new CelanWorksmithException(
                    "sort".equals(kind)
                            ? CelanWorksmithErrorCode.INVALID_ARGUMENT
                            : CelanWorksmithErrorCode.FILTER_INVALID,
                    "Unknown " + kind + " property: " + type.id() + "." + property);
    }

    private Mono<ObjectTypeDTO> resolveType(String applicationId, String typeId) {
        return resolver.resolve(applicationId).flatMap(binding -> resolveType(binding.project(), typeId));
    }

    private Mono<ObjectTypeDTO> resolveType(OntologyProjectDefinition project, String typeId) {
        return project.objectTypes().stream()
                .filter(type -> type.id().equals(typeId))
                .findFirst()
                .map(Mono::just)
                .orElseGet(() -> Mono.error(new CelanWorksmithException(
                        CelanWorksmithErrorCode.OBJECT_TYPE_NOT_FOUND, "Unknown object type: " + typeId)));
    }

    private String collection(ObjectTypeDTO type) {
        if (type.runtimeTable() == null || type.runtimeTable().isBlank())
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Object type has no runtime table: " + type.id());
        return RuntimeTableMapping.collectionFor(type.runtimeTable());
    }

    private ObjectInstanceDTO toDto(MongoRuntimeObjectDocument document, String typeId) {
        return new ObjectInstanceDTO(
                document.getId(),
                typeId,
                new LinkedHashMap<>(document.getProperties() == null ? Map.of() : document.getProperties()));
    }

    private JsonNode equalFilter(String property, String value) {
        return com.fasterxml.jackson.databind.node.JsonNodeFactory.instance
                .objectNode()
                .put(property, value);
    }

    private JsonNode mergeRelationshipFilter(
            ObjectTypeDTO targetType, JsonNode supplied, String referenceProperty, String instanceId) {
        if (supplied == null || supplied.isNull()) return equalFilter(referenceProperty, instanceId);
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
            conditions
                    .addObject()
                    .put("propertyId", referenceProperty)
                    .put("operator", "equals")
                    .put("value", instanceId);
            return merged;
        }
        merged.put(referenceProperty, instanceId);
        return merged;
    }

    @PreDestroy
    public void close() {
        if (client != null) client.close();
    }
}
