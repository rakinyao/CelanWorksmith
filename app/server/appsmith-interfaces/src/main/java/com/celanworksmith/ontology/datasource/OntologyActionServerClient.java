package com.celanworksmith.ontology.datasource;

import reactor.core.publisher.Mono;

import java.util.Map;

public interface OntologyActionServerClient {
    record Request(
            String workspaceId,
            String projectId,
            String projectVersion,
            String datasourceId,
            String actionId,
            String objectTypeId,
            String objectId,
            Map<String, Object> parameters,
            Map<String, Object> context,
            String idempotencyKey) {
        public Request {
            parameters = parameters == null ? Map.of() : Map.copyOf(parameters);
            context = context == null ? Map.of() : Map.copyOf(context);
        }
    }

    record Result(Object body, String auditId) {}

    class DomainException extends RuntimeException {
        private final String code;
        private final String auditId;

        public DomainException(String code, String message, String auditId) {
            super(message);
            this.code = code;
            this.auditId = auditId;
        }

        public DomainException(String message, String auditId) {
            this("ACTION_SERVER_DOMAIN_ERROR", message, auditId);
        }

        public String code() {
            return code;
        }

        public String auditId() {
            return auditId;
        }
    }

    Mono<Result> execute(Request request);
}
