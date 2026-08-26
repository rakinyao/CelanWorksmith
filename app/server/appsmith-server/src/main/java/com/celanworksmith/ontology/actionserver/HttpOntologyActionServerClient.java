package com.celanworksmith.ontology.actionserver;

import com.celanworksmith.ontology.datasource.OntologyActionServerClient;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.DomainFailure;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteSuccess;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.TargetOutcome;
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

    public HttpOntologyActionServerClient(WebClient webClient, WorkspaceActionServerProperties.Endpoint endpoint) {
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
                request.targets(),
                request.atomic(),
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
                DomainException failure = singleTargetFailure(success);
                if (failure != null) {
                    return Mono.error(failure);
                }
                return Mono.just(new Result(successBody(success), singleAuditId(success)));
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
            if (failure.auditId() != null && failure.auditId().isBlank()) {
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
        if (success.outcomes().isEmpty()) {
            throw new IllegalArgumentException("outcomes must not be empty");
        }
    }

    private static DomainException singleTargetFailure(ExecuteSuccess success) {
        if (success.outcomes().size() != 1) {
            return null;
        }
        TargetOutcome outcome = success.outcomes().getFirst();
        if (!"FAILED".equals(outcome.status())) {
            return null;
        }
        DomainFailure failure = outcome.error();
        if (failure == null
                || !OntologyActionServerProtocol.V1.equals(failure.contractVersion())
                || failure.code() == null
                || failure.code().isBlank()
                || failure.message() == null
                || failure.message().isBlank()) {
            throw new IllegalArgumentException("failed target outcome must declare a v1 domain failure");
        }
        return new DomainException(failure.code(), failure.message(), outcome.auditId());
    }

    private static Map<String, Object> successBody(ExecuteSuccess success) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put(
                "outcomes",
                success.outcomes().stream()
                        .map(HttpOntologyActionServerClient::outcome)
                        .toList());
        return Map.copyOf(body);
    }

    private static String singleAuditId(ExecuteSuccess success) {
        return success.outcomes().size() == 1 ? success.outcomes().getFirst().auditId() : null;
    }

    private static Map<String, Object> outcome(TargetOutcome outcome) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put(
                "target",
                Map.of(
                        "objectTypeId", outcome.target().objectTypeId(),
                        "objectId", outcome.target().objectId()));
        body.put("status", outcome.status());
        body.put("changedObjects", changedObjects(outcome.changedObjects()));
        body.put("changedProperties", changedProperties(outcome.changedProperties()));
        if (outcome.error() != null) {
            Map<String, Object> error = new LinkedHashMap<>();
            error.put("code", outcome.error().code());
            error.put("message", outcome.error().message());
            body.put("error", Map.copyOf(error));
        }
        body.put("auditId", outcome.auditId());
        return Map.copyOf(body);
    }

    private static List<Map<String, Object>> changedObjects(
            List<OntologyActionServerProtocol.ChangedObject> changedObjects) {
        return changedObjects.stream()
                .map(changed -> Map.<String, Object>of(
                        "objectTypeId", changed.objectTypeId(),
                        "objectId", changed.objectId()))
                .toList();
    }

    private static List<Map<String, Object>> changedProperties(
            List<OntologyActionServerProtocol.ChangedProperty> changedProperties) {
        return changedProperties.stream()
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
