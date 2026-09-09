package com.celanworksmith.runtime.adapter.mongodb;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.application.CelanworksmithApplicationBindingResolver;
import com.celanworksmith.ontology.datasource.OntologyObjectSet;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.runtime.adapter.mock.MockRuntimeProvider;
import com.celanworksmith.runtime.context.CelanworksmithRuntimeContext;
import com.celanworksmith.runtime.demo.DemoFunctionRegistry;
import com.celanworksmith.runtime.dto.FunctionExecutionRequest;
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
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class MongoRuntimeDataProvider extends MockRuntimeProvider {
    private static final int MAX_LIMIT = 5_000;

    private final ReactiveMongoTemplate template;
    private final CelanworksmithApplicationBindingResolver resolver;
    private final MongoClient client;
    private final String providerId;
    private final ReleaseMappedMongoRuntimeAdapter releaseAdapter;

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
        this.releaseAdapter = new ReleaseMappedMongoRuntimeAdapter(template);
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
        this.releaseAdapter = new ReleaseMappedMongoRuntimeAdapter(template);
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
                        "orderDate", "DATETIME",
                        "expectedDeliveryDate", "DATETIME",
                        "actualDeliveryDate", "DATETIME",
                        "amount", "DECIMAL",
                        "delayDays", "INTEGER"),
                "Supplier",
                Map.of(
                        "name", "STRING",
                        "contactName", "STRING",
                        "riskLevel", "ENUM",
                        "averageRating", "DECIMAL"))));
    }

    @Override
    public Mono<RuntimeMetadataCapabilities> metadataCapabilities(OntologyProjectDefinition definition) {
        return ReleaseMappedMongoRuntimeAdapter.supports(definition)
                ? Mono.just(releaseAdapter.metadataCapabilities(definition))
                : metadataCapabilities();
    }

    @Override
    public Mono<ObjectSetResult> queryObjects(
            CelanworksmithRuntimeContext context, String typeId, ObjectSetQuery query) {
        if (context == null || context.legacyDefault() || context.applicationId() == null) {
            return super.queryObjects(typeId, query);
        }
        return resolver.resolve(context.applicationId())
                .flatMap(binding -> ReleaseMappedMongoRuntimeAdapter.supports(binding.project())
                        ? releaseAdapter.queryObjects(binding.project(), typeId, query)
                        : resolveType(binding.project(), typeId).flatMap(type -> queryMongo(type, query)));
    }

    @Override
    public Mono<ObjectSetResult> queryObjects(
            OntologyProjectDefinition definition, String typeId, ObjectSetQuery query) {
        if (definition == null) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Ontology project definition is required"));
        }
        if (ReleaseMappedMongoRuntimeAdapter.supports(definition)) {
            return releaseAdapter.queryObjects(definition, typeId, query);
        }
        return resolveType(definition, typeId).flatMap(type -> queryMongo(type, query));
    }

    @Override
    public Mono<ObjectInstanceDTO> getObject(OntologyProjectDefinition definition, String typeId, String instanceId) {
        if (definition == null) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Ontology project definition is required"));
        }
        if (ReleaseMappedMongoRuntimeAdapter.supports(definition)) {
            return releaseAdapter.getObject(definition, typeId, instanceId);
        }
        return resolveType(definition, typeId).flatMap(type -> {
            Query query = Query.query(Criteria.where("_id").is(instanceId));
            return template.findOne(query, MongoRuntimeObjectDocument.class, collection(type))
                    .switchIfEmpty(Mono.error(new CelanWorksmithException(
                            CelanWorksmithErrorCode.OBJECT_NOT_FOUND, "Unknown object: " + typeId + "/" + instanceId)))
                    .map(document -> toDto(document, typeId));
        });
    }

    @Override
    public Mono<Object> executeFunction(
            OntologyProjectDefinition definition, String functionId, FunctionExecutionRequest request) {
        if (definition == null) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Ontology project definition is required"));
        }
        if (!"CalculateDelayDays".equals(functionId) && !DemoFunctionRegistry.isRegistered(functionId)) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.FUNCTION_NOT_FOUND, "Unknown function: " + functionId));
        }
        Map<String, Object> parameters =
                request == null || request.parameters() == null ? Map.of() : request.parameters();
        if (!parameters.isEmpty()) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "Unknown function parameter: "
                            + parameters.keySet().iterator().next()));
        }
        OntologyObjectSet targets = request == null ? null : request.targets();
        if (targets == null) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Function targets are required"));
        }
        definition.functions().stream()
                .filter(function -> function.id().equals(functionId))
                .findFirst()
                .ifPresent(function -> {
                    if (function.maxItems() != null && targets.objectIds().size() > function.maxItems()) {
                        throw new CelanWorksmithException(
                                CelanWorksmithErrorCode.INVALID_ARGUMENT,
                                "Function " + functionId + " accepts at most " + function.maxItems() + " targets");
                    }
                    if (!function.ownerObjectTypeIds().isEmpty()
                            && !function.ownerObjectTypeIds().contains(targets.objectTypeId())) {
                        throw new CelanWorksmithException(
                                CelanWorksmithErrorCode.INVALID_ARGUMENT,
                                "Function " + functionId + " does not apply to object type: " + targets.objectTypeId());
                    }
                });
        if ("CalculateDelayDays".equals(functionId) && !"PurchaseOrder".equals(targets.objectTypeId())) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "Function CalculateDelayDays does not apply to object type: " + targets.objectTypeId()));
        }
        if (("CalculateContractChangeRate".equals(functionId) || "CalculateContractGrossAmount".equals(functionId))
                && !"contract".equals(targets.objectTypeId())) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "Function " + functionId + " does not apply to object type: " + targets.objectTypeId()));
        }
        if ("CalculateSupplierRisk".equals(functionId) && !"supplier".equals(targets.objectTypeId())) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "Function CalculateSupplierRisk does not apply to object type: " + targets.objectTypeId()));
        }
        if ("CalculateCustomerContractTotal".equals(functionId) && !"customer".equals(targets.objectTypeId())) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "Function CalculateCustomerContractTotal does not apply to object type: "
                            + targets.objectTypeId()));
        }
        if ("CalculateSupplierRisk".equals(functionId)) {
            return resolveType(definition, "supplier").flatMap(type -> Flux.fromIterable(targets.objectIds())
                    .concatMap(id -> releaseAdapter.getObject(definition, type.id(), id))
                    .map(object -> {
                        String state = String.valueOf(object.properties().getOrDefault("state", ""));
                        String match = String.valueOf(object.properties().getOrDefault("match_state", ""));
                        BigDecimal tax = decimalProperty(object, "tax_rate", object.id());
                        if (!"ACTIVE".equalsIgnoreCase(state) || !"MATCHED".equalsIgnoreCase(match)) {
                            return "HIGH";
                        }
                        return tax.compareTo(new BigDecimal("0.15")) > 0 ? "MEDIUM" : "LOW";
                    })
                    .collectList()
                    .map(results -> results.size() == 1 ? results.getFirst() : results));
        }
        if ("CalculateCustomerContractTotal".equals(functionId)) {
            return resolveType(definition, "customer").flatMap(type -> Flux.fromIterable(targets.objectIds())
                    .concatMap(id -> releaseAdapter.getObject(definition, type.id(), id))
                    .concatMap(customer -> {
                        Object code = customer.properties().get("customer_code");
                        if (code == null)
                            return Mono.error(new CelanWorksmithException(
                                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                                    "Customer " + customer.id() + " has invalid customer_code"));
                        return releaseAdapter
                                .queryObjects(definition, "contract", ObjectSetQuery.defaults())
                                .map(result -> result.items().stream()
                                        .filter(contract -> code.toString()
                                                .equals(String.valueOf(
                                                        contract.properties().get("customer_code"))))
                                        .map(contract -> decimalProperty(contract, "current_amount", contract.id()))
                                        .reduce(BigDecimal.ZERO, BigDecimal::add)
                                        .setScale(2, java.math.RoundingMode.HALF_UP));
                    })
                    .collectList()
                    .map(results -> results.size() == 1 ? results.getFirst() : results));
        }
        if ("CalculateContractGrossAmount".equals(functionId)) {
            return resolveType(definition, targets.objectTypeId())
                    .flatMap(type -> Flux.fromIterable(targets.objectIds())
                            .concatMap(objectId -> releaseAdapter.getObject(definition, type.id(), objectId))
                            .map(object -> decimalProperty(object, "current_amount", object.id()))
                            .reduce(BigDecimal.ZERO, BigDecimal::add)
                            .map(total -> total.setScale(2, java.math.RoundingMode.HALF_UP)));
        }
        if ("CalculateContractChangeRate".equals(functionId)) {
            return resolveType(definition, targets.objectTypeId())
                    .flatMap(type -> Flux.fromIterable(targets.objectIds())
                            .concatMap(objectId -> releaseAdapter.getObject(definition, type.id(), objectId))
                            .map(object -> {
                                BigDecimal original = decimalProperty(object, "original_amount", object.id());
                                BigDecimal change = decimalProperty(object, "change_amount", object.id());
                                if (original.compareTo(BigDecimal.ZERO) == 0) {
                                    throw new CelanWorksmithException(
                                            CelanWorksmithErrorCode.INVALID_ARGUMENT,
                                            "Contract " + object.id() + " has zero original_amount");
                                }
                                return change.divide(original, 4, java.math.RoundingMode.HALF_UP);
                            })
                            .collectList()
                            .map(results -> results.size() == 1 ? results.getFirst() : results));
        }
        return resolveType(definition, targets.objectTypeId()).flatMap(type -> Flux.fromIterable(targets.objectIds())
                .concatMap(objectId -> template.findOne(
                                Query.query(Criteria.where("_id").is(objectId)),
                                MongoRuntimeObjectDocument.class,
                                collection(type))
                        .switchIfEmpty(Mono.error(new CelanWorksmithException(
                                CelanWorksmithErrorCode.OBJECT_NOT_FOUND, "Unknown object: PurchaseOrder/" + objectId)))
                        .flatMap(document -> parseDelayDays(objectId, document)))
                .collectList()
                .map(results -> results.size() == 1 ? results.getFirst() : results));
    }

    private BigDecimal decimalProperty(ObjectInstanceDTO object, String property, String objectId) {
        Object value = object.properties() == null ? null : object.properties().get(property);
        if (value == null) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Object " + objectId + " has invalid " + property);
        }
        try {
            return new BigDecimal(String.valueOf(value));
        } catch (NumberFormatException exception) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Object " + objectId + " has invalid " + property);
        }
    }

    @Override
    public Mono<Object> executeFunction(String functionId, FunctionExecutionRequest request) {
        return Mono.error(new CelanWorksmithException(
                CelanWorksmithErrorCode.INVALID_ARGUMENT,
                "Mongo function execution requires a pinned ontology definition"));
    }

    @Override
    public Mono<ObjectInstanceDTO> getObject(CelanworksmithRuntimeContext context, String typeId, String instanceId) {
        if (context == null || context.legacyDefault() || context.applicationId() == null) {
            return super.getObject(typeId, instanceId);
        }
        return resolver.resolve(context.applicationId()).flatMap(binding -> {
            if (ReleaseMappedMongoRuntimeAdapter.supports(binding.project())) {
                return releaseAdapter.getObject(binding.project(), typeId, instanceId);
            }
            return resolveType(binding.project(), typeId).flatMap(type -> {
                Query query = Query.query(Criteria.where("_id").is(instanceId));
                return template.findOne(query, MongoRuntimeObjectDocument.class, collection(type))
                        .switchIfEmpty(Mono.error(new CelanWorksmithException(
                                CelanWorksmithErrorCode.OBJECT_NOT_FOUND,
                                "Unknown object: " + typeId + "/" + instanceId)))
                        .map(document -> toDto(document, typeId));
            });
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
            if (ReleaseMappedMongoRuntimeAdapter.supports(binding.project())) {
                return releaseAdapter.getLinks(binding.project(), typeId, instanceId, linkTypeId, query);
            }
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

    @Override
    public Mono<ObjectSetResult> getLinks(
            OntologyProjectDefinition definition,
            String typeId,
            String instanceId,
            String linkTypeId,
            ObjectSetQuery query) {
        if (definition == null) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Ontology project definition is required"));
        }
        if (ReleaseMappedMongoRuntimeAdapter.supports(definition)) {
            return releaseAdapter.getLinks(definition, typeId, instanceId, linkTypeId, query);
        }
        ObjectTypeDTO sourceType = definition.objectTypes().stream()
                .filter(candidate -> candidate.id().equals(typeId))
                .findFirst()
                .orElseThrow(() -> new CelanWorksmithException(
                        CelanWorksmithErrorCode.OBJECT_TYPE_NOT_FOUND, "Unknown object type: " + typeId));
        LinkTypeDTO link = definition.linkTypes().stream()
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
                .then(resolveType(definition, link.targetTypeId()))
                .flatMap(targetType -> {
                    String reference = typeId.substring(0, 1).toLowerCase() + typeId.substring(1) + "Id";
                    ObjectSetQuery supplied = query == null ? ObjectSetQuery.defaults() : query;
                    return queryMongo(
                            targetType,
                            new ObjectSetQuery(
                                    mergeRelationshipFilter(targetType, supplied.filter(), reference, instanceId),
                                    supplied.sortBy(),
                                    supplied.sortDirection(),
                                    supplied.offset(),
                                    supplied.limit(),
                                    supplied.searchText()));
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

    private Mono<Object> parseDelayDays(String poId, MongoRuntimeObjectDocument document) {
        Object value = document.getProperties() == null
                ? null
                : document.getProperties().get("delayDays");
        if (value == null) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "PurchaseOrder " + poId + " has invalid delayDays"));
        }
        try {
            return Mono.just(Integer.parseInt(String.valueOf(value)));
        } catch (NumberFormatException exception) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "PurchaseOrder " + poId + " has invalid delayDays"));
        }
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
        String field =
                sortBy == null || sortBy.isBlank() || type.primaryKey().equals(sortBy) ? "_id" : "properties." + sortBy;
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
        Criteria criteria = Criteria.where(mongoField(type, property));
        if (!value.isObject()) return criteria.is(value(value));
        value.fields().forEachRemaining(entry -> applyOperator(criteria, entry.getKey(), entry.getValue()));
        return criteria;
    }

    private Criteria condition(ObjectTypeDTO type, String property, String operator, JsonNode value) {
        requireProperty(type, property, "filter");
        String field = mongoField(type, property);
        Criteria criteria = Criteria.where(field);
        if ("isEmpty".equals(operator)) {
            return new Criteria()
                    .orOperator(
                            Criteria.where(field).is(null),
                            Criteria.where(field).is(""));
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
        if (query.offset() < 0 || query.limit() < 1 || query.limit() > MAX_LIMIT)
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "offset must be non-negative and limit must be between 1 and " + MAX_LIMIT);
        if (!"asc".equalsIgnoreCase(query.sortDirection()) && !"desc".equalsIgnoreCase(query.sortDirection()))
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "sortDirection must be asc or desc");
        if (query.sortBy() != null
                && !query.sortBy().isBlank()
                && !type.primaryKey().equals(query.sortBy())) requireProperty(type, query.sortBy(), "sort");
    }

    private void requireProperty(ObjectTypeDTO type, String property, String kind) {
        if (!type.primaryKey().equals(property)
                && type.properties().stream().map(PropertyDTO::id).noneMatch(property::equals))
            throw new CelanWorksmithException(
                    "sort".equals(kind)
                            ? CelanWorksmithErrorCode.INVALID_ARGUMENT
                            : CelanWorksmithErrorCode.FILTER_INVALID,
                    "Unknown " + kind + " property: " + type.id() + "." + property);
    }

    private String mongoField(ObjectTypeDTO type, String property) {
        return type.primaryKey().equals(property) ? "_id" : "properties." + property;
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
