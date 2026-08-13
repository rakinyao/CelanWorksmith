package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionExecutionResult;
import com.celanworksmith.ontology.datasource.OntologyActionServerClient;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
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
    void executesActionThroughTheWorkspaceActionServerWithTrustedContext() {
        RecordingGateway gateway = new RecordingGateway();
        RecordingActionServer actionServer = new RecordingActionServer();

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId", "reschedulePurchaseOrder",
                        "objectTypeId", "PurchaseOrder",
                        "objectId", "PO001",
                        "parameters", Map.of("newScheduleDate", "2026-09-01")));

        assertTrue(result.getIsExecutionSuccess());
        assertEquals(Map.of("status", "accepted", "auditId", "audit-123"), result.getBody());
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
        actionServer.domainFailure = new OntologyActionServerClient.DomainException("Schedule rejected", "audit-456");

        ActionExecutionResult result = execute(
                gateway,
                actionServer,
                "ACTION_QUERY",
                Map.of(
                        "actionId", "reschedulePurchaseOrder",
                        "objectTypeId", "PurchaseOrder",
                        "objectId", "PO001"));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Schedule rejected"));
        assertTrue(result.getReadableError().contains("audit-456"));
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
                        "objectId", "PO001"));

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
                Map.of("actionId", "unknown", "objectTypeId", "PurchaseOrder", "objectId", "PO001"));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Unknown ontology action"));
        assertEquals(0, actionServer.calls);
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
        action.setFormData(Map.of("operation", operation, "definition", definition));
        return executor.execute(datasource(), null, action).block();
    }

    private OntologyDatasourceConfiguration datasource() {
        return new OntologyDatasourceConfiguration(
                "supply-chain", "1.0.0", "snapshot-001", DIGEST, "provider-1", "workspace-1", "datasource-1");
    }

    private static final class RecordingGateway implements OntologyRuntimeGateway {
        private final Snapshot snapshot = new Snapshot(
                "snapshot-001",
                DIGEST,
                List.of(),
                List.of(
                        new FunctionMetadata(
                                "delayScore",
                                "integer",
                                List.of(new PropertyMetadata("delayDays", "integer", false, true))),
                        new FunctionMetadata(
                                "optionalScore",
                                "integer",
                                List.of(new PropertyMetadata("threshold", "integer", false, false)))),
                List.of(new LinkMetadata("po_delivery", "PurchaseOrder", "DeliveryOrder")),
                List.of(new ActionMetadata(
                        "reschedulePurchaseOrder",
                        "PurchaseOrder",
                        List.of(new PropertyMetadata("newScheduleDate", "string", false, false)))));
        private Map<String, Object> functionParameters;
        private String linkId;
        private int functionCalls;
        private int linkCalls;

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
            return Mono.just(List.of(Map.of("id", "delivery-1")));
        }
    }

    private static final class RecordingActionServer implements OntologyActionServerClient {
        private Request request;
        private int calls;
        private DomainException domainFailure;

        @Override
        public Mono<Result> execute(Request actionRequest) {
            calls++;
            request = actionRequest;
            if (domainFailure != null) {
                return Mono.error(domainFailure);
            }
            return Mono.just(new Result(Map.of("status", "accepted"), "audit-123"));
        }
    }
}
