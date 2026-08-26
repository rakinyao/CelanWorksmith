package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionExecutionResult;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.TriggerRequestDTO;
import com.appsmith.external.models.TriggerResultDTO;
import com.celanworksmith.ontology.datasource.OntologyActionServerClient;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway;
import org.junit.jupiter.api.Test;
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
                        "actionId", "reschedulePurchaseOrder",
                        "objectTypeId", "PurchaseOrder",
                        "target", Map.of("source", "SINGLE_OBJECT", "objectId", "PO001"),
                        "parameters", Map.of("newScheduleDate", "2026-09-01")));

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
        assertEquals("PurchaseOrder", actionServer.request.objectTypeId());
        assertEquals("PO001", actionServer.request.objectId());
        assertEquals(Map.of("newScheduleDate", "2026-09-01"), actionServer.request.parameters());
        assertEquals(DIGEST, actionServer.request.context().get("metadataDigest"));
        assertEquals("snapshot-001", actionServer.request.context().get("metadataSnapshotId"));
        assertTrue(actionServer.request.idempotencyKey().startsWith("ontology-action:"));
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
    void exposesPinnedFunctionActionAndLinkMetadataToTheNativeQueryEditor() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        TriggerResultDTO functions = trigger(executor, "ONTOLOGY_FUNCTIONS");
        TriggerResultDTO actions = trigger(executor, "ONTOLOGY_ACTIONS");
        TriggerResultDTO links = trigger(executor, "ONTOLOGY_LINKS");

        assertEquals(
                List.of(
                        metadata("Calculate delay", "delayScore", "integer", false, true, false),
                        metadata("Optional score", "optionalScore", "integer", false, true, false),
                        metadata("Protected score", "protectedScore", "integer", false, true, false)),
                functions.getTrigger());
        assertEquals(
                List.of(metadata(
                        "Reschedule purchase order", "reschedulePurchaseOrder", "action", false, false, false)),
                actions.getTrigger());
        assertEquals(
                List.of(metadata("Purchase order deliveries", "po_delivery", "link", false, true, false)),
                links.getTrigger());
    }

    @Test
    void exposesSafeDisplayNamesAndTypeMetadataFromThePinnedSnapshot() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        TriggerResultDTO functions = trigger(executor, "ONTOLOGY_FUNCTIONS");
        Map<?, ?> firstFunction = ((List<?>) functions.getTrigger())
                .stream().map(value -> (Map<?, ?>) value).findFirst().orElseThrow();

        assertEquals("Calculate delay", firstFunction.get("label"));
        assertEquals("integer", firstFunction.get("dataType"));
        assertEquals("Calculate delay (integer); read-only", firstFunction.get("description"));
        assertEquals(true, firstFunction.get("readOnly"));
    }

    @Test
    void exposesOrderedFunctionParameterMetadataFromThePinnedSnapshot() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        TriggerResultDTO parameters =
                trigger(executor, "ONTOLOGY_FUNCTION_PARAMETERS", Map.of("functionId", "delayScore"));

        assertEquals(
                List.of(metadata("delayDays", "delayDays", "integer", true, false, false)), parameters.getTrigger());
        assertEquals(0, gateway.functionCalls);
    }

    @Test
    void rejectsMissingOrUnknownFunctionParameterMetadataSelectors() {
        RecordingGateway gateway = new RecordingGateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        IllegalArgumentException missing = assertThrows(
                IllegalArgumentException.class, () -> trigger(executor, "ONTOLOGY_FUNCTION_PARAMETERS", Map.of()));
        IllegalArgumentException unknown = assertThrows(
                IllegalArgumentException.class,
                () -> trigger(executor, "ONTOLOGY_FUNCTION_PARAMETERS", Map.of("functionId", "unknown")));

        assertEquals("Ontology function is required for parameter metadata", missing.getMessage());
        assertEquals("Unknown ontology function: unknown", unknown.getMessage());
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
            action.setFormData(Map.of(
                    "operation",
                    operation,
                    "queryMode",
                    "BUILDER",
                    "objectTypeId",
                    "PurchaseOrder",
                    "functionId",
                    definition.get("functionId"),
                    "target",
                    Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                    "parameters",
                    definition.getOrDefault("parameters", Map.of())));
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
                "definition", Map.of(
                        "data",
                        "{\"target\":{\"source\":\"SINGLE_OBJECT\",\"objectId\":\"PO002\"},"
                                + "\"parameters\":" + parameters + "}")));
        return new OntologyPlugin.OntologyPluginExecutor(gateway)
                .execute(datasource(), null, action)
                .block();
    }

    private OntologyDatasourceConfiguration datasource() {
        return new OntologyDatasourceConfiguration(
                "supply-chain", "1.0.0", "snapshot-001", DIGEST, "provider-1", "workspace-1", "datasource-1");
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
                                                null)))),
                List.of(new LinkMetadata(
                        "po_delivery", "Purchase order deliveries", "PurchaseOrder", "DeliveryOrder", "many")),
                List.of(new ActionMetadata(
                        "reschedulePurchaseOrder",
                        "Reschedule purchase order",
                        List.of("PurchaseOrder"),
                        false,
                        List.of(new PropertyMetadata("newScheduleDate", "string", false, false)))));
        private Map<String, Object> functionParameters;
        private String linkId;
        private int functionCalls;
        private int linkCalls;
        private List<Map<String, Object>> linkResult = List.of(Map.of("id", "delivery-1"));
        private RuntimeException linkFailure;

        @Override
        public Mono<Snapshot> getRequiredSnapshot(String snapshotId, String digest) {
            return Mono.just(snapshot);
        }

        @Override
        public Mono<ObjectQueryResult> queryObjects(
                String providerId, Snapshot snapshot, String objectTypeId, ObjectQuery query) {
            return Mono.error(new UnsupportedOperationException());
        }

        @Override
        public Mono<Object> executeFunction(
                String providerId, Snapshot snapshot, String functionId, Map<String, Object> parameters) {
            functionCalls++;
            functionParameters = parameters;
            return Mono.just(50);
        }

        @Override
        public Mono<List<Map<String, Object>>> resolveLink(
                String providerId, Snapshot snapshot, String sourceTypeId, String sourceId, String requestedLinkId) {
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
