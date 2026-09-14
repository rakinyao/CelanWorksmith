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
import org.bson.types.Decimal128;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
public class ActionExecutionService {
    private static final String SUCCEEDED = "SUCCEEDED";
    private static final String FAILED = "FAILED";
    private static final String RUNNING = "RUNNING";
    private static final String ACTION_IN_PROGRESS = "ACTION_IN_PROGRESS";
    public static final String ACTION_EXECUTION_FAILED = "ACTION_EXECUTION_FAILED";
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
            if (request.targets().objectIds().size() != 1) {
                return Mono.just(new ExecutionResult.Failure(new DomainFailure(
                        OntologyActionServerProtocol.V1,
                        null,
                        INVALID_REQUEST,
                        "Atomic action execution requires exactly one target.")));
            }
            return validateSupportedRequest(request, null)
                    .then(atomicExecution(request))
                    .onErrorResume(
                            DeclaredDomainException.class,
                            exception -> Mono.just(new ExecutionResult.Failure(exception.failure())));
        }

        return validateSupportedRequest(request, null)
                .thenMany(Flux.fromIterable(request.targets().objectIds())
                        .concatMap(objectId -> executeTarget(request, objectId)))
                .collectList()
                .map(outcomes -> singleTargetFailure(outcomes)
                        .<ExecutionResult>map(ExecutionResult.Failure::new)
                        .orElseGet(() -> new ExecutionResult.Success(
                                new ExecuteSuccess(OntologyActionServerProtocol.V1, outcomes))))
                .onErrorResume(
                        DeclaredDomainException.class,
                        exception -> Mono.just(new ExecutionResult.Failure(exception.failure())));
    }

    private Mono<ExecutionResult> atomicExecution(ExecuteRequest request) {
        Mono<TargetOutcome> freshExecution = Mono.defer(() -> createAndExecute(request, false));
        return auditStore
                .findByIdempotencyKey(request.idempotencyKey())
                .flatMap(audit -> replayOrReject(audit, request))
                .switchIfEmpty(Mono.defer(() -> freshExecution))
                .map(outcome -> singleTargetFailure(List.of(outcome))
                        .<ExecutionResult>map(ExecutionResult.Failure::new)
                        .orElseGet(() -> new ExecutionResult.Success(
                                new ExecuteSuccess(OntologyActionServerProtocol.V1, List.of(outcome)))));
    }

    private static java.util.Optional<DomainFailure> singleTargetFailure(List<TargetOutcome> outcomes) {
        if (outcomes.size() != 1) {
            return java.util.Optional.empty();
        }
        TargetOutcome outcome = outcomes.getFirst();
        return FAILED.equals(outcome.status()) && outcome.error() != null
                ? java.util.Optional.of(outcome.error())
                : java.util.Optional.empty();
    }

    private Mono<TargetOutcome> executeTarget(ExecuteRequest request, String objectId) {
        ExecuteRequest targetRequest = singleTargetRequest(request, objectId);
        return auditStore
                .findByIdempotencyKey(targetRequest.idempotencyKey())
                .flatMap(audit -> replayOrReject(audit, targetRequest))
                .switchIfEmpty(Mono.defer(() -> createAndExecute(targetRequest, true)));
    }

    private Mono<TargetOutcome> createAndExecute(ExecuteRequest request, boolean transactional) {
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
                List.of(),
                parameterSummary(request));

        return auditStore.createIfAbsent(runningAudit).flatMap(audit -> {
            if (!audit.auditId().equals(auditId)) {
                return replayOrReject(audit, request);
            }
            Mono<TargetOutcome> execution = invokeHandler(request, audit, transactional);
            if (transactional) {
                return execution;
            }
            Mono<TargetOutcome> business = execution.onErrorMap(error -> error instanceof AtomicExecutionException
                    ? error
                    : new AtomicExecutionException(audit, target(request), error));
            return transactionalOperator.transactional(business).onErrorResume(error -> {
                if (error instanceof AtomicExecutionException exception) {
                    return finishFailure(exception.audit, exception.target, exception.failure());
                }
                return finishFailure(audit, target(request), internalFailure(audit.auditId()));
            });
        });
    }

    private Mono<TargetOutcome> invokeHandler(
            ExecuteRequest request, ActionExecutionAuditDocument audit, boolean transactional) {
        Mono<TargetOutcome> execution = handlerRegistry
                .resolve(request.actionId(), audit.auditId())
                .flatMap(handler -> handler.execute(request, audit.auditId()))
                .map(result -> handlerSuccess(result, request, audit.auditId()))
                .flatMap(outcome -> auditStore
                        .markSucceeded(
                                audit.auditId(),
                                Instant.now(clock),
                                SUCCESS_MESSAGE,
                                outcome.changedObjects(),
                                outcome.changedProperties())
                        .thenReturn(outcome));
        Mono<TargetOutcome> dispatched = transactional ? transactionalOperator.transactional(execution) : execution;
        if (!transactional) {
            return dispatched;
        }
        return dispatched
                .onErrorResume(
                        DeclaredDomainException.class,
                        exception -> finishFailure(audit, target(request), exception.failure()))
                .onErrorResume(
                        Throwable.class,
                        exception -> finishFailure(audit, target(request), internalFailure(audit.auditId())));
    }

    private static Map<String, Object> parameterSummary(ExecuteRequest request) {
        if (!"ApplyContractChange".equals(request.actionId())) {
            return Map.of();
        }
        java.util.Map<String, Object> summary = new java.util.LinkedHashMap<>();
        Object amount = request.parameters().get("changeAmount");
        if (isSafeAmount(amount)) {
            summary.put("changeAmount", amount);
        }
        Object reason = request.parameters().get("changeReason");
        if (reason instanceof String value && !value.isBlank()) {
            summary.put("changeReason", value);
        }
        return Map.copyOf(summary);
    }

    private static boolean isSafeAmount(Object value) {
        if (!(value instanceof Number)) {
            return false;
        }
        return !(value instanceof Double doubleValue && !Double.isFinite(doubleValue))
                && !(value instanceof Float floatValue && !Float.isFinite(floatValue));
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

    private Mono<TargetOutcome> replay(
            ActionExecutionAuditDocument audit, OntologyActionServerProtocol.ChangedObject target) {
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
                    target, SUCCEEDED, audit.changedObjects(), audit.changedProperties(), null, audit.auditId()));
        }
        if (FAILED.equals(audit.status()) && audit.failure() != null) {
            return Mono.just(failedOutcome(target, audit.failure()));
        }
        return Mono.just(failedOutcome(target, internalFailure(audit.auditId())));
    }

    private Mono<TargetOutcome> replayOrReject(ActionExecutionAuditDocument audit, ExecuteRequest request) {
        if (!matchesReplayIdentity(audit, request)) {
            return Mono.just(failedOutcome(
                    target(request),
                    new DomainFailure(
                            OntologyActionServerProtocol.V1,
                            audit.auditId(),
                            INVALID_REQUEST,
                            "Idempotency key is already associated with a different action request.")));
        }
        return replay(audit, target(request));
    }

    private static boolean matchesReplayIdentity(ActionExecutionAuditDocument audit, ExecuteRequest request) {
        return Objects.equals(audit.workspaceId(), request.workspaceId())
                && Objects.equals(audit.projectId(), request.projectId())
                && Objects.equals(audit.projectVersion(), request.projectVersion())
                && Objects.equals(audit.datasourceId(), request.datasourceId())
                && Objects.equals(audit.actionId(), request.actionId())
                && Objects.equals(audit.objectTypeId(), request.targets().objectTypeId())
                && Objects.equals(
                        audit.objectId(), request.targets().objectIds().getFirst())
                && sameParameterSummary(audit.parameterSummary(), parameterSummary(request));
    }

    private static boolean sameParameterSummary(Map<String, Object> stored, Map<String, Object> requested) {
        if (!stored.keySet().equals(requested.keySet())) {
            return false;
        }
        return stored.keySet().stream().allMatch(key -> sameParameterValue(stored.get(key), requested.get(key)));
    }

    private static boolean sameParameterValue(Object stored, Object requested) {
        BigDecimal storedDecimal = decimalValue(stored);
        BigDecimal requestedDecimal = decimalValue(requested);
        if (storedDecimal != null || requestedDecimal != null) {
            return storedDecimal != null && requestedDecimal != null && storedDecimal.compareTo(requestedDecimal) == 0;
        }
        return Objects.equals(stored, requested);
    }

    private static BigDecimal decimalValue(Object value) {
        if (value instanceof Decimal128 decimal128) {
            return decimal128.bigDecimalValue();
        }
        if (value instanceof Number number) {
            try {
                return new BigDecimal(number.toString());
            } catch (NumberFormatException ignored) {
                // Non-decimal numeric values cannot match a safe replay summary.
            }
        }
        return null;
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
        return parentKey + ":"
                + Base64.getUrlEncoder().withoutPadding().encodeToString(objectId.getBytes(StandardCharsets.UTF_8));
    }

    private static TargetOutcome handlerSuccess(ExecuteSuccess success, ExecuteRequest request, String auditId) {
        if (!OntologyActionServerProtocol.V1.equals(success.contractVersion())
                || success.outcomes().size() != 1) {
            throw new IllegalArgumentException("Action handler must return exactly one v1 target outcome");
        }
        TargetOutcome outcome = success.outcomes().getFirst();
        if (!SUCCEEDED.equals(outcome.status())
                || outcome.error() != null
                || !target(request).equals(outcome.target())) {
            throw new IllegalArgumentException("Action handler returned an invalid target outcome");
        }
        return new TargetOutcome(
                target(request), SUCCEEDED, outcome.changedObjects(), outcome.changedProperties(), null, auditId);
    }

    private static TargetOutcome failedOutcome(
            OntologyActionServerProtocol.ChangedObject target, DomainFailure failure) {
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

    private static final class AtomicExecutionException extends RuntimeException {
        private final ActionExecutionAuditDocument audit;
        private final OntologyActionServerProtocol.ChangedObject target;

        private AtomicExecutionException(
                ActionExecutionAuditDocument audit,
                OntologyActionServerProtocol.ChangedObject target,
                Throwable cause) {
            super(cause);
            this.audit = audit;
            this.target = target;
        }

        private DomainFailure failure() {
            Throwable cause = getCause();
            return cause instanceof DeclaredDomainException exception
                    ? exception.failure()
                    : internalFailure(audit.auditId());
        }
    }

    public sealed interface ExecutionResult {
        record Success(ExecuteSuccess response) implements ExecutionResult {}

        record Failure(DomainFailure response) implements ExecutionResult {}
    }
}
