package com.celanworksmith.runtime.adapter.mock;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.runtime.dto.ActionExecutionRequest;
import com.celanworksmith.runtime.dto.ActionResult;
import com.celanworksmith.runtime.dto.FunctionExecutionRequest;
import com.celanworksmith.runtime.dto.ObjectInstanceDTO;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.celanworksmith.runtime.dto.ObjectSetResult;
import com.celanworksmith.runtime.dto.ReasoningRequest;
import com.celanworksmith.runtime.dto.ReasoningResult;
import com.celanworksmith.runtime.mock.MockDataStore;
import com.celanworksmith.runtime.port.RuntimeProvider;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class MockRuntimeProvider implements RuntimeProvider {
    private final MockDataStore dataStore;

    public MockRuntimeProvider(MockDataStore dataStore) {
        this.dataStore = dataStore;
    }

    @Override
    public Mono<ObjectSetResult> queryObjects(String typeId, ObjectSetQuery query) {
        return Mono.fromSupplier(() -> dataStore.query(typeId, query));
    }

    @Override
    public Mono<ObjectInstanceDTO> getObject(String typeId, String instanceId) {
        return Mono.fromSupplier(() -> dataStore.get(typeId, instanceId));
    }

    @Override
    public Mono<ObjectSetResult> getLinks(String typeId, String instanceId, String linkTypeId, ObjectSetQuery query) {
        return Mono.fromSupplier(() -> dataStore.linked(typeId, instanceId, linkTypeId, query));
    }

    @Override
    public Mono<ActionResult> executeAction(String actionId, ActionExecutionRequest request) {
        return Mono.fromSupplier(() -> executeActionSync(actionId, request));
    }

    @Override
    public Mono<Object> executeFunction(String functionId, FunctionExecutionRequest request) {
        return Mono.fromSupplier(() -> executeFunctionSync(functionId, request));
    }

    @Override
    public Mono<ReasoningResult> reason(ReasoningRequest request) {
        return Mono.fromSupplier(() -> reasonSync(request));
    }

    private ActionResult executeActionSync(String actionId, ActionExecutionRequest request) {
        requireRequest(request);
        if (!"PurchaseOrder".equals(request.objectTypeId())) {
            throw new CelanWorksmithException(CelanWorksmithErrorCode.INVALID_ARGUMENT, "Mock actions require a PurchaseOrder object");
        }
        ObjectInstanceDTO purchaseOrder = dataStore.get("PurchaseOrder", request.objectId());
        Map<String, Object> parameters = request.parameters() == null ? Collections.emptyMap() : request.parameters();
        List<ObjectInstanceDTO> changed = new ArrayList<>();
        List<Map<String, Object>> sideEffects = new ArrayList<>();
        switch (actionId) {
            case "UpdateProductionSchedule" -> {
                String newDate = requiredString(parameters, "newScheduleDate");
                String productionId = requiredString(purchaseOrder.properties(), "productionOrderId");
                changed.add(dataStore.update("ProductionOrder", productionId, Map.of("scheduleDate", newDate, "status", "RESCHEDULED")));
            }
            case "UpdateDeliveryDate" -> {
                String newDate = requiredString(parameters, "newDeliveryDate");
                String deliveryId = requiredString(purchaseOrder.properties(), "deliveryOrderId");
                changed.add(dataStore.update("DeliveryOrder", deliveryId, Map.of("plannedDate", newDate, "status", "RESCHEDULED")));
            }
            case "UpdateFinancialRecord" -> {
                String financeId = requiredString(purchaseOrder.properties(), "financialRecordId");
                BigDecimal penalty = decimal(parameters.getOrDefault("penalty", calculatePenalty(purchaseOrder)));
                ObjectInstanceDTO financialRecord = dataStore.get("FinancialRecord", financeId);
                BigDecimal revenue = decimal(financialRecord.properties().get("revenue"));
                BigDecimal cost = decimal(financialRecord.properties().get("cost"));
                changed.add(dataStore.update("FinancialRecord", financeId, Map.of(
                        "penalty", penalty, "profit", revenue.subtract(cost).subtract(penalty).setScale(2, RoundingMode.HALF_UP))));
            }
            case "NotifyProductionTeam" -> {
                String message = requiredString(parameters, "message");
                sideEffects.add(Map.of("type", "NOTIFICATION", "recipient", "production-team", "message", message));
            }
            default -> throw new CelanWorksmithException(CelanWorksmithErrorCode.ACTION_NOT_FOUND, "Unknown action: " + actionId);
        }
        return new ActionResult(true, "Action executed", UUID.randomUUID().toString(), List.copyOf(changed), List.copyOf(sideEffects));
    }

    private Object executeFunctionSync(String functionId, FunctionExecutionRequest request) {
        Map<String, Object> parameters = request == null || request.parameters() == null
                ? Collections.emptyMap() : request.parameters();
        return switch (functionId) {
            case "CalculateDelayDays" -> calculateDelayDays(dataStore.get("PurchaseOrder", requiredString(parameters, "poId")));
            case "CalculatePenalty" -> calculatePenalty(dataStore.get("PurchaseOrder", requiredString(parameters, "poId")));
            case "CalculateAdjustedProfit" -> calculateAdjustedProfit(dataStore.get("PurchaseOrder", requiredString(parameters, "poId")));
            case "CalculateMarginRate" -> calculateMarginRate(dataStore.get("PurchaseOrder", requiredString(parameters, "poId")));
            case "CalculateSupplierGrade" -> calculateSupplierGrade(requiredString(parameters, "supplierId"));
            default -> throw new CelanWorksmithException(CelanWorksmithErrorCode.FUNCTION_NOT_FOUND, "Unknown function: " + functionId);
        };
    }

    private ReasoningResult reasonSync(ReasoningRequest request) {
        requireReasoningRequest(request);
        ObjectInstanceDTO object = dataStore.get(request.objectTypeId(), request.objectId());
        String answer;
        List<String> evidence = new ArrayList<>();
        if ("PurchaseOrder".equals(request.objectTypeId())) {
            int delayDays = calculateDelayDays(object);
            answer = delayDays > 0
                    ? "Purchase order " + object.id() + " is delayed by " + delayDays + " days and requires schedule review."
                    : "Purchase order " + object.id() + " is currently on schedule.";
            evidence.add("status=" + object.properties().get("status"));
            evidence.add("delayDays=" + delayDays);
            evidence.add("supplierId=" + object.properties().get("supplierId"));
        } else {
            answer = "Mock reasoning completed for " + object.typeId() + "/" + object.id() + ".";
            evidence.add("objectType=" + object.typeId());
        }
        return new ReasoningResult(answer, List.copyOf(evidence), 0.92, 0, false);
    }

    private int calculateDelayDays(ObjectInstanceDTO purchaseOrder) {
        return Integer.parseInt(String.valueOf(purchaseOrder.properties().getOrDefault("delayDays", 0)));
    }

    private BigDecimal calculatePenalty(ObjectInstanceDTO purchaseOrder) {
        return decimal(purchaseOrder.properties().get("amount"))
                .multiply(BigDecimal.valueOf(calculateDelayDays(purchaseOrder)))
                .multiply(BigDecimal.valueOf(0.01))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateAdjustedProfit(ObjectInstanceDTO purchaseOrder) {
        String financeId = requiredString(purchaseOrder.properties(), "financialRecordId");
        ObjectInstanceDTO finance = dataStore.get("FinancialRecord", financeId);
        return decimal(finance.properties().get("revenue"))
                .subtract(decimal(finance.properties().get("cost")))
                .subtract(calculatePenalty(purchaseOrder))
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateMarginRate(ObjectInstanceDTO purchaseOrder) {
        String financeId = requiredString(purchaseOrder.properties(), "financialRecordId");
        ObjectInstanceDTO finance = dataStore.get("FinancialRecord", financeId);
        BigDecimal revenue = decimal(finance.properties().get("revenue"));
        if (revenue.compareTo(BigDecimal.ZERO) == 0) return BigDecimal.ZERO.setScale(4);
        return calculateAdjustedProfit(purchaseOrder).divide(revenue, 4, RoundingMode.HALF_UP);
    }

    private BigDecimal calculateSupplierGrade(String supplierId) {
        ObjectSetResult ratings = dataStore.query("SupplierRating", ObjectSetQuery.defaults());
        List<ObjectInstanceDTO> supplierRatings = ratings.items().stream()
                .filter(rating -> supplierId.equals(rating.properties().get("supplierId")))
                .toList();
        if (supplierRatings.isEmpty()) return BigDecimal.ZERO.setScale(2);
        BigDecimal total = supplierRatings.stream()
                .map(rating -> decimal(rating.properties().get("rating")))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        return total.divide(BigDecimal.valueOf(supplierRatings.size()), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal decimal(Object value) {
        if (value == null) throw new CelanWorksmithException(CelanWorksmithErrorCode.INVALID_ARGUMENT, "Expected a numeric value");
        return new BigDecimal(String.valueOf(value));
    }

    private String requiredString(Map<String, Object> values, String key) {
        Object value = values.get(key);
        if (value == null || String.valueOf(value).isBlank()) {
            throw new CelanWorksmithException(CelanWorksmithErrorCode.INVALID_ARGUMENT, "Missing required parameter: " + key);
        }
        return String.valueOf(value);
    }

    private void requireRequest(ActionExecutionRequest request) {
        if (request == null || request.objectTypeId() == null || request.objectId() == null) {
            throw new CelanWorksmithException(CelanWorksmithErrorCode.INVALID_ARGUMENT, "objectTypeId and objectId are required");
        }
    }

    private void requireReasoningRequest(ReasoningRequest request) {
        if (request == null || request.objectTypeId() == null || request.objectId() == null || request.question() == null || request.question().isBlank()) {
            throw new CelanWorksmithException(CelanWorksmithErrorCode.INVALID_ARGUMENT, "objectTypeId, objectId and question are required");
        }
    }
}
