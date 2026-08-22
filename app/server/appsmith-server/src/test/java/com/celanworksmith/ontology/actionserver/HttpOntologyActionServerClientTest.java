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
        server.enqueue(new MockResponse().setResponseCode(200).setBody("""
                {"contractVersion":"v1","auditId":"audit-1","status":"SUCCEEDED",
                 "message":"Production schedule updated.","changedObjects":[],"changedProperties":[]}
                """));

        StepVerifier.create(client.execute(request()))
                .assertNext(result -> assertThat(result.auditId()).isEqualTo("audit-1"))
                .verifyComplete();

        var recorded = server.takeRequest();
        assertThat(recorded.getPath()).isEqualTo("/api/v1/actions/execute");
        assertThat(recorded.getMethod()).isEqualTo("POST");
        assertThat(recorded.getBody().readUtf8()).contains("\"contractVersion\":\"v1\"");
    }

    @Test
    void mapsDeclaredDomainFailureToDomainException() {
        server.enqueue(new MockResponse().setResponseCode(409).setBody("""
                {"contractVersion":"v1","auditId":"audit-2","code":"CONFLICT",
                 "message":"Schedule is already published."}
                """));

        StepVerifier.create(client.execute(request()))
                .expectErrorSatisfies(error -> {
                    assertThat(error).isInstanceOf(OntologyActionServerClient.DomainException.class);
                    var domainError = (OntologyActionServerClient.DomainException) error;
                    assertThat(domainError).hasMessage("Schedule is already published.");
                    assertThat(domainError.auditId()).isEqualTo("audit-2");
                })
                .verify();
    }

    @Test
    void rejectsMalformedSuccessAndMissingAuditId() {
        server.enqueue(new MockResponse().setResponseCode(200).setBody("{\"contractVersion\":\"v1\",\"status\":\"SUCCEEDED\"}"));

        StepVerifier.create(client.execute(request()))
                .expectErrorSatisfies(error -> assertThat(error)
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessageContaining("auditId"))
                .verify();
    }

    @Test
    void rejectsDomainFailureWithoutAuditId() {
        server.enqueue(new MockResponse().setResponseCode(409).setBody("""
                {"contractVersion":"v1","code":"CONFLICT","message":"Schedule is already published."}
                """));

        StepVerifier.create(client.execute(request()))
                .expectError(IllegalStateException.class)
                .verify();
    }

    @Test
    void rejectsDomainFailureWithBlankAuditId() {
        server.enqueue(new MockResponse().setResponseCode(409).setBody("""
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
                "workspace-1", "project-1", "2026-08-22", "datasource-1", "publish",
                "PurchaseOrder", "po-1", Map.of("status", "PUBLISHED"), Map.of("actor", "test"), "idem-1");
    }
}
