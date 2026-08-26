package com.celanworksmith.ontology.actionserver;

import com.celanworksmith.ontology.datasource.OntologyActionServerClient;
import mockwebserver3.MockResponse;
import mockwebserver3.MockWebServer;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.test.StepVerifier;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.assertj.core.api.Assertions.assertThat;

class HttpOntologyActionServerClientTest {
    private static MockWebServer server;
    private HttpOntologyActionServerClient client;

    @BeforeAll
    static void startServer() throws IOException {
        server = new MockWebServer();
        server.start();
    }

    @AfterAll
    static void stopServer() throws IOException {
        server.shutdown();
    }

    @BeforeEach
    void setUpClient() {
        client = new HttpOntologyActionServerClient(
                WebClient.builder().build(),
                new WorkspaceActionServerProperties.Endpoint(server.url("/").toString(), 1_000));
    }

    @Test
    void postsTrustedRequestAndMapsSuccess() throws Exception {
        server.enqueue(
                new MockResponse()
                        .setResponseCode(200)
                        .setBody(
                                """
                {"contractVersion":"v1","outcomes":[
                  {"target":{"objectTypeId":"PurchaseOrder","objectId":"PO002"},"status":"SUCCEEDED",
                   "changedObjects":[],"changedProperties":[],"error":null,"auditId":"audit-1"}
                ]}
                """));

        StepVerifier.create(client.execute(request()))
                .assertNext(result -> {
                    assertThat(result.auditId()).isEqualTo("audit-1");
                    assertThat(result.body()).isInstanceOf(Map.class);
                    Map<?, ?> body = (Map<?, ?>) result.body();
                    assertThat(body.get("outcomes"))
                            .isEqualTo(List.of(Map.of(
                                    "target", Map.of("objectTypeId", "PurchaseOrder", "objectId", "PO002"),
                                    "status", "SUCCEEDED",
                                    "changedObjects", List.of(),
                                    "changedProperties", List.of(),
                                    "auditId", "audit-1")));
                    assertThat(body.containsKey("data")).isFalse();
                })
                .verifyComplete();

        var recorded = server.takeRequest();
        assertThat(recorded.getPath()).isEqualTo("/api/v1/actions/execute");
        assertThat(recorded.getMethod()).isEqualTo("POST");
        assertThat(recorded.getBody().readUtf8())
                .contains("\"contractVersion\":\"v1\"")
                .contains("\"targets\":{\"objectTypeId\":\"PurchaseOrder\",\"objectIds\":[\"PO002\"]}")
                .contains("\"atomic\":false");
    }

    @Test
    void mapsDeclaredDomainFailureCodeToDomainException() {
        server.enqueue(
                new MockResponse()
                        .setResponseCode(409)
                        .setBody(
                                """
                {"contractVersion":"v1","auditId":"audit-2","code":"RELATED_OBJECT_NOT_FOUND",
                 "message":"ProductionOrder PR001 was not found."}
                """));

        StepVerifier.create(client.execute(request()))
                .expectErrorSatisfies(error -> {
                    assertThat(error).isInstanceOf(OntologyActionServerClient.DomainException.class);
                    var domainError = (OntologyActionServerClient.DomainException) error;
                    assertThat(domainError).hasMessage("ProductionOrder PR001 was not found.");
                    assertThat(domainError.auditId()).isEqualTo("audit-2");
                    assertThat(domainError.code()).isEqualTo("RELATED_OBJECT_NOT_FOUND");
                })
                .verify();
    }

    @Test
    void mapsASingleFailedOutcomeFromASuccessEnvelopeToDomainException() {
        server.enqueue(
                new MockResponse()
                        .setResponseCode(200)
                        .setBody(
                                """
                {"contractVersion":"v1","outcomes":[
                  {"target":{"objectTypeId":"PurchaseOrder","objectId":"PO002"},"status":"FAILED",
                   "changedObjects":[],"changedProperties":[],
                   "error":{"contractVersion":"v1","auditId":"audit-2","code":"RELATED_OBJECT_NOT_FOUND",
                            "message":"ProductionOrder PR001 was not found."},"auditId":"audit-2"}
                ]}
                """));

        StepVerifier.create(client.execute(request()))
                .expectErrorSatisfies(error -> {
                    assertThat(error).isInstanceOf(OntologyActionServerClient.DomainException.class);
                    var domainError = (OntologyActionServerClient.DomainException) error;
                    assertThat(domainError).hasMessage("ProductionOrder PR001 was not found.");
                    assertThat(domainError.code()).isEqualTo("RELATED_OBJECT_NOT_FOUND");
                    assertThat(domainError.auditId()).isEqualTo("audit-2");
                })
                .verify();
    }

