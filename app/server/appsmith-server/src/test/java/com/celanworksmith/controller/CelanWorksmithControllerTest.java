package com.celanworksmith.controller;

import com.celanworksmith.CelanWorksmithExceptionHandler;
import com.celanworksmith.ontology.adapter.mock.MockOntologyProvider;
import com.celanworksmith.ontology.controller.OntologyController;
import com.celanworksmith.runtime.adapter.mock.MockRuntimeProvider;
import com.celanworksmith.runtime.controller.RuntimeController;
import com.celanworksmith.runtime.mock.MockDataStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.reactive.server.WebTestClient;

import java.net.URI;
import java.util.Map;

class CelanWorksmithControllerTest {
    private WebTestClient client;

    @BeforeEach
    void setUp() {
        MockRuntimeProvider runtimeProvider = new MockRuntimeProvider(new MockDataStore());
        client = WebTestClient.bindToController(
                        new OntologyController(new MockOntologyProvider()),
                        new RuntimeController(runtimeProvider, new ObjectMapper()))
                .controllerAdvice(new CelanWorksmithExceptionHandler())
                .build();
    }

    @Test
    void exposesOntologyAndRuntimeData() {
        client.get()
                .uri("/api/v1/celanworksmith/ontology/object-types")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data.length()")
                .isEqualTo(6);

        client.get()
                .uri(
                        URI.create(
                                "/api/v1/celanworksmith/runtime/objects/PurchaseOrder?filter=%7B%22status%22%3A%22DELAYED%22%7D&limit=2"))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data.total")
                .isEqualTo(40)
                .jsonPath("$.data.items.length()")
                .isEqualTo(2);

        client.get()
                .uri(
                        URI.create(
                                "/api/v1/celanworksmith/runtime/objects/PurchaseOrder?filter=%7B%22typeId%22%3A%22PurchaseOrder%22%2C%22conditions%22%3A%5B%7B%22propertyId%22%3A%22delayDays%22%2C%22operator%22%3A%22gt%22%2C%22value%22%3A0%7D%5D%2C%22version%22%3A1%7D&limit=100"))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data.total")
                .isEqualTo(40)
                .jsonPath("$.data.items.length()")
                .isEqualTo(40);
    }

    @Test
    void executesFunctionAndReturnsStructuredErrors() {
        client.post()
                .uri("/api/v1/celanworksmith/runtime/functions/CalculateDelayDays/execute")
                .bodyValue(Map.of("parameters", Map.of("poId", "PO005")))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data")
                .isEqualTo(8);

        client.get()
                .uri("/api/v1/celanworksmith/runtime/objects/UnknownType")
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OBJECT_TYPE_NOT_FOUND");
    }

    @Test
    void preservesFunctionErrorContract() {
        client.post()
                .uri("/api/v1/celanworksmith/runtime/functions/UnknownFunction/execute")
                .bodyValue(Map.of("parameters", Map.of()))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("FUNCTION_NOT_FOUND")
                .jsonPath("$.message")
                .isEqualTo("Unknown function: UnknownFunction");

        client.post()
                .uri("/api/v1/celanworksmith/runtime/functions/CalculateDelayDays/execute")
                .bodyValue(Map.of("parameters", Map.of()))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVALID_ARGUMENT")
                .jsonPath("$.message")
                .isEqualTo("Missing required parameter: poId");
    }

    @Test
    void preservesActionSuccessAndErrorContract() {
        client.post()
                .uri("/api/v1/celanworksmith/runtime/actions/UpdateProductionSchedule/execute")
                .bodyValue(Map.of(
                        "objectTypeId", "PurchaseOrder",
                        "objectId", "PO005",
                        "parameters", Map.of("newScheduleDate", "2026-03-15")))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.responseMeta.status")
                .isEqualTo(200)
                .jsonPath("$.responseMeta.success")
                .isEqualTo(true)
                .jsonPath("$.data.success")
                .isEqualTo(true)
                .jsonPath("$.data.executionId")
                .isNotEmpty()
                .jsonPath("$.data.changedObjects[0].typeId")
                .isEqualTo("ProductionOrder")
                .jsonPath("$.data.changedProperties[0].typeId")
                .isEqualTo("ProductionOrder")
                .jsonPath("$.data.changedProperties[0].objectId")
                .isEqualTo("PR005")
                .jsonPath("$.data.changedProperties[0].propertyId")
                .isEqualTo("scheduleDate")
                .jsonPath("$.data.changedProperties[0].value")
                .isEqualTo("2026-03-15")
                .jsonPath("$.data.links")
                .isEmpty();

        client.post()
                .uri("/api/v1/celanworksmith/runtime/actions/UnknownAction/execute")
                .bodyValue(Map.of(
                        "objectTypeId", "PurchaseOrder",
                        "objectId", "PO005",
                        "parameters", Map.of()))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ACTION_NOT_FOUND")
                .jsonPath("$.message")
                .isEqualTo("Unknown action: UnknownAction");

        client.post()
                .uri("/api/v1/celanworksmith/runtime/actions/UpdateProductionSchedule/execute")
                .bodyValue(Map.of(
                        "objectTypeId", "PurchaseOrder",
                        "objectId", "PO999",
                        "parameters", Map.of("newScheduleDate", "2026-03-15")))
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("OBJECT_NOT_FOUND");

        client.post()
                .uri("/api/v1/celanworksmith/runtime/actions/UpdateProductionSchedule/execute")
                .bodyValue(Map.of(
                        "objectTypeId", "Supplier",
                        "objectId", "S001",
                        "parameters", Map.of("newScheduleDate", "2026-03-15")))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVALID_ARGUMENT")
                .jsonPath("$.message")
                .isEqualTo("Mock actions require a PurchaseOrder object");

        client.post()
                .uri("/api/v1/celanworksmith/runtime/actions/UpdateProductionSchedule/execute")
                .bodyValue(
                        Map.of("objectTypeId", "PurchaseOrder", "parameters", Map.of("newScheduleDate", "2026-03-15")))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVALID_ARGUMENT")
                .jsonPath("$.message")
                .isEqualTo("objectTypeId and objectId are required");

        client.post()
                .uri("/api/v1/celanworksmith/runtime/actions/UpdateProductionSchedule/execute")
                .bodyValue(Map.of(
                        "objectTypeId", "PurchaseOrder",
                        "objectId", "PO005",
                        "parameters", Map.of()))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVALID_ARGUMENT")
                .jsonPath("$.message")
                .isEqualTo("Missing required parameter: newScheduleDate");
    }
}
