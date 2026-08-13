package com.celanworksmith.runtime.mock;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.runtime.dto.ObjectInstanceDTO;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.celanworksmith.runtime.dto.ObjectSetResult;
import com.fasterxml.jackson.databind.JsonNode;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

public class MockDataStore {
    private static final int MAX_LIMIT = 100;
    private final Map<String, Map<String, ObjectInstanceDTO>> objects = new ConcurrentHashMap<>();
    private final AtomicLong resetVersion = new AtomicLong();

    public MockDataStore() {
        this(true);
    }

    public MockDataStore(boolean seed) {
        reset(seed);
    }

    public synchronized void reset() {
        reset(true);
    }

    private synchronized void reset(boolean seed) {
        objects.clear();
        for (String typeId : List.of(
                "Supplier", "PurchaseOrder", "ProductionOrder", "DeliveryOrder", "FinancialRecord", "SupplierRating")) {
            objects.put(typeId, new LinkedHashMap<>());
        }

        if (!seed) {
            resetVersion.incrementAndGet();
            return;
        }

        for (int i = 1; i <= 10; i++) {
            String id = String.format("S%03d", i);
            put(
                    "Supplier",
                    id,
                    Map.of(
                            "name",
                            "Supplier " + i,
                            "contactName",
                            "Contact " + i,
                            "riskLevel",
                            i <= 3 ? "HIGH" : i <= 7 ? "MEDIUM" : "LOW",
                            "averageRating",
                            BigDecimal.valueOf(3.2 + (i % 5) * 0.3).setScale(2, RoundingMode.HALF_UP)));
        }

        for (int i = 1; i <= 200; i++) {
            String poId = String.format("PO%03d", i);
            String supplierId = String.format("S%03d", ((i - 1) % 10) + 1);
            boolean delayed = i % 5 == 0;
            int delayDays = delayed ? 3 + (i % 20) : 0;
            String status = delayed ? "DELAYED" : i % 3 == 0 ? "IN_PROGRESS" : "CONFIRMED";
            BigDecimal amount = BigDecimal.valueOf(10000L + i * 125L).setScale(2, RoundingMode.HALF_UP);
            String expectedDate = LocalDate.of(2026, 1, 1).plusDays(i).toString();
            String actualDate =
                    delayed ? LocalDate.parse(expectedDate).plusDays(delayDays).toString() : null;
            String productionId = String.format("PR%03d", i);
            String deliveryId = String.format("DO%03d", i);
            String financeId = String.format("FR%03d", i);
            Map<String, Object> po = new LinkedHashMap<>();
            po.put("supplierId", supplierId);
            po.put("status", status);
            po.put("orderDate", LocalDate.of(2025, 12, 1).plusDays(i % 30).toString());
            po.put("expectedDeliveryDate", expectedDate);
            po.put("actualDeliveryDate", actualDate);
            po.put("amount", amount);
            po.put("delayDays", delayDays);
            po.put("productionOrderId", productionId);
            po.put("deliveryOrderId", deliveryId);
            po.put("financialRecordId", financeId);
            put("PurchaseOrder", poId, po);

            put(
                    "ProductionOrder",
                    productionId,
                    Map.of(
                            "purchaseOrderId",
                            poId,
                            "status",
                            delayed ? "AT_RISK" : "PLANNED",
                            "scheduleDate",
                            LocalDate.parse(expectedDate).minusDays(7).toString(),
                            "quantity",
                            100 + i));
            Map<String, Object> delivery = new LinkedHashMap<>();
            delivery.put("purchaseOrderId", poId);
            delivery.put("status", delayed ? "LATE" : "PLANNED");
            delivery.put("plannedDate", expectedDate);
            delivery.put("deliveredDate", actualDate);
            put("DeliveryOrder", deliveryId, delivery);
            BigDecimal revenue = amount.multiply(BigDecimal.valueOf(1.25));
            BigDecimal cost = amount.multiply(BigDecimal.valueOf(0.8));
            put(
                    "FinancialRecord",
                    financeId,
                    new LinkedHashMap<>(Map.of(
                            "purchaseOrderId", poId,
                            "revenue", revenue.setScale(2, RoundingMode.HALF_UP),
                            "cost", cost.setScale(2, RoundingMode.HALF_UP),
                            "penalty", BigDecimal.ZERO.setScale(2),
                            "profit", revenue.subtract(cost).setScale(2, RoundingMode.HALF_UP))));
        }

        for (int i = 1; i <= 40; i++) {
            put(
                    "SupplierRating",
                    String.format("SR%03d", i),
                    Map.of(
                            "supplierId", String.format("S%03d", ((i - 1) % 10) + 1),
                            "rating", BigDecimal.valueOf(2.5 + (i % 6) * 0.5).setScale(1, RoundingMode.HALF_UP),
                            "reviewDate",
                                    LocalDate.of(2025, 6, 1).plusDays(i * 5L).toString()));
        }
        resetVersion.incrementAndGet();
    }

