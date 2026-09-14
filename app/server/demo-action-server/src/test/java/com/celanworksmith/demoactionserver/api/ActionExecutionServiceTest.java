package com.celanworksmith.demoactionserver.api;

import com.celanworksmith.demoactionserver.audit.ActionExecutionAuditDocument;
import com.celanworksmith.demoactionserver.audit.ActionExecutionAuditStore;
import com.celanworksmith.demoactionserver.config.DemoActionServerRequestProperties;
import com.celanworksmith.demoactionserver.handler.DemoActionHandler;
import com.celanworksmith.demoactionserver.handler.DemoActionHandlerRegistry;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.DomainFailure;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteSuccess;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.TargetOutcome;
import com.celanworksmith.ontology.datasource.OntologyObjectSet;
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
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
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
        when(auditStore.findByIdempotencyKey("key-1:UE8wMDE")).thenReturn(Mono.empty());
        when(auditStore.createIfAbsent(any()))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0, ActionExecutionAuditDocument.class)));
        when(auditStore.markFailed(anyString(), any(), any())).thenReturn(Mono.just(runningAudit("completed")));
        ActionExecutionService service = service(handler(
                (request, auditId) -> Mono.error(new ActionExecutionService.DeclaredDomainException(new DomainFailure(
                        "v1", auditId, "RELATED_OBJECT_NOT_FOUND", "ProductionOrder PR001 was not found.")))));

        StepVerifier.create(service.execute(request()))
                .assertNext(result -> {
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
        when(auditStore.findByIdempotencyKey("key-1:UE8wMDE")).thenReturn(Mono.empty());
        when(auditStore.createIfAbsent(any()))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0, ActionExecutionAuditDocument.class)));
        when(auditStore.markFailed(anyString(), any(), any())).thenReturn(Mono.just(runningAudit("completed")));
        ActionExecutionService service = service(
                handler((request, auditId) -> Mono.error(new IllegalStateException("mongodb password leaked"))));

        StepVerifier.create(service.execute(request()))
                .assertNext(result -> {
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
        when(auditStore.findByIdempotencyKey("key-1:UE8wMDE"))
                .thenReturn(Mono.just(failedAudit("audit-replay", storedFailure)));
        AtomicInteger handlerCalls = new AtomicInteger();
        ActionExecutionService service = service(handler((request, auditId) -> {
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
    void rejectsAnyConfiguredIdentityOrSnapshotContextMismatchBeforeAuditCreation() {
        AtomicInteger handlerCalls = new AtomicInteger();
        ActionExecutionService service = service(handler((request, auditId) -> {
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
                        assertThat(failure.auditId()).isNull();
                    })
                    .verifyComplete();
        }

        assertThat(handlerCalls).hasValue(0);
        verifyNoInteractions(auditStore);
    }

    @Test
    void rejectsMismatchedConfiguredPinBeforeReplayingAnyStoredAuditState() {
        AtomicInteger handlerCalls = new AtomicInteger();
        ActionExecutionService service = service(handler((request, auditId) -> {
            handlerCalls.incrementAndGet();
            return Mono.just(success(auditId));
        }));

        for (ActionExecutionAuditDocument storedAudit : List.of(
                succeededAudit("audit-succeeded"),
                failedAudit(
                        "audit-failed",
                        new DomainFailure("v1", "audit-failed", "RELATED_OBJECT_NOT_FOUND", "Stored failure.")),
                runningAudit("audit-running"))) {
            when(auditStore.findByIdempotencyKey("key-1:UE8wMDE")).thenReturn(Mono.just(storedAudit));

            StepVerifier.create(service.execute(
                            request("other-workspace", "project-1", "1.0.0", "datasource-1", context())))
                    .assertNext(result -> {
                        assertThat(result).isInstanceOf(ActionExecutionService.ExecutionResult.Failure.class);
                        DomainFailure failure = ((ActionExecutionService.ExecutionResult.Failure) result).response();
                        assertThat(failure.code()).isEqualTo("INVALID_REQUEST");
                        assertThat(failure.auditId()).isNull();
                    })
                    .verifyComplete();
        }

        assertThat(handlerCalls).hasValue(0);
        verifyNoInteractions(auditStore);
    }

    @Test
    void retainsOrderedAuditedOutcomesWhenOneNonAtomicTargetFails() {
        when(auditStore.findByIdempotencyKey(anyString())).thenReturn(Mono.empty());
        when(auditStore.createIfAbsent(any()))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0, ActionExecutionAuditDocument.class)));
        when(auditStore.markSucceeded(anyString(), any(), anyString(), any(), any()))
                .thenAnswer(invocation -> Mono.just(runningAudit(invocation.getArgument(0))));
        when(auditStore.markFailed(anyString(), any(), any()))
                .thenAnswer(invocation -> Mono.just(runningAudit(invocation.getArgument(0))));
        ActionExecutionService service = service(handler((request, auditId) -> {
            String objectId = request.targets().objectIds().getFirst();
            if ("PO404".equals(objectId)) {
                return Mono.error(new ActionExecutionService.DeclaredDomainException(
                        new DomainFailure("v1", auditId, "TARGET_NOT_FOUND", "PurchaseOrder PO404 was not found.")));
            }
            return Mono.just(success(auditId, objectId));
        }));

        StepVerifier.create(service.execute(request(List.of("PO001", "PO404", "PO003"), false)))
                .assertNext(result -> {
                    assertThat(result).isInstanceOf(ActionExecutionService.ExecutionResult.Success.class);
                    ExecuteSuccess success = ((ActionExecutionService.ExecutionResult.Success) result).response();
                    assertThat(success.outcomes()).hasSize(3);
                    assertThat(success.outcomes())
                            .extracting(outcome -> outcome.target().objectId(), TargetOutcome::status)
                            .containsExactly(
                                    org.assertj.core.groups.Tuple.tuple("PO001", "SUCCEEDED"),
                                    org.assertj.core.groups.Tuple.tuple("PO404", "FAILED"),
                                    org.assertj.core.groups.Tuple.tuple("PO003", "SUCCEEDED"));
                    assertThat(success.outcomes().get(1).error().code()).isEqualTo("TARGET_NOT_FOUND");
                    assertThat(success.outcomes())
                            .allSatisfy(outcome -> assertThat(outcome.auditId()).isNotBlank());
                })
                .verifyComplete();

        verify(auditStore, org.mockito.Mockito.times(3)).createIfAbsent(any());
        verify(auditStore, org.mockito.Mockito.times(2)).markSucceeded(anyString(), any(), anyString(), any(), any());
        verify(auditStore).markFailed(anyString(), any(), any());
    }

    @Test
    void rejectsAtomicRequestsWithMultipleTargetsBeforeDispatchingHandlersOrCreatingAudits() {
        AtomicInteger handlerCalls = new AtomicInteger();
        ActionExecutionService service = service(handler((request, auditId) -> {
            handlerCalls.incrementAndGet();
            return Mono.just(success(auditId, request.targets().objectIds().getFirst()));
        }));

        StepVerifier.create(service.execute(request(List.of("PO001", "PO002"), true)))
                .assertNext(result -> {
                    assertThat(result).isInstanceOf(ActionExecutionService.ExecutionResult.Failure.class);
                    assertThat(((ActionExecutionService.ExecutionResult.Failure) result)
                                    .response()
                                    .code())
                            .isEqualTo("INVALID_REQUEST");
                })
                .verifyComplete();

        assertThat(handlerCalls).hasValue(0);
        verifyNoInteractions(auditStore);
        verify(transactionalOperator, never()).transactional(any(Mono.class));
    }

    @Test
    void executesAndReplaysAtomicSingleTargetWithoutSecondDispatch() {
        ActionExecutionAuditDocument[] stored = new ActionExecutionAuditDocument[1];
        when(auditStore.findByIdempotencyKey("atomic-key"))
                .thenAnswer(invocation -> stored[0] == null ? Mono.empty() : Mono.just(stored[0]));
        when(auditStore.createIfAbsent(any())).thenAnswer(invocation -> {
            stored[0] = invocation.getArgument(0, ActionExecutionAuditDocument.class);
            return Mono.just(stored[0]);
        });
        when(auditStore.markSucceeded(anyString(), any(), anyString(), any(), any()))
                .thenAnswer(invocation -> {
                    ActionExecutionAuditDocument running = stored[0];
                    stored[0] = new ActionExecutionAuditDocument(
                            running.auditId(),
                            running.idempotencyKey(),
                            running.workspaceId(),
                            running.projectId(),
                            running.projectVersion(),
                            running.datasourceId(),
                            running.actionId(),
                            running.objectTypeId(),
                            running.objectId(),
                            running.startedAt(),
                            invocation.getArgument(1, Instant.class),
                            "SUCCEEDED",
                            null,
                            invocation.getArgument(3),
                            invocation.getArgument(4),
                            "Action completed.",
                            running.parameterSummary());
                    return Mono.just(stored[0]);
                });
        AtomicInteger handlerCalls = new AtomicInteger();
        ActionExecutionService service = service(handler((request, auditId) -> {
            handlerCalls.incrementAndGet();
            return Mono.just(success(auditId));
        }));
        ExecuteRequest request = request(List.of("PO001"), true, "atomic-key");

        StepVerifier.create(service.execute(request))
                .assertNext(
                        result -> assertThat(result).isInstanceOf(ActionExecutionService.ExecutionResult.Success.class))
                .verifyComplete();
        StepVerifier.create(service.execute(request))
                .assertNext(result -> {
                    assertThat(result).isInstanceOf(ActionExecutionService.ExecutionResult.Success.class);
                    ExecuteSuccess response = ((ActionExecutionService.ExecutionResult.Success) result).response();
                    assertThat(response.outcomes()).hasSize(1);
                    assertThat(response.outcomes().getFirst().auditId()).isEqualTo(stored[0].auditId());
                })
                .verifyComplete();

        assertThat(handlerCalls).hasValue(1);
        verify(auditStore).createIfAbsent(any());
        verify(transactionalOperator, org.mockito.Mockito.times(1)).transactional(any(Mono.class));
    }

    @Test
    void mapsOnlyApprovedApplyContractChangeParametersIntoAudit() {
        when(auditStore.findByIdempotencyKey("mapping-key")).thenReturn(Mono.empty());
        when(auditStore.createIfAbsent(any()))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0, ActionExecutionAuditDocument.class)));
        when(auditStore.markSucceeded(anyString(), any(), anyString(), any(), any()))
                .thenAnswer(invocation -> Mono.just(runningAudit(invocation.getArgument(0))));
        DemoActionServerRequestProperties release12Properties = requestProperties();
        release12Properties.setProjectVersion(DemoActionServerRequestProperties.DEMO_RELEASE_VERSION);
        ActionExecutionService service = service(
                handler("ApplyContractChange", (request, auditId) -> Mono.just(success(auditId, "contract", "C001"))),
                release12Properties);
        ExecuteRequest request = new ExecuteRequest(
                "v1",
                "workspace-1",
                "project-1",
                DemoActionServerRequestProperties.DEMO_RELEASE_VERSION,
                "datasource-1",
                "ApplyContractChange",
                new OntologyObjectSet("contract", List.of("C001")),
                true,
                Map.of("changeAmount", 120000, "changeReason", "Scope expansion", "secret", "do-not-store"),
                Map.of("metadataSnapshotId", "snapshot-1", "metadataDigest", "sha256:abc", "token", "do-not-store"),
                "mapping-key");

        StepVerifier.create(service.execute(request)).expectNextCount(1).verifyComplete();

        ArgumentCaptor<ActionExecutionAuditDocument> audit =
                ArgumentCaptor.forClass(ActionExecutionAuditDocument.class);
        verify(auditStore).createIfAbsent(audit.capture());
        assertThat(audit.getValue().parameterSummary())
                .containsEntry("changeAmount", 120000)
                .containsEntry("changeReason", "Scope expansion")
                .doesNotContainKey("context")
                .doesNotContainKey("secret");
    }

    @Test
    void abortsAtomicTransactionBeforeRecordingHandlerFailure() {
        when(auditStore.findByIdempotencyKey("rollback-key")).thenReturn(Mono.empty());
        when(auditStore.createIfAbsent(any()))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0, ActionExecutionAuditDocument.class)));
        when(auditStore.markFailed(anyString(), any(), any()))
                .thenAnswer(invocation -> Mono.just(runningAudit(invocation.getArgument(0))));
        AtomicInteger handlerCalls = new AtomicInteger();
        AtomicInteger transactionErrors = new AtomicInteger();
        when(transactionalOperator.transactional(any(Mono.class)))
                .thenAnswer(invocation ->
                        invocation.getArgument(0, Mono.class).doOnError(error -> transactionErrors.incrementAndGet()));
        ActionExecutionService service = service(handler((request, auditId) -> {
            handlerCalls.incrementAndGet(); // models a write performed before a later handler error
            return Mono.error(new ActionExecutionService.DeclaredDomainException(
                    new DomainFailure("v1", auditId, "TARGET_NOT_FOUND", "Target was not found.")));
        }));

        StepVerifier.create(service.execute(request(List.of("PO001"), true, "rollback-key")))
                .assertNext(result -> {
                    assertThat(result).isInstanceOf(ActionExecutionService.ExecutionResult.Failure.class);
                    assertThat(((ActionExecutionService.ExecutionResult.Failure) result)
                                    .response()
                                    .code())
                            .isEqualTo("TARGET_NOT_FOUND");
                })
                .verifyComplete();

        assertThat(handlerCalls).hasValue(1);
        assertThat(transactionErrors).hasValue(1);
        verify(auditStore).markFailed(anyString(), any(), any());
    }

    @Test
    void persistsInternalFailureWhenAtomicTransactionCommitFails() {
        when(auditStore.findByIdempotencyKey("commit-error")).thenReturn(Mono.empty());
        when(auditStore.createIfAbsent(any()))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0, ActionExecutionAuditDocument.class)));
        when(auditStore.markSucceeded(anyString(), any(), anyString(), any(), any()))
                .thenReturn(Mono.just(runningAudit("completed")));
        when(auditStore.markFailed(anyString(), any(), any()))
                .thenAnswer(invocation -> Mono.just(runningAudit(invocation.getArgument(0))));
        when(transactionalOperator.transactional(any(Mono.class))).thenAnswer(invocation -> invocation
                .getArgument(0, Mono.class)
                .then(Mono.error(new IllegalStateException("transaction commit failed"))));
        ActionExecutionService service = service(handler((request, auditId) -> Mono.just(success(auditId))));

        StepVerifier.create(service.execute(request(List.of("PO001"), true, "commit-error")))
                .assertNext(result -> {
                    assertThat(result).isInstanceOf(ActionExecutionService.ExecutionResult.Failure.class);
                    DomainFailure failure = ((ActionExecutionService.ExecutionResult.Failure) result).response();
                    assertThat(failure.code()).isEqualTo(ActionExecutionService.ACTION_EXECUTION_FAILED);
                    assertThat(failure.auditId()).isNotBlank();
                })
                .verifyComplete();

        ArgumentCaptor<DomainFailure> persistedFailure = ArgumentCaptor.forClass(DomainFailure.class);
        verify(auditStore).markFailed(anyString(), any(), persistedFailure.capture());
        assertThat(persistedFailure.getValue().code()).isEqualTo(ActionExecutionService.ACTION_EXECUTION_FAILED);
    }

    @Test
    void rejectsAtomicReplayWhenIdempotencyKeyTargetsDifferentObject() {
        when(auditStore.findByIdempotencyKey("mismatch-key"))
                .thenReturn(Mono.just(succeededAudit("audit-existing", "mismatch-key", "PO001")));
        AtomicInteger handlerCalls = new AtomicInteger();
        ActionExecutionService service = service(handler((request, auditId) -> {
            handlerCalls.incrementAndGet();
            return Mono.just(success(auditId));
        }));

        StepVerifier.create(service.execute(request(List.of("PO002"), true, "mismatch-key")))
                .assertNext(result -> {
                    assertThat(result).isInstanceOf(ActionExecutionService.ExecutionResult.Failure.class);
                    DomainFailure failure = ((ActionExecutionService.ExecutionResult.Failure) result).response();
                    assertThat(failure.code()).isEqualTo("INVALID_REQUEST");
                    assertThat(failure.auditId()).isEqualTo("audit-existing");
                })
                .verifyComplete();

        assertThat(handlerCalls).hasValue(0);
        verify(auditStore, never()).createIfAbsent(any());
    }

    @Test
    void rejectsUniqueKeyRaceWhenCreatedAuditTargetsDifferentObject() {
        when(auditStore.findByIdempotencyKey("race-key")).thenReturn(Mono.empty());
        when(auditStore.createIfAbsent(any()))
                .thenReturn(Mono.just(succeededAudit("audit-existing", "race-key", "PO001")));
        AtomicInteger handlerCalls = new AtomicInteger();
        ActionExecutionService service = service(handler((request, auditId) -> {
            handlerCalls.incrementAndGet();
            return Mono.just(success(auditId));
        }));

        StepVerifier.create(service.execute(request(List.of("PO002"), true, "race-key")))
                .assertNext(result -> {
                    assertThat(result).isInstanceOf(ActionExecutionService.ExecutionResult.Failure.class);
                    DomainFailure failure = ((ActionExecutionService.ExecutionResult.Failure) result).response();
                    assertThat(failure.code()).isEqualTo("INVALID_REQUEST");
                    assertThat(failure.auditId()).isEqualTo("audit-existing");
                })
                .verifyComplete();

        assertThat(handlerCalls).hasValue(0);
        verify(transactionalOperator, never()).transactional(any(Mono.class));
    }

    @Test
    void derivesDistinctTargetAuditKeysForColonBearingTargetAndParentKeys() {
        when(auditStore.findByIdempotencyKey(anyString())).thenReturn(Mono.empty());
        when(auditStore.createIfAbsent(any()))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0, ActionExecutionAuditDocument.class)));
        when(auditStore.markSucceeded(anyString(), any(), anyString(), any(), any()))
                .thenAnswer(invocation -> Mono.just(runningAudit(invocation.getArgument(0))));
        ActionExecutionService service = service(handler((request, auditId) ->
                Mono.just(success(auditId, request.targets().objectIds().getFirst()))));

        StepVerifier.create(service.execute(request(List.of("a:b"), false, "key")))
                .expectNextCount(1)
                .verifyComplete();
        StepVerifier.create(service.execute(request(List.of("b"), false, "key:a")))
                .expectNextCount(1)
                .verifyComplete();

        ArgumentCaptor<String> keys = ArgumentCaptor.forClass(String.class);
        verify(auditStore, org.mockito.Mockito.times(2)).findByIdempotencyKey(keys.capture());
        assertThat(keys.getAllValues()).containsExactly("key:YTpi", "key:a:Yg");
    }

    private ActionExecutionService service(DemoActionHandler handler) {
        return service(handler, requestProperties());
    }

    private ActionExecutionService service(
            DemoActionHandler handler, DemoActionServerRequestProperties requestProperties) {
        return new ActionExecutionService(
                auditStore,
                transactionalOperator,
                new DemoActionHandlerRegistry(List.of(handler)),
                requestProperties,
                CLOCK);
    }

    private static DemoActionHandler handler(
            java.util.function.BiFunction<ExecuteRequest, String, Mono<ExecuteSuccess>> behavior) {
        return handler("UpdateProductionSchedule", behavior);
    }

    private static DemoActionHandler handler(
            String actionId, java.util.function.BiFunction<ExecuteRequest, String, Mono<ExecuteSuccess>> behavior) {
        return new DemoActionHandler() {
            @Override
            public String actionId() {
                return actionId;
            }

            @Override
            public Mono<ExecuteSuccess> execute(ExecuteRequest request, String auditId) {
                return behavior.apply(request, auditId);
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
                new OntologyObjectSet("PurchaseOrder", List.of("PO001")),
                false,
                Map.of("newScheduleDate", "2026-09-01T00:00:00Z"),
                context,
                "key-1");
    }

    private static ExecuteRequest request(List<String> objectIds, boolean atomic) {
        return request(objectIds, atomic, "key-1");
    }

    private static ExecuteRequest request(List<String> objectIds, boolean atomic, String idempotencyKey) {
        return new ExecuteRequest(
                "v1",
                "workspace-1",
                "project-1",
                "1.0.0",
                "datasource-1",
                "UpdateProductionSchedule",
                new OntologyObjectSet("PurchaseOrder", objectIds),
                atomic,
                Map.of("newScheduleDate", "2026-09-01T00:00:00Z"),
                context(),
                idempotencyKey);
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

    private static ActionExecutionAuditDocument succeededAudit(String auditId) {
        return succeededAudit(auditId, "key-1", "PO001");
    }

    private static ActionExecutionAuditDocument succeededAudit(String auditId, String idempotencyKey, String objectId) {
        ActionExecutionAuditDocument runningAudit = new ActionExecutionAuditDocument(
                auditId,
                idempotencyKey,
                "workspace-1",
                "project-1",
                "1.0.0",
                "datasource-1",
                "UpdateProductionSchedule",
                "PurchaseOrder",
                objectId,
                Instant.parse("2026-08-25T00:00:00Z"),
                null,
                "RUNNING",
                null,
                List.of(),
                List.of());
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
                "SUCCEEDED",
                null,
                List.of(),
                List.of(),
                "Stored success.");
    }

    private static ExecuteSuccess success(String auditId) {
        return success(auditId, "PO001");
    }

    private static ExecuteSuccess success(String auditId, String objectId) {
        return success(auditId, "PurchaseOrder", objectId);
    }

    private static ExecuteSuccess success(String auditId, String objectTypeId, String objectId) {
        return new ExecuteSuccess(
                "v1",
                List.of(new TargetOutcome(
                        new com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedObject(
                                objectTypeId, objectId),
                        "SUCCEEDED",
                        List.of(),
                        List.of(),
                        null,
                        auditId)));
    }
}
