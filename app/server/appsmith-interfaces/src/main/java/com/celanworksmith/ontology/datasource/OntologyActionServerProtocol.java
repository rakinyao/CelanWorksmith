package com.celanworksmith.ontology.datasource;

import java.util.List;
import java.util.Map;

/** Stable v1 transport DTOs shared by the action-server HTTP client and demo server. */
public final class OntologyActionServerProtocol {
    public static final String V1 = "v1";

    private OntologyActionServerProtocol() {}

    public record ExecuteRequest(
            String contractVersion,
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
        public ExecuteRequest {
            requireNonBlank("contractVersion", contractVersion);
            requireNonBlank("workspaceId", workspaceId);
            requireNonBlank("projectId", projectId);
            requireNonBlank("projectVersion", projectVersion);
            requireNonBlank("datasourceId", datasourceId);
            requireNonBlank("actionId", actionId);
            requireNonBlank("objectTypeId", objectTypeId);
            requireNonBlank("objectId", objectId);
            requireNonBlank("idempotencyKey", idempotencyKey);
            parameters = parameters == null ? Map.of() : Map.copyOf(parameters);
            context = context == null ? Map.of() : Map.copyOf(context);
        }
    }

    public record ChangedObject(String objectTypeId, String objectId) {}

    public record ChangedProperty(String objectTypeId, String objectId,
                                  String propertyId, Object newValue) {}

    public record ExecuteSuccess(String contractVersion, String auditId, String status,
                                 String message, List<ChangedObject> changedObjects,
                                 List<ChangedProperty> changedProperties) {
        public ExecuteSuccess {
            requireNonBlank("contractVersion", contractVersion);
            changedObjects = changedObjects == null ? List.of() : List.copyOf(changedObjects);
            changedProperties = changedProperties == null ? List.of() : List.copyOf(changedProperties);
        }
    }

    public record DomainFailure(String contractVersion, String auditId,
                                String code, String message) {
        public DomainFailure {
            requireNonBlank("contractVersion", contractVersion);
        }
    }

    private static void requireNonBlank(String fieldName, String value) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " must not be blank");
        }
    }
}
