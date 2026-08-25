package com.celanworksmith.demoactionserver.api;

import com.celanworksmith.demoactionserver.audit.ActionExecutionAuditDocument;
import com.celanworksmith.demoactionserver.audit.ActionExecutionAuditStore;
import com.celanworksmith.demoactionserver.config.DemoActionServerRequestProperties;
import com.celanworksmith.demoactionserver.handler.DemoActionHandler;
import com.celanworksmith.demoactionserver.handler.DemoActionHandlerRegistry;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.DomainFailure;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteSuccess;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ActionExecutionServiceTest {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-08-25T00:00:00Z"), ZoneOffset.UTC);

    private final ActionExecutionAuditStore auditStore = mock(ActionExecutionAuditStore.class);
    private final TransactionalOperator transactionalOperator = mock(TransactionalOperator.class);

    @BeforeEach
    void runTransactionBodyDirectly() {
        when(transactionalOperator.transactional(any(Mono.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void auditsDeclaredHandlerDomainFailureAsUnprocessableResult() {
        when(auditStore.findByIdempotencyKey("key-1")).thenReturn(Mono.empty());
        when(auditStore.createIfAbsent(any()))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0, ActionExecutionAuditDocument.class)));
        when(auditStore.markFailed(anyString(), any(), any())).thenReturn(Mono.just(runningAudit("completed")));
        ActionExecutionService service = service(
                handler(auditId -> Mono.error(new ActionExecutionService.DeclaredDomainException(new DomainFailure(
                        "v1", auditId, "RELATED_OBJECT_NOT_FOUND", "ProductionOrder PR001 was not found.")))));

        StepVerifier.create(service.execute(request()))
                .assertNext(result -> {
                    assertThat(result).isInstanceOf(ActionExecutionService.ExecutionResult.Failure.class);
                    DomainFailure failure = ((ActionExecutionService.ExecutionResult.Failure) result).response();
                    assertThat(failure.code()).isEqualTo("RELATED_OBJECT_NOT_FOUND");
                    assertThat(failure.auditId()).isNotBlank();
                })
                .verifyComplete();

        ArgumentCaptor<DomainFailure> persistedFailure = ArgumentCaptor.forClass(DomainFailure.class);
        verify(auditStore).markFailed(anyString(), any(), persistedFailure.capture());
        assertThat(persistedFailure.getValue().code()).isEqualTo("RELATED_OBJECT_NOT_FOUND");
    }

    @Test
    void auditsUnexpectedHandlerExceptionAsSafeInternalResult() {
        when(auditStore.findByIdempotencyKey("key-1")).thenReturn(Mono.empty());
        when(auditStore.createIfAbsent(any()))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0, ActionExecutionAuditDocument.class)));
        when(auditStore.markFailed(anyString(), any(), any())).thenReturn(Mono.just(runningAudit("completed")));
        ActionExecutionService service =
                service(handler(auditId -> Mono.error(new IllegalStateException("mongodb password leaked"))));

        StepVerifier.create(service.execute(request()))
                .assertNext(result -> {
                    assertThat(result).isInstanceOf(ActionExecutionService.ExecutionResult.Failure.class);
                    DomainFailure failure = ((ActionExecutionService.ExecutionResult.Failure) result).response();
                    assertThat(failure.code()).isEqualTo("ACTION_EXECUTION_FAILED");
                    assertThat(failure.message()).isEqualTo("Action execution failed.");
                    assertThat(failure.auditId()).isNotBlank();
                })
                .verifyComplete();

        ArgumentCaptor<DomainFailure> persistedFailure = ArgumentCaptor.forClass(DomainFailure.class);
        verify(auditStore).markFailed(anyString(), any(), persistedFailure.capture());
        assertThat(persistedFailure.getValue().message()).doesNotContain("password");
    }

    @Test
    void replaysStoredRelatedObjectFailureWithoutDispatchingHandler() {
        DomainFailure storedFailure = new DomainFailure(
                "v1", "audit-replay", "RELATED_OBJECT_NOT_FOUND", "ProductionOrder PR001 was not found.");
        when(auditStore.findByIdempotencyKey("key-1"))
                .thenReturn(Mono.just(failedAudit("audit-replay", storedFailure)));
        AtomicInteger handlerCalls = new AtomicInteger();
        ActionExecutionService service = service(handler(auditId -> {
            handlerCalls.incrementAndGet();
            return Mono.just(success(auditId));
        }));

        StepVerifier.create(service.execute(request()))
                .assertNext(result -> assertThat(((ActionExecutionService.ExecutionResult.Failure) result).response())
                        .isEqualTo(storedFailure))
                .verifyComplete();

        assertThat(handlerCalls).hasValue(0);
        verify(auditStore, never()).createIfAbsent(any());
    }

    @Test
    void auditsAnyConfiguredIdentityOrSnapshotContextMismatchBeforeHandlerDispatch() {
        AtomicInteger handlerCalls = new AtomicInteger();
        when(auditStore.findByIdempotencyKey(anyString())).thenReturn(Mono.empty());
        when(auditStore.createIfAbsent(any()))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0, ActionExecutionAuditDocument.class)));
        when(auditStore.markFailed(anyString(), any(), any())).thenReturn(Mono.just(runningAudit("completed")));
        ActionExecutionService service = service(handler(auditId -> {
            handlerCalls.incrementAndGet();
            return Mono.just(success(auditId));
        }));

        for (ExecuteRequest invalidRequest : List.of(
                request("other-workspace", "project-1", "1.0.0", "datasource-1", context()),
                request("workspace-1", "other-project", "1.0.0", "datasource-1", context()),
                request("workspace-1", "project-1", "2.0.0", "datasource-1", context()),
                request("workspace-1", "project-1", "1.0.0", "other-datasource", context()),
                request("workspace-1", "project-1", "1.0.0", "datasource-1", null),
                request("workspace-1", "project-1", "1.0.0", "datasource-1", Map.of("metadataDigest", "sha256:abc")),
                request(
                        "workspace-1",
                        "project-1",
                        "1.0.0",
                        "datasource-1",
                        Map.of("metadataSnapshotId", "snapshot-1")))) {
            StepVerifier.create(service.execute(invalidRequest))
                    .assertNext(result -> {
                        DomainFailure failure = ((ActionExecutionService.ExecutionResult.Failure) result).response();
                        assertThat(failure.code()).isEqualTo("INVALID_REQUEST");
                        assertThat(failure.auditId()).isNotBlank();
                    })
                    .verifyComplete();
        }

        assertThat(handlerCalls).hasValue(0);
        verify(auditStore, times(7)).markFailed(anyString(), any(), any());
    }

    private ActionExecutionService service(DemoActionHandler handler) {
        return new ActionExecutionService(
                auditStore,
                transactionalOperator,
                new DemoActionHandlerRegistry(List.of(handler)),
                requestProperties(),
                CLOCK);
    }

    private static DemoActionHandler handler(java.util.function.Function<String, Mono<ExecuteSuccess>> behavior) {
        return new DemoActionHandler() {
            @Override
            public String actionId() {
                return "UpdateProductionSchedule";
            }

            @Override
            public Mono<ExecuteSuccess> execute(ExecuteRequest request, String auditId) {
                return behavior.apply(auditId);
            }
        };
    }

    private static DemoActionServerRequestProperties requestProperties() {
        DemoActionServerRequestProperties properties = new DemoActionServerRequestProperties();
        properties.setWorkspaceId("workspace-1");
        properties.setProjectId("project-1");
        properties.setProjectVersion("1.0.0");
        properties.setDatasourceId("datasource-1");
        properties.setMetadataSnapshotId("snapshot-1");
        properties.setMetadataDigest("sha256:abc");
        return properties;
    }

    private static ExecuteRequest request() {
        return request("workspace-1", "project-1", "1.0.0", "datasource-1", context());
    }

    private static ExecuteRequest request(
            String workspaceId,
            String projectId,
            String projectVersion,
            String datasourceId,
            Map<String, Object> context) {
        return new ExecuteRequest(
                "v1",
                workspaceId,
                projectId,
                projectVersion,
                datasourceId,
                "UpdateProductionSchedule",
                "PurchaseOrder",
                "PO001",
                Map.of("newScheduleDate", "2026-09-01T00:00:00Z"),
                context,
                "key-1");
    }

    private static Map<String, Object> context() {
        return Map.of("metadataSnapshotId", "snapshot-1", "metadataDigest", "sha256:abc");
    }

    private static ActionExecutionAuditDocument runningAudit(String auditId) {
        return new ActionExecutionAuditDocument(
                auditId,
                "key-1",
                "workspace-1",
                "project-1",
                "1.0.0",
                "datasource-1",
                "UpdateProductionSchedule",
                "PurchaseOrder",
                "PO001",
                Instant.parse("2026-08-25T00:00:00Z"),
                null,
                "RUNNING",
                null,
                List.of(),
                List.of());
    }

    private static ActionExecutionAuditDocument failedAudit(String auditId, DomainFailure failure) {
        ActionExecutionAuditDocument runningAudit = runningAudit(auditId);
        return new ActionExecutionAuditDocument(
                runningAudit.auditId(),
                runningAudit.idempotencyKey(),
                runningAudit.workspaceId(),
                runningAudit.projectId(),
                runningAudit.projectVersion(),
                runningAudit.datasourceId(),
                runningAudit.actionId(),
                runningAudit.objectTypeId(),
                runningAudit.objectId(),
                runningAudit.startedAt(),
                Instant.parse("2026-08-25T00:00:01Z"),
                "FAILED",
                failure,
                List.of(),
                List.of());
    }

    private static ExecuteSuccess success(String auditId) {
        return new ExecuteSuccess("v1", auditId, "SUCCEEDED", "Production schedule updated.", List.of(), List.of());
    }
}
