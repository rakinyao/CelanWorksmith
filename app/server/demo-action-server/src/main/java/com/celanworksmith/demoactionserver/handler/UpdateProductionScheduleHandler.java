package com.celanworksmith.demoactionserver.handler;

import com.celanworksmith.demoactionserver.api.ActionExecutionService.DeclaredDomainException;
import com.celanworksmith.demoactionserver.runtime.DemoRuntimeObjectDocument;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedObject;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedProperty;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.DomainFailure;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteSuccess;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.data.mongodb.core.query.UpdateDefinition;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.List;

@Component
public class UpdateProductionScheduleHandler implements DemoActionHandler {
    private static final String ACTION_ID = "UpdateProductionSchedule";
    private static final String TARGET_OBJECT_TYPE = "PurchaseOrder";
    private static final String PURCHASE_ORDERS = "purchase_orders";
    private static final String PRODUCTION_ORDERS = "production_orders";

    private final ReactiveMongoTemplate mongoTemplate;

    public UpdateProductionScheduleHandler(ReactiveMongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public String actionId() {
        return ACTION_ID;
    }

    @Override
    public Mono<ExecuteSuccess> execute(ExecuteRequest request, String auditId) {
        if (!ACTION_ID.equals(request.actionId())) {
            return invalidRequest(auditId, "Action must be UpdateProductionSchedule.");
        }
        if (!TARGET_OBJECT_TYPE.equals(request.objectTypeId())) {
            return invalidRequest(auditId, "UpdateProductionSchedule requires a PurchaseOrder target.");
        }
        String newScheduleDate = requiredNonBlankParameter(request, "newScheduleDate");
        if (newScheduleDate == null) {
            return invalidRequest(auditId, "newScheduleDate must be provided.");
        }
        if (!isIso8601OffsetDateTime(newScheduleDate)) {
            return invalidRequest(auditId, "newScheduleDate must be an ISO-8601 offset date-time.");
        }

        return mongoTemplate
                .findOne(
                        Query.query(Criteria.where("_id").is(request.objectId())),
                        DemoRuntimeObjectDocument.class,
                        PURCHASE_ORDERS)
                .switchIfEmpty(domainFailure(
                        auditId, "TARGET_NOT_FOUND", "PurchaseOrder " + request.objectId() + " was not found."))
                .flatMap(purchaseOrder -> updateReferencedProductionOrder(purchaseOrder, newScheduleDate, auditId))
                .map(productionOrderId -> new ExecuteSuccess(
                        OntologyActionServerProtocol.V1,
                        auditId,
                        "SUCCEEDED",
                        "Production schedule updated.",
                        List.of(new ChangedObject("ProductionOrder", productionOrderId)),
                        List.of(
                                new ChangedProperty(
                                        "ProductionOrder", productionOrderId, "scheduleDate", newScheduleDate),
                                new ChangedProperty("ProductionOrder", productionOrderId, "status", "RESCHEDULED"))));
    }

    private Mono<String> updateReferencedProductionOrder(
            DemoRuntimeObjectDocument purchaseOrder, String newScheduleDate, String auditId) {
        String productionOrderId = requiredNonBlankProperty(purchaseOrder, "productionOrderId");
        if (productionOrderId == null) {
            return domainFailure(
                    auditId, "RELATED_OBJECT_NOT_FOUND", "PurchaseOrder does not reference a ProductionOrder.");
        }

        Query query = Query.query(Criteria.where("_id").is(productionOrderId));
        UpdateDefinition update =
                new Update().set("properties.scheduleDate", newScheduleDate).set("properties.status", "RESCHEDULED");
        return mongoTemplate
                .findAndModify(
                        query,
                        update,
                        FindAndModifyOptions.options().returnNew(true),
                        DemoRuntimeObjectDocument.class,
                        PRODUCTION_ORDERS)
                .switchIfEmpty(domainFailure(
                        auditId,
                        "RELATED_OBJECT_NOT_FOUND",
                        "ProductionOrder " + productionOrderId + " was not found."))
                .thenReturn(productionOrderId);
    }

    private static String requiredNonBlankParameter(ExecuteRequest request, String name) {
        Object value = request.parameters().get(name);
        return value instanceof String string && !string.isBlank() ? string : null;
    }

    private static boolean isIso8601OffsetDateTime(String value) {
        try {
            OffsetDateTime.parse(value, DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            return true;
        } catch (DateTimeParseException exception) {
            return false;
        }
    }

    private static String requiredNonBlankProperty(DemoRuntimeObjectDocument object, String name) {
        Object value = object.getProperties().get(name);
        return value instanceof String string && !string.isBlank() ? string : null;
    }

    private static <T> Mono<T> invalidRequest(String auditId, String message) {
        return domainFailure(auditId, "INVALID_ACTION_REQUEST", message);
    }

    private static <T> Mono<T> domainFailure(String auditId, String code, String message) {
        return Mono.error(new DeclaredDomainException(
                new DomainFailure(OntologyActionServerProtocol.V1, auditId, code, message)));
    }
}
