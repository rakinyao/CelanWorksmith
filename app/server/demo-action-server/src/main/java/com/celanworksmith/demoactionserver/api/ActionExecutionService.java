package com.celanworksmith.demoactionserver.api;

import com.celanworksmith.demoactionserver.audit.ActionExecutionAuditDocument;
import com.celanworksmith.demoactionserver.audit.ActionExecutionAuditStore;
import com.celanworksmith.demoactionserver.handler.DemoActionHandlerRegistry;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedObject;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedProperty;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.DomainFailure;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteSuccess;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Mono;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ActionExecutionService {
    private static final String SUCCEEDED = "SUCCEEDED";
    private static final String FAILED = "FAILED";
    private static final String RUNNING = "RUNNING";
    private static final String ACTION_IN_PROGRESS = "ACTION_IN_PROGRESS";
    private static final String ACTION_EXECUTION_FAILED = "ACTION_EXECUTION_FAILED";
    private static final String INVALID_REQUEST = "INVALID_REQUEST";
    private static final String SAFE_SERVER_MESSAGE = "Action execution failed.";
    private static final String SUCCESS_MESSAGE = "Action completed.";

    private final ActionExecutionAuditStore auditStore;
    private final TransactionalOperator transactionalOperator;
    private final DemoActionHandlerRegistry handlerRegistry;
    private final Clock clock;

    @Autowired
    public ActionExecutionService(
            ActionExecutionAuditStore auditStore,
            TransactionalOperator transactionalOperator,
            DemoActionHandlerRegistry handlerRegistry) {
        this(auditStore, transactionalOperator, handlerRegistry, Clock.systemUTC());
    }

    ActionExecutionService(
            ActionExecutionAuditStore auditStore,
            TransactionalOperator transactionalOperator,
            DemoActionHandlerRegistry handlerRegistry,
            Clock clock) {
        this.auditStore = auditStore;
        this.transactionalOperator = transactionalOperator;
        this.handlerRegistry = handlerRegistry;
        this.clock = clock;
    }

    public Mono<ExecutionResult> execute(ExecuteRequest request) {
        if (!OntologyActionServerProtocol.V1.equals(request.contractVersion())) {
            return Mono.just(new ExecutionResult.Failure(new DomainFailure(
                    OntologyActionServerProtocol.V1, null, INVALID_REQUEST, "contractVersion must be v1.")));
        }

        return auditStore.findByIdempotencyKey(request.idempotencyKey())
                .flatMap(this::replay)
                .switchIfEmpty(createAndExecute(request));
    }

    private Mono<ExecutionResult> createAndExecute(ExecuteRequest request) {
        String auditId = UUID.randomUUID().toString();
        ActionExecutionAuditDocument runningAudit = new ActionExecutionAuditDocument(
                auditId,
                request.idempotencyKey(),
                request.workspaceId(),
                request.projectId(),
                request.projectVersion(),
                request.datasourceId(),
                request.actionId(),
                request.objectTypeId(),
                request.objectId(),
                Instant.now(clock),
                null,
                RUNNING,
                null,
                List.of(),
                List.of());

        return auditStore.createIfAbsent(runningAudit)
                .flatMap(audit -> audit.auditId().equals(auditId) ? invokeHandler(request, audit) : replay(audit));
    }

    private Mono<ExecutionResult> invokeHandler(ExecuteRequest request, ActionExecutionAuditDocument audit) {
        return transactionalOperator
                .transactional(handlerRegistry.resolve(request.actionId(), audit.auditId())
                        .flatMap(handler -> handler.execute(request, audit.auditId()))
                        .flatMap(result -> auditStore
                                .markSucceeded(
                                        audit.auditId(),
                                        Instant.now(clock),
                                        result.message(),
                                        result.changedObjects(),
                                        result.changedProperties())
                                .thenReturn((ExecutionResult) new ExecutionResult.Success(new ExecuteSuccess(
                                        OntologyActionServerProtocol.V1,
                                        audit.auditId(),
                                        SUCCEEDED,
                                        result.message(),
                                        result.changedObjects(),
                                        result.changedProperties())))))
                .onErrorResume(DeclaredDomainException.class, exception -> finishFailure(audit.auditId(), exception.failure()))
                .onErrorResume(Throwable.class, exception -> finishFailure(audit.auditId(), internalFailure(audit.auditId())));
    }

    private Mono<ExecutionResult> replay(ActionExecutionAuditDocument audit) {
        if (RUNNING.equals(audit.status())) {
            return Mono.just(new ExecutionResult.Failure(new DomainFailure(
                    OntologyActionServerProtocol.V1,
                    audit.auditId(),
                    ACTION_IN_PROGRESS,
                    "Action execution is in progress.")));
        }
        if (SUCCEEDED.equals(audit.status())) {
            return Mono.just(new ExecutionResult.Success(new ExecuteSuccess(
                    OntologyActionServerProtocol.V1,
                    audit.auditId(),
                    SUCCEEDED,
                    audit.successMessage() == null || audit.successMessage().isBlank()
                            ? SUCCESS_MESSAGE
                            : audit.successMessage(),
                    audit.changedObjects(),
                    audit.changedProperties())));
        }
        if (FAILED.equals(audit.status()) && audit.failure() != null) {
            return Mono.just(new ExecutionResult.Failure(audit.failure()));
        }
        return Mono.just(new ExecutionResult.Failure(internalFailure(audit.auditId())));
    }

    private Mono<ExecutionResult> finishFailure(String auditId, DomainFailure failure) {
        DomainFailure auditFailure = new DomainFailure(
                OntologyActionServerProtocol.V1, auditId, failure.code(), failure.message());
        return auditStore.markFailed(auditId, Instant.now(clock), auditFailure).thenReturn(new ExecutionResult.Failure(auditFailure));
    }

    private static DomainFailure internalFailure(String auditId) {
        return new DomainFailure(OntologyActionServerProtocol.V1, auditId, ACTION_EXECUTION_FAILED, SAFE_SERVER_MESSAGE);
    }

    public static final class DeclaredDomainException extends RuntimeException {
        private final DomainFailure failure;

        public DeclaredDomainException(DomainFailure failure) {
            super(failure.message());
            this.failure = failure;
        }

        public DomainFailure failure() {
            return failure;
        }
    }

    public sealed interface ExecutionResult {
        record Success(ExecuteSuccess response) implements ExecutionResult {}

        record Failure(DomainFailure response) implements ExecutionResult {}
    }
}
