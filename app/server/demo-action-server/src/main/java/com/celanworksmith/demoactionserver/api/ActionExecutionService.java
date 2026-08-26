package com.celanworksmith.demoactionserver.api;

import com.celanworksmith.demoactionserver.audit.ActionExecutionAuditDocument;
import com.celanworksmith.demoactionserver.audit.ActionExecutionAuditStore;
import com.celanworksmith.demoactionserver.config.DemoActionServerRequestProperties;
import com.celanworksmith.demoactionserver.handler.DemoActionHandlerRegistry;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.DomainFailure;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteSuccess;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.TargetOutcome;
import com.celanworksmith.ontology.datasource.OntologyObjectSet;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class ActionExecutionService {
    private static final String SUCCEEDED = "SUCCEEDED";
    private static final String FAILED = "FAILED";
    private static final String RUNNING = "RUNNING";
    private static final String ACTION_IN_PROGRESS = "ACTION_IN_PROGRESS";
    public static final String ACTION_EXECUTION_FAILED = "ACTION_EXECUTION_FAILED";
    private static final String ATOMIC_EXECUTION_UNSUPPORTED = "ATOMIC_EXECUTION_UNSUPPORTED";
    private static final String INVALID_REQUEST = "INVALID_REQUEST";
    private static final String SAFE_SERVER_MESSAGE = "Action execution failed.";
    private static final String SUCCESS_MESSAGE = "Action completed.";

    private final ActionExecutionAuditStore auditStore;
    private final TransactionalOperator transactionalOperator;
    private final DemoActionHandlerRegistry handlerRegistry;
    private final DemoActionServerRequestProperties requestProperties;
    private final Clock clock;

    @Autowired
    public ActionExecutionService(
            ActionExecutionAuditStore auditStore,
            TransactionalOperator transactionalOperator,
            DemoActionHandlerRegistry handlerRegistry,
            DemoActionServerRequestProperties requestProperties) {
        this(auditStore, transactionalOperator, handlerRegistry, requestProperties, Clock.systemUTC());
    }

    ActionExecutionService(
            ActionExecutionAuditStore auditStore,
            TransactionalOperator transactionalOperator,
            DemoActionHandlerRegistry handlerRegistry,
            DemoActionServerRequestProperties requestProperties,
            Clock clock) {
        this.auditStore = auditStore;
        this.transactionalOperator = transactionalOperator;
        this.handlerRegistry = handlerRegistry;
        this.requestProperties = requestProperties;
        this.clock = clock;
    }

    public Mono<ExecutionResult> execute(ExecuteRequest request) {
        if (!OntologyActionServerProtocol.V1.equals(request.contractVersion())) {
            return Mono.just(new ExecutionResult.Failure(new DomainFailure(
                    OntologyActionServerProtocol.V1, null, INVALID_REQUEST, "contractVersion must be v1.")));
        }
        if (request.atomic()) {
            return Mono.just(new ExecutionResult.Failure(new DomainFailure(
                    OntologyActionServerProtocol.V1,
                    null,
                    ATOMIC_EXECUTION_UNSUPPORTED,
                    "Atomic action execution is not supported.")));
        }

        return validateSupportedRequest(request, null)
                .thenMany(Flux.fromIterable(request.targets().objectIds())
                        .concatMap(objectId -> executeTarget(request, objectId)))
                .collectList()
                .map(outcomes -> (ExecutionResult) new ExecutionResult.Success(
                        new ExecuteSuccess(OntologyActionServerProtocol.V1, outcomes)))
                .onErrorResume(
                        DeclaredDomainException.class,
                        exception -> Mono.just(new ExecutionResult.Failure(exception.failure())));
    }

    private Mono<TargetOutcome> executeTarget(ExecuteRequest request, String objectId) {
        ExecuteRequest targetRequest = singleTargetRequest(request, objectId);
        return auditStore
                .findByIdempotencyKey(targetRequest.idempotencyKey())
                .flatMap(audit -> replay(audit, target(targetRequest)))
                .switchIfEmpty(Mono.defer(() -> createAndExecute(targetRequest)));
    }

    private Mono<TargetOutcome> createAndExecute(ExecuteRequest request) {
        String auditId = UUID.randomUUID().toString();
        ActionExecutionAuditDocument runningAudit = new ActionExecutionAuditDocument(
                auditId,
                request.idempotencyKey(),
                request.workspaceId(),
                request.projectId(),
                request.projectVersion(),
                request.datasourceId(),
                request.actionId(),
                request.targets().objectTypeId(),
                request.targets().objectIds().getFirst(),
                Instant.now(clock),
                null,
                RUNNING,
                null,
                List.of(),
                List.of());

        return auditStore
                .createIfAbsent(runningAudit)
                .flatMap(audit -> audit.auditId().equals(auditId)
                        ? invokeHandler(request, audit)
                        : replay(audit, target(request)));
    }

    private Mono<TargetOutcome> invokeHandler(ExecuteRequest request, ActionExecutionAuditDocument audit) {
        return transactionalOperator
                .transactional(handlerRegistry.resolve(request.actionId(), audit.auditId())
                        .flatMap(handler -> handler.execute(request, audit.auditId()))
                        .map(result -> handlerSuccess(result, request, audit.auditId()))
                        .flatMap(outcome -> auditStore
                                .markSucceeded(
                                        audit.auditId(),
                                        Instant.now(clock),
                                        SUCCESS_MESSAGE,
                                        outcome.changedObjects(),
                                        outcome.changedProperties())
                                .thenReturn(outcome)))
                .onErrorResume(
                        DeclaredDomainException.class,
                        exception -> finishFailure(audit, target(request), exception.failure()))
                .onErrorResume(
                        Throwable.class,
                        exception -> finishFailure(audit, target(request), internalFailure(audit.auditId())));
    }

    private Mono<Void> validateSupportedRequest(ExecuteRequest request, String auditId) {
        if (requestProperties.supports(request)) {
            return Mono.empty();
        }
        return Mono.error(new DeclaredDomainException(new DomainFailure(
                OntologyActionServerProtocol.V1,
                auditId,
                INVALID_REQUEST,
                "Action request does not match the configured Demo Action Server pin.")));
    }

    private Mono<TargetOutcome> replay(ActionExecutionAuditDocument audit, OntologyActionServerProtocol.ChangedObject target) {
        if (RUNNING.equals(audit.status())) {
            return Mono.just(failedOutcome(
                    target,
                    new DomainFailure(
                            OntologyActionServerProtocol.V1,
                            audit.auditId(),
                            ACTION_IN_PROGRESS,
                            "Action execution is in progress.")));
        }
        if (SUCCEEDED.equals(audit.status())) {
            return Mono.just(new TargetOutcome(
                    target,
                    SUCCEEDED,
                    audit.changedObjects(),
                    audit.changedProperties(),
                    null,
                    audit.auditId()));
        }
        if (FAILED.equals(audit.status()) && audit.failure() != null) {
            return Mono.just(failedOutcome(target, audit.failure()));
        }
        return Mono.just(failedOutcome(target, internalFailure(audit.auditId())));
    }

    private Mono<TargetOutcome> finishFailure(
            ActionExecutionAuditDocument audit,
            OntologyActionServerProtocol.ChangedObject target,
            DomainFailure failure) {
        DomainFailure auditFailure =
                new DomainFailure(OntologyActionServerProtocol.V1, audit.auditId(), failure.code(), failure.message());
        return auditStore
                .markFailed(audit.auditId(), Instant.now(clock), auditFailure)
                .thenReturn(failedOutcome(target, auditFailure));
    }

    private static ExecuteRequest singleTargetRequest(ExecuteRequest request, String objectId) {
        return new ExecuteRequest(
                request.contractVersion(),
                request.workspaceId(),
                request.projectId(),
                request.projectVersion(),
                request.datasourceId(),
                request.actionId(),
                new OntologyObjectSet(request.targets().objectTypeId(), List.of(objectId)),
                false,
                request.parameters(),
                request.context(),
                targetIdempotencyKey(request.idempotencyKey(), objectId));
    }

    private static String targetIdempotencyKey(String parentKey, String objectId) {
        return parentKey + ":" + Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(objectId.getBytes(StandardCharsets.UTF_8));
    }

    private static TargetOutcome handlerSuccess(ExecuteSuccess success, ExecuteRequest request, String auditId) {
        if (!OntologyActionServerProtocol.V1.equals(success.contractVersion()) || success.outcomes().size() != 1) {
            throw new IllegalArgumentException("Action handler must return exactly one v1 target outcome");
        }
        TargetOutcome outcome = success.outcomes().getFirst();
        if (!SUCCEEDED.equals(outcome.status()) || outcome.error() != null || !target(request).equals(outcome.target())) {
            throw new IllegalArgumentException("Action handler returned an invalid target outcome");
        }
        return new TargetOutcome(
                target(request),
                SUCCEEDED,
                outcome.changedObjects(),
                outcome.changedProperties(),
                null,
                auditId);
    }

    private static TargetOutcome failedOutcome(OntologyActionServerProtocol.ChangedObject target, DomainFailure failure) {
        return new TargetOutcome(target, FAILED, List.of(), List.of(), failure, failure.auditId());
    }

    private static OntologyActionServerProtocol.ChangedObject target(ExecuteRequest request) {
        return new OntologyActionServerProtocol.ChangedObject(
                request.targets().objectTypeId(), request.targets().objectIds().getFirst());
    }

    private static DomainFailure internalFailure(String auditId) {
        return new DomainFailure(
                OntologyActionServerProtocol.V1, auditId, ACTION_EXECUTION_FAILED, SAFE_SERVER_MESSAGE);
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