    public long resetVersion() {
        return resetVersion.get();
    }

    public synchronized ObjectSetResult query(String typeId, ObjectSetQuery query) {
        Map<String, ObjectInstanceDTO> typedObjects = requireType(typeId);
        ObjectSetQuery effective = query == null ? ObjectSetQuery.defaults() : query;
        validateQuery(effective, typeId, typedObjects);
        List<ObjectInstanceDTO> result = new ArrayList<>(typedObjects.values())
                .stream()
                        .filter(object -> matches(object, effective.filter(), typeId))
                        .filter(object -> matchesSearch(object, effective.searchText()))
                        .sorted(comparator(effective.sortBy(), effective.sortDirection()))
                        .toList();
        int from = Math.min(effective.offset(), result.size());
        int to = Math.min(from + effective.limit(), result.size());
        return new ObjectSetResult(typeId, result.subList(from, to), from, effective.limit(), result.size());
    }

    public synchronized ObjectInstanceDTO get(String typeId, String id) {
        ObjectInstanceDTO object = requireType(typeId).get(id);
        if (object == null) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.OBJECT_NOT_FOUND, "Unknown object: " + typeId + "/" + id);
        }
        return object;
    }

    public synchronized ObjectInstanceDTO update(String typeId, String id, Map<String, Object> changes) {
        ObjectInstanceDTO current = get(typeId, id);
        Map<String, Object> properties = new LinkedHashMap<>(current.properties());
        properties.putAll(changes);
        ObjectInstanceDTO updated = new ObjectInstanceDTO(current.id(), current.typeId(), properties);
        requireType(typeId).put(id, updated);
        return updated;
    }

    public synchronized ObjectSetResult linked(
            String sourceTypeId, String sourceId, String linkTypeId, ObjectSetQuery query) {
        ObjectInstanceDTO source = get(sourceTypeId, sourceId);
        String targetType;
        String referenceProperty;
        if (sourceTypeId.equals("Supplier") && linkTypeId.equals("supplier_orders")) {
            targetType = "PurchaseOrder";
            referenceProperty = "supplierId";
        } else if (sourceTypeId.equals("Supplier") && linkTypeId.equals("supplier_ratings")) {
            targetType = "SupplierRating";
            referenceProperty = "supplierId";
        } else if (sourceTypeId.equals("PurchaseOrder") && linkTypeId.equals("po_production")) {
            targetType = "ProductionOrder";
            referenceProperty = "purchaseOrderId";
        } else if (sourceTypeId.equals("PurchaseOrder") && linkTypeId.equals("po_delivery")) {
            targetType = "DeliveryOrder";
            referenceProperty = "purchaseOrderId";
        } else if (sourceTypeId.equals("PurchaseOrder") && linkTypeId.equals("po_finance")) {
            targetType = "FinancialRecord";
            referenceProperty = "purchaseOrderId";
        } else {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.LINK_TYPE_NOT_FOUND,
                    "Link type is not valid for source type: " + sourceTypeId + "/" + linkTypeId);
        }
        var filter = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
        filter.put(referenceProperty, source.id());
        ObjectSetQuery linkQuery = new ObjectSetQuery(
                filter,
                query == null ? null : query.sortBy(),
                query == null ? "asc" : query.sortDirection(),
                query == null ? 0 : query.offset(),
                query == null ? 50 : query.limit(),
                query == null ? null : query.searchText());
        return query(targetType, linkQuery);
    }

    private Map<String, ObjectInstanceDTO> requireType(String typeId) {
        Map<String, ObjectInstanceDTO> typedObjects = objects.get(typeId);
        if (typedObjects == null) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.OBJECT_TYPE_NOT_FOUND, "Unknown object type: " + typeId);
        }
        return typedObjects;
    }

    private void put(String typeId, String id, Map<String, Object> properties) {
        objects.get(typeId).put(id, new ObjectInstanceDTO(id, typeId, new LinkedHashMap<>(properties)));
    }

    private void validateQuery(ObjectSetQuery query, String typeId, Map<String, ObjectInstanceDTO> typedObjects) {
        if (query.offset() < 0 || query.limit() < 1 || query.limit() > MAX_LIMIT) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "offset must be non-negative and limit must be between 1 and 100");
        }
        if (!"asc".equalsIgnoreCase(query.sortDirection()) && !"desc".equalsIgnoreCase(query.sortDirection())) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "sortDirection must be asc or desc");
        }
        if (query.sortBy() != null
                && !query.sortBy().isBlank()
                && !"id".equals(query.sortBy())
                && typedObjects.values().stream()
                        .findFirst()
                        .map(object -> !object.properties().containsKey(query.sortBy()))
                        .orElse(false)) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "Unknown sort property: " + typeId + "." + query.sortBy());
        }
    }

    private boolean matches(ObjectInstanceDTO object, JsonNode filter, String typeId) {
        if (filter == null || filter.isNull()) return true;
        if (!filter.isObject())
            throw new CelanWorksmithException(CelanWorksmithErrorCode.FILTER_INVALID, "filter must be a JSON object");
        if (filter.has("typeId") || filter.has("conditions") || filter.has("version")) {
            return matchesStructuredFilter(object, filter, typeId);
        }
        for (var field : filter.properties()) {
            if (!object.properties().containsKey(field.getKey())) {
                throw new CelanWorksmithException(
                        CelanWorksmithErrorCode.FILTER_INVALID,
                        "Unknown filter property: " + typeId + "." + field.getKey());
            }
            if (!matchesCondition(object.properties().get(field.getKey()), field.getValue())) return false;
        }
        return true;
    }

    private boolean matchesSearch(ObjectInstanceDTO object, String searchText) {
        if (searchText == null || searchText.isBlank()) return true;
        String needle = searchText.trim().toLowerCase(java.util.Locale.ROOT);
        if (object.id().toLowerCase(java.util.Locale.ROOT).contains(needle)) return true;
        return object.properties().values().stream()
                .filter(java.util.Objects::nonNull)
                .map(String::valueOf)
                .anyMatch(value -> value.toLowerCase(java.util.Locale.ROOT).contains(needle));
    }

    private boolean matchesStructuredFilter(ObjectInstanceDTO object, JsonNode filter, String typeId) {
        if (!filter.has("typeId")
                || !typeId.equals(filter.path("typeId").asText())
                || filter.path("version").asInt() != 1
                || !filter.path("conditions").isArray()) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.FILTER_INVALID, "filter must be a version 1 object filter for " + typeId);
        }

        for (JsonNode condition : filter.path("conditions")) {
            if (!condition.isObject()) {
                throw new CelanWorksmithException(
                        CelanWorksmithErrorCode.FILTER_INVALID, "filter conditions must be JSON objects");
            }
            String propertyId = condition.path("propertyId").asText("");
            String operator = condition.path("operator").asText("");
            if (propertyId.isBlank()
                    || operator.isBlank()
                    || !object.properties().containsKey(propertyId)) {
                throw new CelanWorksmithException(
                        CelanWorksmithErrorCode.FILTER_INVALID,
                        "Unknown filter property: " + typeId + "." + propertyId);
            }
            if (!matchesStructuredCondition(object.properties().get(propertyId), condition, operator)) return false;
        }
        return true;
    }

    private boolean matchesStructuredCondition(Object actual, JsonNode condition, String operator) {
        if ("isEmpty".equals(operator)) return actual == null || actual instanceof String string && string.isEmpty();
        JsonNode value = condition.get("value");
        if (value == null) {
            throw new CelanWorksmithException(
                    CelanWorksmithErrorCode.FILTER_INVALID, "Filter value is required for operator: " + operator);
        }
        return switch (operator) {
            case "equals" -> equalValue(actual, value);
            case "contains" -> actual != null && String.valueOf(actual).contains(value.asText());
            case "startsWith" -> actual != null && String.valueOf(actual).startsWith(value.asText());
            case "gt" -> compareValue(actual, value) > 0;
            case "gte" -> compareValue(actual, value) >= 0;
            case "lt" -> compareValue(actual, value) < 0;
            case "lte" -> compareValue(actual, value) <= 0;
            default ->
                throw new CelanWorksmithException(
                        CelanWorksmithErrorCode.FILTER_INVALID, "Unsupported filter operator: " + operator);
        };
    }

    private boolean matchesCondition(Object actual, JsonNode condition) {
        if (!condition.isObject()) return equalValue(actual, condition);
        var iterator = condition.fields();
        while (iterator.hasNext()) {
            var entry = iterator.next();
            boolean matches =
                    switch (entry.getKey()) {
                        case "$eq" -> equalValue(actual, entry.getValue());
                        case "$ne" -> !equalValue(actual, entry.getValue());
                        case "$gt" -> compareValue(actual, entry.getValue()) > 0;
                        case "$gte" -> compareValue(actual, entry.getValue()) >= 0;
                        case "$lt" -> compareValue(actual, entry.getValue()) < 0;
                        case "$lte" -> compareValue(actual, entry.getValue()) <= 0;
                        case "$in" ->
                            entry.getValue().isArray()
                                    && java.util.stream.StreamSupport.stream(
                                                    entry.getValue().spliterator(), false)
                                            .anyMatch(value -> equalValue(actual, value));
                        default ->
                            throw new CelanWorksmithException(
                                    CelanWorksmithErrorCode.FILTER_INVALID,
                                    "Unsupported filter operator: " + entry.getKey());
                    };
            if (!matches) return false;
        }
        return true;
    }

    private boolean equalValue(Object actual, JsonNode expected) {
        if (actual == null) return expected.isNull();
        if (actual instanceof Number) return new BigDecimal(actual.toString()).compareTo(expected.decimalValue()) == 0;
        return String.valueOf(actual).equals(expected.asText());
    }

    private int compareValue(Object actual, JsonNode expected) {
        if (actual instanceof Number) return new BigDecimal(actual.toString()).compareTo(expected.decimalValue());
        return String.valueOf(actual).compareTo(expected.asText());
    }

    private Comparator<ObjectInstanceDTO> comparator(String sortBy, String direction) {
        if (sortBy == null || sortBy.isBlank()) return Comparator.comparing(ObjectInstanceDTO::id);
        Comparator<ObjectInstanceDTO> comparator = (left, right) -> {
            Object leftValue = left.properties().get(sortBy);
            Object rightValue = right.properties().get(sortBy);
            if (leftValue == null && rightValue == null) return 0;
            if (leftValue == null) return -1;
            if (rightValue == null) return 1;
            if (leftValue instanceof Number && rightValue instanceof Number) {
                return new BigDecimal(leftValue.toString()).compareTo(new BigDecimal(rightValue.toString()));
            }
            return String.valueOf(leftValue).compareTo(String.valueOf(rightValue));
        };
        return "desc".equalsIgnoreCase(direction) ? comparator.reversed() : comparator;
    }
}