    @Test
    void preservesOrderedMixedTargetOutcomes() {
        server.enqueue(
                new MockResponse()
                        .setResponseCode(200)
                        .setBody(
                                """
                {"contractVersion":"v1","outcomes":[
                  {"target":{"objectTypeId":"PurchaseOrder","objectId":"PO002"},"status":"SUCCEEDED",
                   "changedObjects":[],"changedProperties":[],"auditId":"audit-1"},
                  {"target":{"objectTypeId":"PurchaseOrder","objectId":"PO404"},"status":"FAILED",
                   "changedObjects":[],"changedProperties":[],
                   "error":{"contractVersion":"v1","auditId":"audit-2","code":"TARGET_NOT_FOUND",
                            "message":"PurchaseOrder PO404 was not found."},"auditId":"audit-2"}
                ]}
                """));

        StepVerifier.create(client.execute(request()))
                .assertNext(result -> {
                    assertThat(result.auditId()).isNull();
                    assertThat(result.body())
                            .isEqualTo(Map.of(
                                    "outcomes",
                                    List.of(
                                            Map.of(
                                                    "target",
                                                            Map.of(
                                                                    "objectTypeId",
                                                                    "PurchaseOrder",
                                                                    "objectId",
                                                                    "PO002"),
                                                    "status", "SUCCEEDED",
                                                    "changedObjects", List.of(),
                                                    "changedProperties", List.of(),
                                                    "auditId", "audit-1"),
                                            Map.of(
                                                    "target",
                                                            Map.of(
                                                                    "objectTypeId",
                                                                    "PurchaseOrder",
                                                                    "objectId",
                                                                    "PO404"),
                                                    "status", "FAILED",
                                                    "changedObjects", List.of(),
                                                    "changedProperties", List.of(),
                                                    "error",
                                                            Map.of(
                                                                    "code", "TARGET_NOT_FOUND",
                                                                    "message", "PurchaseOrder PO404 was not found."),
                                                    "auditId", "audit-2"))));
                })
                .verifyComplete();
    }

    @Test
    void rejectsMalformedSuccessWithoutOutcomes() {
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setBody("{\"contractVersion\":\"v1\",\"status\":\"SUCCEEDED\"}"));

        StepVerifier.create(client.execute(request()))
                .expectErrorSatisfies(error -> assertThat(error)
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("outcomes"))
                .verify();
    }

    @Test
    void mapsEarlyDomainFailureWithoutAuditId() {
        server.enqueue(
                new MockResponse()
                        .setResponseCode(409)
                        .setBody(
                                """
                {"contractVersion":"v1","code":"CONFLICT","message":"Schedule is already published."}
                """));

        StepVerifier.create(client.execute(request()))
                .expectErrorSatisfies(error -> {
                    assertThat(error).isInstanceOf(OntologyActionServerClient.DomainException.class);
                    assertThat(((OntologyActionServerClient.DomainException) error).auditId())
                            .isNull();
                })
                .verify();
    }

    @Test
    void rejectsDomainFailureWithBlankAuditId() {
        server.enqueue(
                new MockResponse()
                        .setResponseCode(409)
                        .setBody(
                                """
                {"contractVersion":"v1","auditId":"","code":"CONFLICT","message":"Schedule is already published."}
                """));

        StepVerifier.create(client.execute(request()))
                .expectError(IllegalStateException.class)
                .verify();
    }

    @Test
    void rejectsNullSuccessPayload() {
        server.enqueue(new MockResponse().setResponseCode(200).setBody("null"));

        StepVerifier.create(client.execute(request()))
                .expectError(IllegalStateException.class)
                .verify();
    }

    @Test
    void rejectsNullDomainFailurePayload() {
        server.enqueue(new MockResponse().setResponseCode(409).setBody("null"));

        StepVerifier.create(client.execute(request()))
                .expectError(IllegalStateException.class)
                .verify();
    }

    @Test
    void appliesInjectedTimeoutToDelayedResponse() {
        client = new HttpOntologyActionServerClient(
                WebClient.builder().build(),
                new WorkspaceActionServerProperties.Endpoint(server.url("/").toString(), 25));
        server.enqueue(new MockResponse()
                .setResponseCode(200)
                .setBody("{\"contractVersion\":\"v1\",\"auditId\":\"audit-3\",\"status\":\"SUCCEEDED\"}")
                .setBodyDelay(250, TimeUnit.MILLISECONDS));

        StepVerifier.create(client.execute(request()))
                .expectError(TimeoutException.class)
                .verify();
    }

    private static OntologyActionServerClient.Request request() {
        return new OntologyActionServerClient.Request(
                "workspace-1",
                "project-1",
                "2026-08-22",
                "datasource-1",
                "publish",
                new com.celanworksmith.ontology.datasource.OntologyObjectSet("PurchaseOrder", List.of("PO002")),
                false,
                Map.of("status", "PUBLISHED"),
                Map.of("actor", "test"),
                "idem-1");
    }
}
