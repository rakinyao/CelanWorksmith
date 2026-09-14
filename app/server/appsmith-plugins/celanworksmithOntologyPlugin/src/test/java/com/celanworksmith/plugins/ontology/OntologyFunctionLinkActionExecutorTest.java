package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionExecutionResult;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.TriggerRequestDTO;
import com.appsmith.external.models.TriggerResultDTO;
import com.celanworksmith.ontology.datasource.OntologyActionServerClient;
import com.celanworksmith.ontology.datasource.OntologyObjectSet;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OntologyFunctionLinkActionExecutorTest {
    private static final String DIGEST = "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

    @Test
    void executesTypedFunctionAgainstPinnedDefinition() {
        RecordingGateway gateway = new RecordingGateway();
        ActionExecutionResult result = execute(
                gateway, "FUNCTION_QUERY", Map.of("functionId", "delayScore", "parameters", Map.of("delayDays", 5)));

        assertTrue(result.getIsExecutionSuccess());
        assertEquals(50, result.getBody());
        assertEquals(Map.of("delayDays", 5), gateway.functionParameters);
        assertEquals(new OntologyObjectSet("PurchaseOrder", List.of("PO002")), gateway.functionTargets);
    }

    @Test
    void executesBuilderFunctionParametersFromDynamicJsonInput() {
        RecordingGateway gateway = new RecordingGateway();
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(Map.of(
                "operation", Map.of("data", "FUNCTION_QUERY"),
                "queryMode", Map.of("data", "BUILDER"),
                "objectTypeId", Map.of("data", "PurchaseOrder"),
                "functionId", Map.of("data", "delayScore"),
                "target", Map.of("data", Map.of("source", "SINGLE_OBJECT", "objectId", "PO002")),
                "parameters", Map.of("data", "{\"delayDays\":5}")));

        ActionExecutionResult result = new OntologyPlugin.OntologyPluginExecutor(gateway)
                .execute(datasource(), null, action)
                .block();

        assertTrue(result.getIsExecutionSuccess());
        assertEquals(Map.of("delayDays", 5), gateway.functionParameters);
    }

    @Test
    void executesBuilderFunctionWithManyObjectTarget() {
        RecordingGateway gateway = new RecordingGateway();
        ActionExecutionResult result = execute(
                gateway,
                "FUNCTION_QUERY",
                Map.of(
                        "functionId", "manyScore",
                        "objectTypeId", "PurchaseOrder",
                        "target", Map.of("source", "OBJECT_SET", "objectIds", List.of("PO001", "PO002"))));

        assertTrue(result.getIsExecutionSuccess());
        assertEquals(new OntologyObjectSet("PurchaseOrder", List.of("PO001", "PO002")), gateway.functionTargets);
    }

    @Test
    void rejectsBoundedActionObjectSetBeforeResolvingActionServer() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId", "reschedulePurchaseOrder",
                        "objectTypeId", "PurchaseOrder",
                        "target", Map.of("source", "OBJECT_SET", "objectIds", List.of("PO001", "PO002"))));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("maxItems: 1"));
        assertEquals(0, actionServer.calls);
    }

    @Test
    void rejectsBuilderFunctionTargetAboveDeclaredMaxItems() {
        RecordingGateway gateway = new RecordingGateway();
        ActionExecutionResult result = execute(
                gateway,
                "FUNCTION_QUERY",
                Map.of(
                        "functionId", "manyScore",
                        "objectTypeId", "PurchaseOrder",
                        "target", Map.of("source", "MANY_OBJECTS", "objectIds", List.of("PO001", "PO002", "PO003"))));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("maxItems: 2"));
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsBlankFunctionTargetIdBeforeProviderCall() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult result = execute(
                gateway,
                "FUNCTION_QUERY",
                Map.of(
                        "functionId",
                        "manyScore",
                        "target",
                        Map.of("source", "OBJECT_SET", "objectIds", List.of("PO001", "  "))));

        assertFalse(result.getIsExecutionSuccess());
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsNonStringFunctionTargetIdsBeforeProviderCall() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult result = execute(
                gateway,
                "FUNCTION_QUERY",
                Map.of(
                        "functionId",
                        "manyScore",
                        "target",
                        Map.of("source", "OBJECT_SET", "objectIds", List.of("PO001", 2))));

        assertFalse(result.getIsExecutionSuccess());
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsDuplicateFunctionTargetIdsBeforeProviderCall() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult result = execute(
                gateway,
                "FUNCTION_QUERY",
                Map.of(
                        "functionId",
                        "manyScore",
                        "target",
                        Map.of("source", "OBJECT_SET", "objectIds", List.of("PO001", "PO001"))));

        assertFalse(result.getIsExecutionSuccess());
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsMismatchedFunctionOwnerBeforeProviderCall() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult result = execute(
                gateway,
                "FUNCTION_QUERY",
                Map.of(
                        "functionId", "supplierScore",
                        "objectTypeId", "PurchaseOrder",
                        "target", Map.of("source", "SINGLE_OBJECT", "objectId", "PO001")));

        assertFalse(result.getIsExecutionSuccess());
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsUnknownRuntimeFunctionIdBeforeProviderCall() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult result = execute(
                gateway,
                "FUNCTION_QUERY",
                Map.of(
                        "functionId",
                        "missing-runtime-function",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO001")));

        assertFalse(result.getIsExecutionSuccess());
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsAnUnknownFunctionTargetBeforeFunctionExecution() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult result = execute(
                gateway,
                "FUNCTION_QUERY",
                Map.of(
                        "functionId",
                        "delayScore",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO404"),
                        "parameters",
                        Map.of("delayDays", 5)));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Unknown object: PurchaseOrder/PO404"));
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void resolvesLinkByStableLinkId() {
        RecordingGateway gateway = new RecordingGateway();
        ActionExecutionResult result = execute(
                gateway,
                "LINK_QUERY",
                Map.of("linkId", "po_delivery", "sourceTypeId", "PurchaseOrder", "sourceId", "po-1"));

        assertTrue(result.getIsExecutionSuccess());
        assertEquals("po_delivery", gateway.linkId);
        assertEquals(List.of(Map.of("id", "delivery-1")), result.getBody());
    }

    @Test
    void rejectsUnknownFunctionAndInvalidParameterTypesBeforeProviderCall() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult unknownFunction = execute(
                gateway, "FUNCTION_QUERY", Map.of("functionId", "unknown", "parameters", Map.of("delayDays", 5)));
        ActionExecutionResult invalidParameter = execute(
                gateway,
                "FUNCTION_QUERY",
                Map.of("functionId", "delayScore", "parameters", Map.of("delayDays", "five")));

        assertFalse(unknownFunction.getIsExecutionSuccess());
        assertTrue(unknownFunction.getReadableError().contains("Unknown ontology function"));
        assertFalse(invalidParameter.getIsExecutionSuccess());
        assertTrue(invalidParameter.getReadableError().contains("must be an integer"));
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsHiddenFunctionParametersBeforeProviderCall() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult result = execute(
                gateway,
                "FUNCTION_QUERY",
                Map.of("functionId", "delayScore", "parameters", Map.of("internalToken", "secret")));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Unknown ontology function parameter"));
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsPoIdAsAnUnknownParameterForTheZeroParameterDemoFunction() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult result = execute(
                gateway,
                "FUNCTION_QUERY",
                Map.of("functionId", "CalculateDelayDays", "parameters", Map.of("poId", "PO002")));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Unknown ontology function parameter: poId"));
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsUnknownAndNonWritableAdvancedFunctionParametersBeforeProviderCall() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult unexpectedRoot = executeAdvanced(gateway, "delayScore", "{\"page\":{}}");
        ActionExecutionResult unknown = executeAdvanced(gateway, "delayScore", "{\"unknown\":5}");
        ActionExecutionResult readOnly =
                executeAdvanced(gateway, "protectedScore", "{\"input\":\"value\",\"readOnlyValue\":\"value\"}");
        ActionExecutionResult derived =
                executeAdvanced(gateway, "protectedScore", "{\"input\":\"value\",\"derivedValue\":\"value\"}");

        assertFalse(unexpectedRoot.getIsExecutionSuccess());
        assertTrue(unexpectedRoot.getReadableError().contains("Unknown ontology function parameter"));
        assertFalse(unknown.getIsExecutionSuccess());
        assertTrue(unknown.getReadableError().contains("Unknown ontology function parameter"));
        assertFalse(readOnly.getIsExecutionSuccess());
        assertTrue(readOnly.getReadableError().contains("not writable"));
        assertFalse(derived.getIsExecutionSuccess());
        assertTrue(derived.getReadableError().contains("not writable"));
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsAdvancedFunctionIdParameterBeforeProviderCall() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult result = executeAdvanced(gateway, "delayScore", "{\"functionId\":\"other\"}");

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Unknown ontology function parameter"));
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsMissingRequiredAdvancedFunctionParametersBeforeProviderCall() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult result = executeAdvanced(gateway, "protectedScore", "{}");

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Ontology function parameter is required"));
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsNullAdvancedFunctionParametersWithSemanticValidation() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult result = executeAdvanced(gateway, "delayScore", "{\"delayDays\":null}");

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("must be an integer"));
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void permitsOnlyWritableRequiredAdvancedFunctionParameters() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult result = executeAdvanced(gateway, "protectedScore", "{\"input\":\"value\"}");

        assertTrue(result.getIsExecutionSuccess());
        assertEquals(Map.of("input", "value"), gateway.functionParameters);
    }

    @Test
    void permitsOmittedOptionalFunctionParameters() {
        RecordingGateway gateway = new RecordingGateway();
        ActionExecutionResult result = execute(gateway, "FUNCTION_QUERY", Map.of("functionId", "optionalScore"));

        assertTrue(result.getIsExecutionSuccess());
        assertEquals(Map.of(), gateway.functionParameters);
    }

    @Test
    void rejectsUnknownLinkAndMismatchedSourceTypeBeforeProviderCall() {
        RecordingGateway gateway = new RecordingGateway();

        ActionExecutionResult unknownLink = execute(
                gateway,
                "LINK_QUERY",
                Map.of("linkId", "unknown", "sourceTypeId", "PurchaseOrder", "sourceId", "po-1"));
        ActionExecutionResult mismatchedSource = execute(
                gateway,
                "LINK_QUERY",
                Map.of("linkId", "po_delivery", "sourceTypeId", "DeliveryOrder", "sourceId", "delivery-1"));

        assertFalse(unknownLink.getIsExecutionSuccess());
        assertTrue(unknownLink.getReadableError().contains("Unknown ontology link"));
        assertFalse(mismatchedSource.getIsExecutionSuccess());
        assertTrue(mismatchedSource.getReadableError().contains("does not apply"));
        assertEquals(0, gateway.linkCalls);
    }

    @Test
    void returnsAnEmptyNativeResultWhenAValidLinkHasNoRelatedObjects() {
        RecordingGateway gateway = new RecordingGateway();
        gateway.linkResult = List.of();

        ActionExecutionResult result = execute(
                gateway,
                "LINK_QUERY",
                Map.of("linkId", "po_delivery", "sourceTypeId", "PurchaseOrder", "sourceId", "po-1"));

        assertTrue(result.getIsExecutionSuccess());
        assertEquals(List.of(), result.getBody());
    }

    @Test
    void returnsAReadableFailureWhenTheLinkProviderFails() {
        RecordingGateway gateway = new RecordingGateway();
        gateway.linkFailure = new IllegalStateException("Runtime Provider unavailable");

        ActionExecutionResult result = execute(
                gateway,
                "LINK_QUERY",
                Map.of("linkId", "po_delivery", "sourceTypeId", "PurchaseOrder", "sourceId", "po-1"));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Runtime Provider unavailable"));
    }

    @Test
    void executesActionThroughTheWorkspaceActionServerWithTrustedContext() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();
        actionServer.response = new OntologyActionServerClient.Result(
                Map.of(
                        "status", "SUCCEEDED",
                        "message", "Production schedule updated.",
                        "changedObjects", List.of(Map.of("objectTypeId", "ProductionOrder", "objectId", "PR001"))),
                "audit-123");

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId",
                        "reschedulePurchaseOrder",
                        "objectTypeId",
                        "PurchaseOrder",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO001"),
                        "parameters",
                        Map.of("newScheduleDate", "2026-09-01")));

        assertTrue(result.getIsExecutionSuccess());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals("audit-123", body.get("auditId"));
        assertEquals("SUCCEEDED", body.get("status"));
        assertEquals("Production schedule updated.", body.get("message"));
        assertEquals(
                List.of(Map.of("objectTypeId", "ProductionOrder", "objectId", "PR001")), body.get("changedObjects"));
        assertEquals("workspace-1", actionServer.request.workspaceId());
        assertEquals("supply-chain", actionServer.request.projectId());
        assertEquals("1.0.0", actionServer.request.projectVersion());
        assertEquals("datasource-1", actionServer.request.datasourceId());
        assertEquals("reschedulePurchaseOrder", actionServer.request.actionId());
        assertEquals(new OntologyObjectSet("PurchaseOrder", List.of("PO001")), actionServer.request.targets());
        assertTrue(actionServer.request.atomic());
        assertEquals(Map.of("newScheduleDate", "2026-09-01"), actionServer.request.parameters());
        assertEquals(DIGEST, actionServer.request.context().get("metadataDigest"));
        assertEquals("snapshot-001", actionServer.request.context().get("metadataSnapshotId"));
        assertTrue(actionServer.request.idempotencyKey().startsWith("ontology-action:"));
    }

    @Test
    void executesSavedContractChangeActionWithNativeRequestShape() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId",
                        "ApplyContractChange",
                        "objectTypeId",
                        "contract",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "CT001"),
                        "parameters",
                        Map.of(
                                "changeAmount",
                                new java.math.BigDecimal("1250.50"),
                                "changeReason",
                                "Approved scope expansion")));

        assertTrue(result.getIsExecutionSuccess());
        assertEquals("ApplyContractChange", actionServer.request.actionId());
        assertEquals(new OntologyObjectSet("contract", List.of("CT001")), actionServer.request.targets());
        assertTrue(actionServer.request.atomic());
        assertEquals(
                Map.of("changeAmount", new java.math.BigDecimal("1250.50"), "changeReason", "Approved scope expansion"),
                actionServer.request.parameters());
        assertEquals(2, actionServer.request.parameters().size());
    }

    @Test
    void rejectsContractChangeMultipleObjectTargetBeforeResolvingActionServer() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();
        int[] resolverCalls = {0};
        OntologyPlugin.OntologyPluginExecutor executor =
                new OntologyPlugin.OntologyPluginExecutor(gateway, workspaceId -> {
                    resolverCalls[0]++;
                    return Mono.just(actionServer);
                });
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(Map.of(
                "operation",
                "ACTION_QUERY",
                "queryMode",
                "BUILDER",
                "actionId",
                "ApplyContractChange",
                "objectTypeId",
                "contract",
                "target",
                Map.of("source", "OBJECT_SET", "objectIds", List.of("CT001", "CT002")),
                "parameters",
                Map.of(
                        "changeAmount",
                        new java.math.BigDecimal("1250.50"),
                        "changeReason",
                        "Approved scope expansion")));

        ActionExecutionResult result =
                executor.execute(datasource(), null, action).block();

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("maxItems: 1"));
        assertEquals(0, resolverCalls[0]);
        assertEquals(0, actionServer.calls);
    }

    @Test
    void retainsAuditIdWhenTheActionServerReturnsADomainError() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();
        actionServer.domainFailure = new OntologyActionServerClient.DomainException(
                "RELATED_OBJECT_NOT_FOUND", "ProductionOrder PR001 was not found.", "audit-456");

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId", "reschedulePurchaseOrder",
                        "objectTypeId", "PurchaseOrder",
                        "target", Map.of("source", "SINGLE_OBJECT", "objectId", "PO001")));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("RELATED_OBJECT_NOT_FOUND"));
        assertTrue(result.getReadableError().contains("ProductionOrder PR001 was not found."));
        assertTrue(result.getReadableError().contains("audit-456"));
    }

    @Test
    void mapsASingleFailedActionResultToANativeQueryError() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();
        actionServer.response = new OntologyActionServerClient.Result(
                Map.of(
                        "outcomes",
                        List.of(Map.of(
                                "target",
                                Map.of("objectTypeId", "PurchaseOrder", "objectId", "PO001"),
                                "status",
                                "FAILED",
                                "changedObjects",
                                List.of(),
                                "changedProperties",
                                List.of(),
                                "error",
                                Map.of(
                                        "code", "RELATED_OBJECT_NOT_FOUND",
                                        "message", "ProductionOrder PR001 was not found."),
                                "auditId",
                                "audit-456"))),
                "audit-456");

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId", "reschedulePurchaseOrder",
                        "objectTypeId", "PurchaseOrder",
                        "target", Map.of("source", "SINGLE_OBJECT", "objectId", "PO001")));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("RELATED_OBJECT_NOT_FOUND"));
        assertTrue(result.getReadableError().contains("ProductionOrder PR001 was not found."));
        assertTrue(result.getReadableError().contains("audit-456"));
    }

    @Test
    void preservesMixedTargetActionResultsWithoutATopLevelAuditId() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();
        List<Map<String, Object>> outcomes = List.of(
                Map.of(
                        "target", Map.of("objectTypeId", "PurchaseOrder", "objectId", "PO001"),
                        "status", "SUCCEEDED",
                        "changedObjects", List.of(),
                        "changedProperties", List.of(),
                        "auditId", "audit-1"),
                Map.of(
                        "target", Map.of("objectTypeId", "PurchaseOrder", "objectId", "PO404"),
                        "status", "FAILED",
                        "changedObjects", List.of(),
                        "changedProperties", List.of(),
                        "error", Map.of("code", "TARGET_NOT_FOUND", "message", "PurchaseOrder PO404 was not found."),
                        "auditId", "audit-2"));
        actionServer.response = new OntologyActionServerClient.Result(Map.of("outcomes", outcomes), null);

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId", "reschedulePurchaseOrder",
                        "objectTypeId", "PurchaseOrder",
                        "target", Map.of("source", "SINGLE_OBJECT", "objectId", "PO001")));

        assertTrue(result.getIsExecutionSuccess());
        Map<?, ?> body = (Map<?, ?>) result.getBody();
        assertEquals(outcomes, body.get("outcomes"));
        assertFalse(body.containsKey("auditId"));
    }

    @Test
    void rejectsActionServerResponseWithoutAuditIdAsMalformed() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();
        actionServer.response = new OntologyActionServerClient.Result(Map.of("status", "accepted"), null);

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId", "reschedulePurchaseOrder",
                        "objectTypeId", "PurchaseOrder",
                        "target", Map.of("source", "SINGLE_OBJECT", "objectId", "PO001")));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Action Server returned a malformed response"));
    }

    @Test
    void returnsAReadableFailureWhenTheActionServerTransportFails() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();
        actionServer.transportFailure = new IllegalStateException("Action Server timeout");

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId", "reschedulePurchaseOrder",
                        "objectTypeId", "PurchaseOrder",
                        "target", Map.of("source", "SINGLE_OBJECT", "objectId", "PO001")));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Action Server timeout"));
    }

    @Test
    void rejectsCallerSuppliedActionServerContextBeforeItIsInvoked() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId", "reschedulePurchaseOrder",
                        "projectVersion", "2.0.0",
                        "objectTypeId", "PurchaseOrder",
                        "target", Map.of("source", "SINGLE_OBJECT", "objectId", "PO001")));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("cannot override: projectVersion"));
        assertEquals(0, actionServer.calls);
    }

    @Test
    void rejectsUnknownActionBeforeItInvokesTheActionServer() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId", "unknown",
                        "objectTypeId", "PurchaseOrder",
                        "target", Map.of("source", "SINGLE_OBJECT", "objectId", "PO001")));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Unknown ontology action"));
        assertEquals(0, actionServer.calls);
    }

    @Test
    void rejectsACrossTypeActionTargetBeforeActionServerDispatch() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId",
                        "reschedulePurchaseOrder",
                        "objectTypeId",
                        "PurchaseOrder",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "SUP001")));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Unknown object: PurchaseOrder/SUP001"));
        assertEquals(0, actionServer.calls);
    }

    @Test
    void rejectsACrossTypeActionTargetBeforeResolvingTheActionServer() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();
        int[] resolverCalls = {0};
        OntologyPlugin.OntologyPluginExecutor executor =
                new OntologyPlugin.OntologyPluginExecutor(gateway, workspaceId -> {
                    resolverCalls[0]++;
                    return Mono.just(actionServer);
                });
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(Map.of(
                "operation", "ACTION_QUERY",
                "queryMode", "BUILDER",
                "actionId", "reschedulePurchaseOrder",
                "objectTypeId", "PurchaseOrder",
                "target", Map.of("source", "SINGLE_OBJECT", "objectId", "SUP001"),
                "parameters", Map.of()));

        ActionExecutionResult result =
                executor.execute(datasource(), null, action).block();

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Unknown object: PurchaseOrder/SUP001"));
        assertEquals(0, resolverCalls[0]);
        assertEquals(0, actionServer.calls);
    }

    @Test
    void scopesFunctionAndActionMetadataToTheSelectedOwnerType() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        TriggerResultDTO functions = trigger(executor, "ONTOLOGY_FUNCTIONS", Map.of("objectTypeId", "Supplier"));
        TriggerResultDTO actions = trigger(executor, "ONTOLOGY_ACTIONS", Map.of("objectTypeId", "Supplier"));
        TriggerResultDTO links = trigger(executor, "ONTOLOGY_LINKS");

        assertEquals(
                List.of(functionMetadata("Score supplier", "supplierScore", "integer", false, true, false, 1)),
                functions.getTrigger());
        assertEquals(
                List.of(actionMetadata("Notify supplier", "notifySupplier", false, 1, false, false)),
                actions.getTrigger());
        assertEquals(
                List.of(metadata("Purchase order deliveries", "po_delivery", "link", false, true, false)),
                links.getTrigger());
    }

    @Test
    void exposesActionTargetBoundAtomicityAndConfirmationMetadata() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        TriggerResultDTO actions = trigger(executor, "ONTOLOGY_ACTIONS", Map.of("objectTypeId", "PurchaseOrder"));
        Map<?, ?> action = ((List<?>) actions.getTrigger())
                .stream()
                        .map(value -> (Map<?, ?>) value)
                        .filter(value -> "reschedulePurchaseOrder".equals(value.get("value")))
                        .findFirst()
                        .orElseThrow();

        assertEquals(1, action.get("maxItems"));
        assertEquals(true, action.get("atomic"));
        assertEquals(true, action.get("requiresConfirmation"));
    }

    @Test
    void requiresAnOwnerTypeForCapabilityMetadata() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        IllegalArgumentException function =
                assertThrows(IllegalArgumentException.class, () -> trigger(executor, "ONTOLOGY_FUNCTIONS"));
        IllegalArgumentException action =
                assertThrows(IllegalArgumentException.class, () -> trigger(executor, "ONTOLOGY_ACTIONS"));

        assertEquals("Ontology object type is required for function metadata", function.getMessage());
        assertEquals("Ontology object type is required for action metadata", action.getMessage());
    }

    @Test
    void exposesSafeDisplayNamesAndTypeMetadataFromThePinnedSnapshot() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        TriggerResultDTO functions = trigger(executor, "ONTOLOGY_FUNCTIONS", Map.of("objectTypeId", "PurchaseOrder"));
        Map<?, ?> firstFunction = ((List<?>) functions.getTrigger())
                .stream().map(value -> (Map<?, ?>) value).findFirst().orElseThrow();

        assertEquals("Calculate delay", firstFunction.get("label"));
        assertEquals("integer", firstFunction.get("dataType"));
        assertEquals("Calculate delay (integer); read-only", firstFunction.get("description"));
        assertEquals(true, firstFunction.get("readOnly"));
    }

    @Test
    void exposesPositiveFunctionTargetBoundsFromThePinnedSnapshot() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        TriggerResultDTO functions = trigger(executor, "ONTOLOGY_FUNCTIONS", Map.of("objectTypeId", "PurchaseOrder"));
        Map<?, ?> singleTargetFunction = ((List<?>) functions.getTrigger())
                .stream()
                        .map(value -> (Map<?, ?>) value)
                        .filter(function -> "delayScore".equals(function.get("value")))
                        .findFirst()
                        .orElseThrow();
        Map<?, ?> manyTargetFunction = ((List<?>) functions.getTrigger())
                .stream()
                        .map(value -> (Map<?, ?>) value)
                        .filter(function -> "manyScore".equals(function.get("value")))
                        .findFirst()
                        .orElseThrow();

        assertEquals(1, singleTargetFunction.get("maxItems"));
        assertEquals(2, manyTargetFunction.get("maxItems"));
    }

    @Test
    void exposesOrderedFunctionParameterMetadataFromThePinnedSnapshot() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        TriggerResultDTO parameters = trigger(
                executor,
                "ONTOLOGY_FUNCTION_PARAMETERS",
                Map.of("objectTypeId", "PurchaseOrder", "functionId", "delayScore"));

        assertEquals(
                List.of(metadata("delayDays", "delayDays", "integer", true, false, false)), parameters.getTrigger());
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void exposesOwnerScopedActionParameterMetadataFromThePinnedSnapshot() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        TriggerResultDTO parameters = trigger(
                executor,
                "ONTOLOGY_ACTION_PARAMETERS",
                Map.of("objectTypeId", "PurchaseOrder", "actionId", "reschedulePurchaseOrder"));

        assertEquals(
                List.of(metadata("newScheduleDate", "newScheduleDate", "string", false, false, false)),
                parameters.getTrigger());
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsMissingUnknownOrOwnerIncompatibleFunctionParameterMetadataSelectors() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        IllegalArgumentException missing = assertThrows(
                IllegalArgumentException.class, () -> trigger(executor, "ONTOLOGY_FUNCTION_PARAMETERS", Map.of()));
        IllegalArgumentException unknown = assertThrows(
                IllegalArgumentException.class,
                () -> trigger(
                        executor,
                        "ONTOLOGY_FUNCTION_PARAMETERS",
                        Map.of("objectTypeId", "PurchaseOrder", "functionId", "unknown")));
        IllegalArgumentException incompatibleOwner = assertThrows(
                IllegalArgumentException.class,
                () -> trigger(
                        executor,
                        "ONTOLOGY_FUNCTION_PARAMETERS",
                        Map.of("objectTypeId", "Supplier", "functionId", "delayScore")));

        assertEquals("Ontology function is required for parameter metadata", missing.getMessage());
        assertEquals("Unknown ontology function: unknown", unknown.getMessage());
        assertEquals("Ontology function does not apply to object type: Supplier", incompatibleOwner.getMessage());
    }

    @Test
    void rejectsOwnerIncompatibleActionParameterMetadataSelectors() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        IllegalArgumentException incompatibleOwner = assertThrows(
                IllegalArgumentException.class,
                () -> trigger(
                        executor,
                        "ONTOLOGY_ACTION_PARAMETERS",
                        Map.of("objectTypeId", "Supplier", "actionId", "reschedulePurchaseOrder")));

        assertEquals("Ontology action does not apply to object type: Supplier", incompatibleOwner.getMessage());
    }

    private static Map<String, Object> metadata(
            String label, String value, String dataType, boolean required, boolean readOnly, boolean derived) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("label", label);
        metadata.put("value", value);
        metadata.put("dataType", dataType);
        metadata.put("description", description(label, dataType, required, readOnly, derived));
        metadata.put("enumValues", List.of());
        metadata.put("referenceTypeId", null);
        metadata.put("required", required);
        metadata.put("readOnly", readOnly);
        metadata.put("derived", derived);
        return metadata;
    }

    private static Map<String, Object> functionMetadata(
            String label,
            String value,
            String dataType,
            boolean required,
            boolean readOnly,
            boolean derived,
            int maxItems) {
        Map<String, Object> metadata = metadata(label, value, dataType, required, readOnly, derived);
        metadata.put("maxItems", maxItems);
        return metadata;
    }

    private static Map<String, Object> actionMetadata(
            String label, String value, boolean readOnly, int maxItems, boolean atomic, boolean requiresConfirmation) {
        Map<String, Object> metadata = metadata(label, value, "action", false, readOnly, false);
        metadata.put("maxItems", maxItems);
        metadata.put("atomic", atomic);
        metadata.put("requiresConfirmation", requiresConfirmation);
        return metadata;
    }

    private static String description(
            String label, String dataType, boolean required, boolean readOnly, boolean derived) {
        String description = label + " (" + dataType + ")";
        if (required) description += "; required";
        if (readOnly) description += "; read-only";
        if (derived) description += "; derived";
        return description;
    }

    private ActionExecutionResult execute(RecordingGateway gateway, String operation, Map<String, Object> definition) {
        return execute(gateway, null, operation, definition);
    }

    private ActionExecutionResult execute(
            RecordingGateway gateway,
            RecordingActionServer actionServer,
            String operation,
            Map<String, Object> definition) {
        OntologyPlugin.OntologyPluginExecutor executor = actionServer == null
                ? new OntologyPlugin.OntologyPluginExecutor(gateway)
                : new OntologyPlugin.OntologyPluginExecutor(gateway, workspaceId -> Mono.just(actionServer));
        ActionConfiguration action = new ActionConfiguration();
        if ("FUNCTION_QUERY".equals(operation)) {
            Map<String, Object> formData = new LinkedHashMap<>();
            formData.put("operation", operation);
            formData.put("queryMode", "BUILDER");
            formData.put("objectTypeId", definition.getOrDefault("objectTypeId", "PurchaseOrder"));
            formData.put("functionId", definition.get("functionId"));
            formData.put(
                    "target",
                    definition.getOrDefault("target", Map.of("source", "SINGLE_OBJECT", "objectId", "PO002")));
            formData.put("parameters", definition.getOrDefault("parameters", Map.of()));
            action.setFormData(formData);
        } else if ("ACTION_QUERY".equals(operation)) {
            Map<String, Object> formData = new LinkedHashMap<>();
            formData.put("operation", operation);
            formData.put("queryMode", "BUILDER");
            formData.putAll(definition);
            formData.putIfAbsent("parameters", Map.of());
            action.setFormData(formData);
        } else {
            action.setFormData(Map.of("operation", operation, "definition", definition));
        }
        return executor.execute(datasource(), null, action).block();
    }

    private ActionExecutionResult executeAdvanced(RecordingGateway gateway, String functionId, String parameters) {
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(Map.of(
                "operation", Map.of("data", "FUNCTION_QUERY"),
                "queryMode", Map.of("data", "ADVANCED"),
                "objectTypeId", Map.of("data", "PurchaseOrder"),
                "functionId", Map.of("data", functionId),
                "definition",
                        Map.of(
                                "data",
                                "{\"target\":{\"source\":\"SINGLE_OBJECT\",\"objectId\":\"PO002\"}," + "\"parameters\":"
                                        + parameters + "}")));
        return new OntologyPlugin.OntologyPluginExecutor(gateway)
                .execute(datasource(), null, action)
                .block();
    }

    private OntologyDatasourceConfiguration datasource() {
        return new OntologyDatasourceConfiguration(
                "supply-chain", "1.0.0", "snapshot-001", DIGEST, "workspace-1", "datasource-1", "demo", null);
    }

    private TriggerResultDTO trigger(OntologyPlugin.OntologyPluginExecutor executor, String requestType) {
        return trigger(executor, requestType, Map.of());
    }

    private TriggerResultDTO trigger(
            OntologyPlugin.OntologyPluginExecutor executor, String requestType, Map<String, Object> parameters) {
        DatasourceConfiguration datasourceConfiguration = new DatasourceConfiguration();
        return executor.trigger(
                        datasource(), datasourceConfiguration, new TriggerRequestDTO(requestType, parameters, null))
                .block();
    }

    private static final class RecordingGateway implements OntologyRuntimeGateway {
        private final Snapshot snapshot = new Snapshot(
                "snapshot-001",
                DIGEST,
                List.of(),
                List.of(
                        new FunctionMetadata(
                                "delayScore",
                                "Calculate delay",
                                "integer",
                                List.of("PurchaseOrder"),
                                List.of(
                                        new PropertyMetadata("delayDays", "integer", false, true),
                                        new PropertyMetadata(
                                                "internalToken",
                                                "Internal token",
                                                "string",
                                                true,
                                                false,
                                                false,
                                                false,
                                                List.of(),
                                                null))),
                        new FunctionMetadata(
                                "optionalScore",
                                "Optional score",
                                "integer",
                                List.of("PurchaseOrder"),
                                List.of(new PropertyMetadata("threshold", "integer", false, false))),
                        new FunctionMetadata(
                                "protectedScore",
                                "Protected score",
                                "integer",
                                List.of("PurchaseOrder"),
                                List.of(
                                        new PropertyMetadata("input", "string", false, true),
                                        new PropertyMetadata(
                                                "readOnlyValue",
                                                "Read-only value",
                                                "string",
                                                false,
                                                true,
                                                true,
                                                false,
                                                List.of(),
                                                null),
                                        new PropertyMetadata(
                                                "derivedValue",
                                                "Derived value",
                                                "string",
                                                false,
                                                true,
                                                false,
                                                true,
                                                List.of(),
                                                null))),
                        new FunctionMetadata(
                                "CalculateDelayDays",
                                "Calculate delay days",
                                "integer",
                                List.of("PurchaseOrder"),
                                List.of()),
                        new FunctionMetadata(
                                "manyScore", "Many score", "integer", List.of("PurchaseOrder"), List.of(), 2),
                        new FunctionMetadata(
                                "supplierScore", "Score supplier", "integer", List.of("Supplier"), List.of())),
                List.of(new LinkMetadata(
                        "po_delivery", "Purchase order deliveries", "PurchaseOrder", "DeliveryOrder", "many")),
                List.of(
                        new ActionMetadata(
                                "reschedulePurchaseOrder",
                                "Reschedule purchase order",
                                List.of("PurchaseOrder"),
                                1,
                                true,
                                List.of(new PropertyMetadata("newScheduleDate", "string", false, false)),
                                true),
                        new ActionMetadata(
                                "ApplyContractChange",
                                "Apply contract change",
                                List.of("contract"),
                                1,
                                true,
                                List.of(
                                        new PropertyMetadata("changeAmount", "decimal", false, true),
                                        new PropertyMetadata("changeReason", "string", false, true)),
                                true),
                        new ActionMetadata(
                                "notifySupplier", "Notify supplier", List.of("Supplier"), 1, false, List.of(), false)));
        private Map<String, Object> functionParameters;
        private OntologyObjectSet functionTargets;
        private String linkId;
        private int functionCalls;
        private int linkCalls;
        private List<Map<String, Object>> linkResult = List.of(Map.of("id", "delivery-1"));
        private RuntimeException linkFailure;
        private final Map<String, String> runtimeObjectTypes = Map.of(
                "PO001", "PurchaseOrder",
                "PO002", "PurchaseOrder",
                "PO003", "PurchaseOrder",
                "CT001", "contract",
                "CT002", "contract",
                "SUP001", "Supplier");

        @Override
        public Mono<Snapshot> getRequiredSnapshot(String snapshotId, String digest) {
            return Mono.just(snapshot);
        }

        @Override
        public Mono<ObjectQueryResult> queryObjects(Snapshot snapshot, String objectTypeId, ObjectQuery query) {
            return Mono.error(new UnsupportedOperationException());
        }

        @Override
        public Mono<Void> validateTargetObjects(Snapshot snapshot, OntologyObjectSet targets) {
            return Flux.fromIterable(targets.objectIds())
                    .concatMap(objectId -> targets.objectTypeId().equals(runtimeObjectTypes.get(objectId))
                            ? Mono.<Void>empty()
                            : Mono.error(new IllegalArgumentException(
                                    "Unknown object: " + targets.objectTypeId() + "/" + objectId)))
                    .then();
        }

        @Override
        public Mono<Object> executeFunction(
                Snapshot snapshot, String functionId, OntologyObjectSet targets, Map<String, Object> parameters) {
            functionCalls++;
            functionTargets = targets;
            functionParameters = parameters;
            return Mono.just(50);
        }

        @Override
        public Mono<List<Map<String, Object>>> resolveLink(
                Snapshot snapshot, String sourceTypeId, String sourceId, String requestedLinkId) {
            linkCalls++;
            linkId = requestedLinkId;
            if (linkFailure != null) {
                return Mono.error(linkFailure);
            }
            return Mono.just(linkResult);
        }
    }

    private static final class RecordingActionServer implements OntologyActionServerClient {
        private Request request;
        private int calls;
        private DomainException domainFailure;
        private RuntimeException transportFailure;
        private Result response = new Result(Map.of("status", "accepted"), "audit-123");

        @Override
        public Mono<Result> execute(Request actionRequest) {
            calls++;
            request = actionRequest;
            if (domainFailure != null) {
                return Mono.error(domainFailure);
            }
            if (transportFailure != null) {
                return Mono.error(transportFailure);
            }
            return Mono.just(response);
        }
    }
}
