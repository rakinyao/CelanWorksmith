package com.celanworksmith.ontology.actionserver;

import com.celanworksmith.ontology.datasource.OntologyActionServerClient;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.DomainFailure;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteSuccess;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatusCode;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class HttpOntologyActionServerClient implements OntologyActionServerClient {
    private static final String EXECUTE_PATH = "/api/v1/actions/execute";

    private final WebClient webClient;
    private final WorkspaceActionServerProperties.Endpoint endpoint;
    private final ObjectMapper objectMapper;

    public HttpOntologyActionServerClient(
            WebClient webClient, WorkspaceActionServerProperties.Endpoint endpoint) {
        this.webClient = webClient;
        this.endpoint = endpoint;
        this.objectMapper = new ObjectMapper().findAndRegisterModules();
    }

    @Override
    public Mono<Result> execute(OntologyActionServerClient.Request request) {
        ExecuteRequest payload = new ExecuteRequest(
                OntologyActionServerProtocol.V1,
                request.workspaceId(),
                request.projectId(),
                request.projectVersion(),
                request.datasourceId(),
                request.actionId(),
                request.objectTypeId(),
                request.objectId(),
                request.parameters(),
                request.context(),
                request.idempotencyKey());

        return webClient
                .post()
                .uri(executeUri())
                .bodyValue(payload)
                .exchangeToMono(response -> response.bodyToMono(String.class)
                        .defaultIfEmpty("")
                        .flatMap(body -> decode(response.statusCode(), body)))
                .timeout(Duration.ofMillis(endpoint.getTimeoutMillis()));
    }

    private String executeUri() {
        String baseUrl = endpoint.getUrl();
        while (baseUrl.endsWith("/")) {
            baseUrl = baseUrl.substring(0, baseUrl.length() - 1);
        }
        return baseUrl + EXECUTE_PATH;
    }

    private Mono<Result> decode(HttpStatusCode status, String body) {
        if (status.is2xxSuccessful()) {
            try {
                ExecuteSuccess success = objectMapper.readValue(body, ExecuteSuccess.class);
                validateSuccess(success);
                return Mono.just(new Result(successBody(success), success.auditId()));
            } catch (JsonProcessingException | IllegalArgumentException exception) {
                return Mono.error(new IllegalStateException(
                        "Action Server returned malformed success response: " + exception.getMessage(), exception));
            }
        }

        try {
            DomainFailure failure = objectMapper.readValue(body, DomainFailure.class);
            if (failure == null) {
                return Mono.error(new IllegalStateException("Action Server returned a null error response"));
            }
            if (!OntologyActionServerProtocol.V1.equals(failure.contractVersion())
                    || failure.code() == null
                    || failure.code().isBlank()
                    || failure.message() == null
                    || failure.message().isBlank()) {
                return Mono.error(new IllegalStateException("Action Server returned an undeclared error response"));
            }
            if (failure.auditId() == null || failure.auditId().isBlank()) {
                return Mono.error(new IllegalStateException("Action Server error response auditId must not be blank"));
            }
            return Mono.error(new DomainException(failure.code(), failure.message(), failure.auditId()));
        } catch (JsonProcessingException | IllegalArgumentException exception) {
            return Mono.error(new IllegalStateException("Action Server returned malformed error response", exception));
        }
    }

    private static void validateSuccess(ExecuteSuccess success) {
        if (success == null) {
            throw new IllegalArgumentException("success body must not be null");
        }
        if (!OntologyActionServerProtocol.V1.equals(success.contractVersion())) {
            throw new IllegalArgumentException("contractVersion must be v1");
        }
        if (success.auditId() == null || success.auditId().isBlank()) {
            throw new IllegalArgumentException("auditId must not be blank");
        }
        if (success.status() == null || success.status().isBlank()) {
            throw new IllegalArgumentException("status must not be blank");
        }
        if (success.message() == null || success.message().isBlank()) {
            throw new IllegalArgumentException("message must not be blank");
        }
    }

    private static Map<String, Object> successBody(ExecuteSuccess success) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", success.status());
        body.put("message", success.message());
        body.put("changedObjects", changedObjects(success));
        body.put("changedProperties", changedProperties(success));
        body.put("auditId", success.auditId());
        return Map.copyOf(body);
    }

    private static List<Map<String, Object>> changedObjects(ExecuteSuccess success) {
        return success.changedObjects().stream()
                .map(changed -> Map.<String, Object>of(
                        "objectTypeId", changed.objectTypeId(),
                        "objectId", changed.objectId()))
                .toList();
    }

    private static List<Map<String, Object>> changedProperties(ExecuteSuccess success) {
        return success.changedProperties().stream()
                .map(changed -> {
                    Map<String, Object> property = new LinkedHashMap<>();
                    property.put("objectTypeId", changed.objectTypeId());
                    property.put("objectId", changed.objectId());
                    property.put("propertyId", changed.propertyId());
                    property.put("newValue", changed.newValue());
                    return property;
                })
                .toList();
    }
}
