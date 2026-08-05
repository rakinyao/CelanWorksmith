package com.celanworksmith.runtime;

import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.ontology.adapter.mock.MockOntologyProvider;
import com.celanworksmith.runtime.adapter.mock.MockRuntimeProvider;
import com.celanworksmith.runtime.dto.ActionExecutionRequest;
import com.celanworksmith.runtime.dto.ActionResult;
import com.celanworksmith.runtime.dto.FunctionExecutionRequest;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.celanworksmith.runtime.dto.ObjectSetResult;
import com.celanworksmith.runtime.dto.ReasoningRequest;
import com.celanworksmith.runtime.mock.MockDataStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MockRuntimeProviderTest {
    private MockDataStore dataStore;
    private MockRuntimeProvider runtimeProvider;

    @BeforeEach
    void setUp() {
        dataStore = new MockDataStore();
        runtimeProvider = new MockRuntimeProvider(dataStore);
    }

    @Test
    void fixtureHasExpectedCountsAndRelationships() {
        assertEquals(10, dataStore.query("Supplier", ObjectSetQuery.defaults()).total());
        assertEquals(200, dataStore.query("PurchaseOrder", ObjectSetQuery.defaults()).total());
        assertEquals(200, dataStore.query("ProductionOrder", ObjectSetQuery.defaults()).total());
        assertEquals(200, dataStore.query("DeliveryOrder", ObjectSetQuery.defaults()).total());
        assertEquals(200, dataStore.query("FinancialRecord", ObjectSetQuery.defaults()).total());
        assertEquals(40, dataStore.query("SupplierRating", ObjectSetQuery.defaults()).total());
        assertEquals(20, dataStore.linked("Supplier", "S001", "supplier_orders", ObjectSetQuery.defaults()).total());
        assertEquals(4, dataStore.linked("Supplier", "S001", "supplier_ratings", ObjectSetQuery.defaults()).total());
    }

    @Test
    void delayedFilterAndPaginationAreDeterministic() {
        var filter = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
        filter.put("status", "DELAYED");
        ObjectSetResult result = dataStore.query("PurchaseOrder", new ObjectSetQuery(filter, "id", "asc", 0, 10));
        assertEquals(40, result.total());
        assertEquals(10, result.items().size());
        assertEquals("PO005", result.items().getFirst().id());
        assertEquals("PO050", dataStore.query("PurchaseOrder", new ObjectSetQuery(filter, "id", "asc", 9, 1)).items().getFirst().id());
    }

    @Test
    void functionsCalculateSupplyChainMetrics() {
        assertEquals(8, runtimeProvider.executeFunction("CalculateDelayDays", new FunctionExecutionRequest(Map.of("poId", "PO005"))).block());
        assertEquals(new BigDecimal("850.00"), runtimeProvider.executeFunction("CalculatePenalty", new FunctionExecutionRequest(Map.of("poId", "PO005"))).block());
        assertEquals(new BigDecimal("3931.25"), runtimeProvider.executeFunction("CalculateAdjustedProfit", new FunctionExecutionRequest(Map.of("poId", "PO005"))).block());
        assertEquals(new BigDecimal("0.2960"), runtimeProvider.executeFunction("CalculateMarginRate", new FunctionExecutionRequest(Map.of("poId", "PO005"))).block());
        assertEquals(new BigDecimal("3.75"), runtimeProvider.executeFunction("CalculateSupplierGrade", new FunctionExecutionRequest(Map.of("supplierId", "S001"))).block());
    }

    @Test
    void actionsUpdateOnlyExpectedObjects() {
        ActionResult result = runtimeProvider.executeAction(
                        "UpdateProductionSchedule",
                        new ActionExecutionRequest("PurchaseOrder", "PO005", Map.of("newScheduleDate", "2026-03-01")))
                .block();
        assertNotNull(result);
        assertTrue(result.success());
        assertEquals("2026-03-01", dataStore.get("ProductionOrder", "PR005").properties().get("scheduleDate"));
        assertEquals("2026-01-06", dataStore.get("PurchaseOrder", "PO005").properties().get("expectedDeliveryDate"));

        runtimeProvider.executeAction(
                        "UpdateFinancialRecord",
                        new ActionExecutionRequest("PurchaseOrder", "PO005", Map.of("penalty", new BigDecimal("850.00"))))
                .block();
        assertEquals(new BigDecimal("850.00"), dataStore.get("FinancialRecord", "FR005").properties().get("penalty"));
    }

    @Test
    void actionsKeepServerValidationAndExposeCompleteResults() {
        ActionResult notification = runtimeProvider.executeAction(
                        "NotifyProductionTeam",
                        new ActionExecutionRequest("PurchaseOrder", "PO005", Map.of("message", "Reschedule required")))
                .block();

        assertNotNull(notification);
        assertTrue(notification.success());
        assertNotNull(notification.executionId());
        assertTrue(notification.changedObjects().isEmpty());
        assertEquals("NOTIFICATION", notification.sideEffects().getFirst().get("type"));

        assertThrows(CelanWorksmithException.class, () -> runtimeProvider.executeAction(
                        "UpdateProductionSchedule",
                        new ActionExecutionRequest("PurchaseOrder", null, Map.of("newScheduleDate", "2026-03-15")))
                .block());
        assertThrows(CelanWorksmithException.class, () -> runtimeProvider.executeAction(
                        "UpdateProductionSchedule",
                        new ActionExecutionRequest("PurchaseOrder", "PO005", Map.of()))
                .block());
        assertThrows(CelanWorksmithException.class, () -> runtimeProvider.executeAction(
                        "UpdateProductionSchedule",
                        new ActionExecutionRequest("Supplier", "S001", Map.of("newScheduleDate", "2026-03-15")))
                .block());
        assertThrows(CelanWorksmithException.class, () -> runtimeProvider.executeAction(
                        "UnknownAction",
                        new ActionExecutionRequest("PurchaseOrder", "PO005", Map.of()))
                .block());
    }

    @Test
    void reasoningReturnsEvidenceAndInvalidInputsAreRejected() {
        var reasoning = runtimeProvider.reason(new ReasoningRequest("PurchaseOrder", "PO005", "Why is this late?")).block();
        assertNotNull(reasoning);
        assertTrue(reasoning.answer().contains("PO005"));
        assertEquals(3, reasoning.evidence().size());
        assertThrows(CelanWorksmithException.class, () -> dataStore.query(
                "PurchaseOrder", new ObjectSetQuery(null, "unknown", "asc", 0, 10)));
        assertThrows(CelanWorksmithException.class, () -> dataStore.linked(
                "Supplier", "S001", "po_finance", ObjectSetQuery.defaults()));
        assertThrows(CelanWorksmithException.class, () -> new MockOntologyProvider().getLinkTypes("UnknownType").block());
    }

    @Test
    void ontologyExposesRequiredMetadata() {
        var ontology = new MockOntologyProvider();
        assertEquals(6, ontology.getObjectTypes().block().size());
        assertEquals(3, ontology.getLinkTypes("PurchaseOrder").block().size());
        assertEquals(5, ontology.getFunctions().block().size());
        assertEquals(4, ontology.getActions("PurchaseOrder").block().size());
    }
}
