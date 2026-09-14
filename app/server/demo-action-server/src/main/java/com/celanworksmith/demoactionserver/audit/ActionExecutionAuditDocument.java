package com.celanworksmith.demoactionserver.audit;

import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedObject;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedProperty;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.DomainFailure;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Document(ActionExecutionAuditStore.COLLECTION)
public record ActionExecutionAuditDocument(
        @Id String auditId,
        String idempotencyKey,
        String workspaceId,
        String projectId,
        String projectVersion,
        String datasourceId,
        String actionId,
        String objectTypeId,
        String objectId,
        Instant startedAt,
        Instant completedAt,
        String status,
        DomainFailure failure,
        List<ChangedObject> changedObjects,
        List<ChangedProperty> changedProperties,
        String successMessage,
        Map<String, Object> parameterSummary) {
    public ActionExecutionAuditDocument(
            String auditId,
            String idempotencyKey,
            String workspaceId,
            String projectId,
            String projectVersion,
            String datasourceId,
            String actionId,
            String objectTypeId,
            String objectId,
            Instant startedAt,
            Instant completedAt,
            String status,
            DomainFailure failure,
            List<ChangedObject> changedObjects,
            List<ChangedProperty> changedProperties) {
        this(
                auditId,
                idempotencyKey,
                workspaceId,
                projectId,
                projectVersion,
                datasourceId,
                actionId,
                objectTypeId,
                objectId,
                startedAt,
                completedAt,
                status,
                failure,
                changedObjects,
                changedProperties,
                null,
                null);
    }

    public ActionExecutionAuditDocument(
            String auditId,
            String idempotencyKey,
            String workspaceId,
            String projectId,
            String projectVersion,
            String datasourceId,
            String actionId,
            String objectTypeId,
            String objectId,
            Instant startedAt,
            Instant completedAt,
            String status,
            DomainFailure failure,
            List<ChangedObject> changedObjects,
            List<ChangedProperty> changedProperties,
            String successMessage) {
        this(
                auditId,
                idempotencyKey,
                workspaceId,
                projectId,
                projectVersion,
                datasourceId,
                actionId,
                objectTypeId,
                objectId,
                startedAt,
                completedAt,
                status,
                failure,
                changedObjects,
                changedProperties,
                successMessage,
                null);
    }

    public ActionExecutionAuditDocument(
            String auditId,
            String idempotencyKey,
            String workspaceId,
            String projectId,
            String projectVersion,
            String datasourceId,
            String actionId,
            String objectTypeId,
            String objectId,
            Instant startedAt,
            Instant completedAt,
            String status,
            DomainFailure failure,
            List<ChangedObject> changedObjects,
            List<ChangedProperty> changedProperties,
            Map<String, Object> parameterSummary) {
        this(
                auditId,
                idempotencyKey,
                workspaceId,
                projectId,
                projectVersion,
                datasourceId,
                actionId,
                objectTypeId,
                objectId,
                startedAt,
                completedAt,
                status,
                failure,
                changedObjects,
                changedProperties,
                null,
                parameterSummary);
    }

    public ActionExecutionAuditDocument {
        changedObjects = changedObjects == null ? List.of() : List.copyOf(changedObjects);
        changedProperties = changedProperties == null ? List.of() : List.copyOf(changedProperties);
        parameterSummary = parameterSummary == null ? Map.of() : Map.copyOf(parameterSummary);
    }

    public ActionExecutionAuditDocument withParameterSummary(Map<String, Object> summary) {
        return new ActionExecutionAuditDocument(
                auditId,
                idempotencyKey,
                workspaceId,
                projectId,
                projectVersion,
                datasourceId,
                actionId,
                objectTypeId,
                objectId,
                startedAt,
                completedAt,
                status,
                failure,
                changedObjects,
                changedProperties,
                successMessage,
                summary);
    }
}
