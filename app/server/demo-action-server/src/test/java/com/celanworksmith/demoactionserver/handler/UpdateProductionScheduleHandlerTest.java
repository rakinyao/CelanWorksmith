package com.celanworksmith.demoactionserver.handler;

import com.celanworksmith.demoactionserver.api.ActionExecutionService.DeclaredDomainException;
import com.celanworksmith.demoactionserver.runtime.DemoRuntimeObjectDocument;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedObject;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedProperty;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import com.celanworksmith.ontology.datasource.OntologyObjectSet;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UpdateProductionScheduleHandlerTest {
    private final ReactiveMongoTemplate template = mock(ReactiveMongoTemplate.class);
    private final UpdateProductionScheduleHandler handler = new UpdateProductionScheduleHandler(template);

    @Test
    void updatesReferencedProductionOrderAndReportsChangedProperties() {
        when(template.findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Mono.just(purchaseOrder("PO001", "PR001")));
        when(template.findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("production_orders")))
                .thenReturn(Mono.just(productionOrder("PR001", "2026-09-01T00:00:00Z", "RESCHEDULED")));

        StepVerifier.create(handler.execute(request("PO001", "2026-09-01T00:00:00Z"), "audit-1"))
                .assertNext(result -> {
                    assertThat(result.outcomes()).hasSize(1);
                    assertThat(result.outcomes().getFirst().target())
                            .isEqualTo(new ChangedObject("PurchaseOrder", "PO001"));
                    assertThat(result.outcomes().getFirst().changedObjects())
                            .containsExactly(new ChangedObject("ProductionOrder", "PR001"));
                    assertThat(result.outcomes().getFirst().changedProperties())
                            .containsExactly(
                                    new ChangedProperty(
                                            "ProductionOrder", "PR001", "scheduleDate", "2026-09-01T00:00:00Z"),
                                    new ChangedProperty("ProductionOrder", "PR001", "status", "RESCHEDULED"));
                })
                .verifyComplete();

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(template)
                .findAndModify(
                        queryCaptor.capture(),
                        updateCaptor.capture(),
                        any(),
                        eq(DemoRuntimeObjectDocument.class),
                        eq("production_orders"));
        assertThat(queryCaptor.getValue().getQueryObject().getString("_id")).isEqualTo("PR001");
        Document set = (Document) updateCaptor.getValue().getUpdateObject().get("$set");
        assertThat(set)
                .containsEntry("properties.scheduleDate", "2026-09-01T00:00:00Z")
                .containsEntry("properties.status", "RESCHEDULED");
    }

    @Test
    void unknownActionRegistryLookupEmitsDomainFailure() {
        DemoActionHandlerRegistry registry = new DemoActionHandlerRegistry(List.of(handler));

        StepVerifier.create(registry.resolve("UnknownAction", "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "UNKNOWN_ACTION"))
                .verify();
    }

    @Test
    void rejectsWrongTargetTypeWithoutWriting() {
        StepVerifier.create(handler.execute(
                        request("PO001", "2026-09-01T00:00:00Z", "Supplier", "UpdateProductionSchedule"), "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "INVALID_ACTION_REQUEST"))
                .verify();

        verify(template, never())
                .findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("production_orders"));
    }

    @Test
    void rejectsMissingNewScheduleDateWithoutWriting() {
        StepVerifier.create(handler.execute(request("PO001", null), "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "INVALID_ACTION_REQUEST"))
                .verify();

        verify(template, never())
                .findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("production_orders"));
    }

    @Test
    void rejectsBlankNewScheduleDateWithoutWriting() {
        StepVerifier.create(handler.execute(request("PO001", " "), "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "INVALID_ACTION_REQUEST"))
                .verify();

        verify(template, never())
                .findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("production_orders"));
    }

    @Test
    void rejectsNewScheduleDateWithoutIso8601OffsetTimeBeforeWriting() {
        when(template.findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Mono.just(purchaseOrder("PO001", "PR001")));
        when(template.findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("production_orders")))
                .thenReturn(Mono.just(productionOrder("PR001", "2026-09-01", "RESCHEDULED")));

        StepVerifier.create(handler.execute(request("PO001", "2026-09-01"), "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "INVALID_ACTION_REQUEST"))
                .verify();

        verify(template, never())
                .findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("production_orders"));
    }

    @Test
    void reportsMissingPurchaseOrderWithoutWriting() {
        when(template.findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Mono.empty());

        StepVerifier.create(handler.execute(request("PO001", "2026-09-01T00:00:00Z"), "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "TARGET_NOT_FOUND"))
                .verify();

        verify(template, never())
                .findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("production_orders"));
    }

    @Test
    void reportsMissingProductionOrderReferenceWithoutWriting() {
        when(template.findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Mono.just(new DemoRuntimeObjectDocument("PO001", "PurchaseOrder", Map.of())));

        StepVerifier.create(handler.execute(request("PO001", "2026-09-01T00:00:00Z"), "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "RELATED_OBJECT_NOT_FOUND"))
                .verify();

        verify(template, never())
                .findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("production_orders"));
    }

    @Test
    void reportsMissingProductionOrderWithoutWriting() {
        when(template.findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Mono.just(purchaseOrder("PO001", "PR001")));
        when(template.findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("production_orders")))
                .thenReturn(Mono.empty());

        StepVerifier.create(handler.execute(request("PO001", "2026-09-01T00:00:00Z"), "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "RELATED_OBJECT_NOT_FOUND"))
                .verify();
    }

    private static void assertDomainFailure(Throwable error, String expectedCode) {
        assertThat(error).isInstanceOf(DeclaredDomainException.class);
        assertThat(((DeclaredDomainException) error).failure().code()).isEqualTo(expectedCode);
    }

    private static ExecuteRequest request(String objectId, String newScheduleDate) {
        return request(objectId, newScheduleDate, "PurchaseOrder", "UpdateProductionSchedule");
    }

    private static ExecuteRequest request(
            String objectId, String newScheduleDate, String objectTypeId, String actionId) {
        Map<String, Object> parameters =
                newScheduleDate == null ? Map.of() : Map.of("newScheduleDate", newScheduleDate);
        return new ExecuteRequest(
                "v1",
                "workspace-1",
                "project-1",
                "1.0.0",
                "datasource-1",
                actionId,
                new OntologyObjectSet(objectTypeId, List.of(objectId)),
                false,
                parameters,
                Map.of(),
                "key-1");
    }

    private static DemoRuntimeObjectDocument purchaseOrder(String id, String productionOrderId) {
        return new DemoRuntimeObjectDocument(id, "PurchaseOrder", Map.of("productionOrderId", productionOrderId));
    }

    private static DemoRuntimeObjectDocument productionOrder(String id, String scheduleDate, String status) {
        return new DemoRuntimeObjectDocument(
                id, "ProductionOrder", Map.of("scheduleDate", scheduleDate, "status", status));
    }
}
