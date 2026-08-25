package com.celanworksmith.demoactionserver.api;

import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedObject;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedProperty;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.DomainFailure;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteSuccess;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.reactive.WebFluxTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Mono;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@WebFluxTest(ActionExecutionController.class)
class ActionExecutionControllerTest {
    @Autowired
    private WebTestClient webTestClient;

    @MockitoBean
    private ActionExecutionService actionExecutionService;

    @Test
    void returnsTheV1SuccessEnvelopeFromTheActionService() {
        when(actionExecutionService.execute(any()))
                .thenReturn(Mono.just(new ActionExecutionService.ExecutionResult.Success(new ExecuteSuccess(
                        "v1",
                        "audit-1",
                        "SUCCEEDED",
                        "Production schedule updated.",
                        List.of(new ChangedObject("PurchaseOrder", "PO001")),
                        List.of(new ChangedProperty("PurchaseOrder", "PO001", "status", "SCHEDULED"))))));

        webTestClient
                .post()
                .uri("/api/v1/actions/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(validRequest())
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.contractVersion")
                .isEqualTo("v1")
                .jsonPath("$.auditId")
                .isEqualTo("audit-1")
                .jsonPath("$.status")
                .isEqualTo("SUCCEEDED")
                .jsonPath("$.changedObjects[0].objectTypeId")
                .isEqualTo("PurchaseOrder")
                .jsonPath("$.changedProperties[0].propertyId")
                .isEqualTo("status");
    }

    @Test
    void mapsAnInProgressFailureToConflict() {
        when(actionExecutionService.execute(any()))
                .thenReturn(Mono.just(new ActionExecutionService.ExecutionResult.Failure(
                        new DomainFailure("v1", "audit-1", "ACTION_IN_PROGRESS", "Action execution is in progress."))));

        webTestClient
                .post()
                .uri("/api/v1/actions/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(validRequest())
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.auditId")
                .isEqualTo("audit-1")
                .jsonPath("$.code")
                .isEqualTo("ACTION_IN_PROGRESS");
    }

    @Test
    void mapsADeclaredDomainFailureToUnprocessableEntity() {
        when(actionExecutionService.execute(any()))
                .thenReturn(Mono.just(new ActionExecutionService.ExecutionResult.Failure(
                        new DomainFailure("v1", "audit-1", "ACTION_NOT_REGISTERED", "No handler is registered."))));

        webTestClient
                .post()
                .uri("/api/v1/actions/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(validRequest())
                .exchange()
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.auditId")
                .isEqualTo("audit-1")
                .jsonPath("$.code")
                .isEqualTo("ACTION_NOT_REGISTERED");
    }

    @Test
    void mapsPersistedUnexpectedFailureToInternalServerErrorWithoutLeakingDetails() {
        when(actionExecutionService.execute(any()))
                .thenReturn(Mono.just(new ActionExecutionService.ExecutionResult.Failure(
                        new DomainFailure("v1", "audit-1", "ACTION_EXECUTION_FAILED", "Action execution failed."))));

        webTestClient
                .post()
                .uri("/api/v1/actions/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(validRequest())
                .exchange()
                .expectStatus()
                .isEqualTo(500)
                .expectBody()
                .jsonPath("$.auditId")
                .isEqualTo("audit-1")
                .jsonPath("$.message")
                .isEqualTo("Action execution failed.")
                .jsonPath("$.message")
                .value(value -> org.assertj.core.api.Assertions.assertThat(String.valueOf(value))
                        .doesNotContain("password"));
    }

    @Test
    void hidesUnexpectedServiceExceptionDetails() {
        when(actionExecutionService.execute(any()))
                .thenReturn(Mono.error(new IllegalStateException("mongodb password leaked")));

        webTestClient
                .post()
                .uri("/api/v1/actions/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .bodyValue(validRequest())
                .exchange()
                .expectStatus()
                .isEqualTo(500)
                .expectBody()
                .jsonPath("$.message")
                .isEqualTo("Action execution failed.")
                .jsonPath("$.message")
                .value(value -> org.assertj.core.api.Assertions.assertThat(String.valueOf(value))
                        .doesNotContain("password"));
    }

    private static String validRequest() {
        return """
                {
                  "contractVersion": "v1",
                  "workspaceId": "workspace-1",
                  "projectId": "project-1",
                  "projectVersion": "1.0.0",
                  "datasourceId": "datasource-1",
                  "actionId": "UpdateProductionSchedule",
                  "objectTypeId": "PurchaseOrder",
                  "objectId": "PO001",
                  "parameters": {},
                  "context": {},
                  "idempotencyKey": "key-1"
                }
                """;
    }
}
