package com.celanworksmith.demoactionserver.handler;

import com.celanworksmith.demoactionserver.api.ActionExecutionService.DeclaredDomainException;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedObject;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedProperty;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.DomainFailure;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteSuccess;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.TargetOutcome;
import org.bson.Document;
import org.bson.types.Decimal128;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.mongodb.core.FindAndModifyOptions;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

/** Development-only atomic contract amount mutation for the local Demo Runtime. */
@Component
public class ApplyContractChangeHandler implements DemoActionHandler {
    private static final String ACTION_ID = "ApplyContractChange";
    private static final String TARGET_OBJECT_TYPE = "contract";
    private static final String CONTRACTS = "ont_contract";
    private static final String INVALID_ACTION_REQUEST = "INVALID_ACTION_REQUEST";
    private static final String TARGET_NOT_FOUND = "TARGET_NOT_FOUND";

    private final ReactiveMongoTemplate mongoTemplate;
    private final Clock clock;

    @Autowired
    public ApplyContractChangeHandler(ReactiveMongoTemplate mongoTemplate) {
        this(mongoTemplate, Clock.systemUTC());
    }

    ApplyContractChangeHandler(ReactiveMongoTemplate mongoTemplate, Clock clock) {
        this.mongoTemplate = mongoTemplate;
        this.clock = clock;
    }

    @Override
    public String actionId() {
        return ACTION_ID;
    }

    @Override
    public Mono<ExecuteSuccess> execute(ExecuteRequest request, String auditId) {
        if (!OntologyActionServerProtocol.V1.equals(request.contractVersion())) {
            return invalidRequest(auditId, "contractVersion must be v1.");
        }
        if (!request.atomic()) {
            return invalidRequest(auditId, "ApplyContractChange requires atomic execution.");
        }
        if (!ACTION_ID.equals(request.actionId())) {
            return invalidRequest(auditId, "Action must be ApplyContractChange.");
        }
        if (!TARGET_OBJECT_TYPE.equals(request.targets().objectTypeId())
                || request.targets().objectIds().size() != 1) {
            return invalidRequest(auditId, "ApplyContractChange requires exactly one contract target.");
        }

        String targetObjectId = request.targets().objectIds().getFirst();
        BigDecimal changeAmount = decimalParameter(request, "changeAmount");
        if (changeAmount == null || changeAmount.signum() == 0) {
            return invalidRequest(auditId, "changeAmount must be a finite non-zero decimal.");
        }
        String changeReason = requiredNonBlankParameter(request, "changeReason");
        if (changeReason == null) {
            return invalidRequest(auditId, "changeReason must be a non-blank string.");
        }

        return mongoTemplate
                .findOne(Query.query(Criteria.where("_id").is(targetObjectId)), Document.class, CONTRACTS)
                .switchIfEmpty(
                        domainFailure(auditId, TARGET_NOT_FOUND, "Contract " + targetObjectId + " was not found."))
                .flatMap(contract -> applyChange(contract, targetObjectId, changeAmount, auditId));
    }

    private Mono<ExecuteSuccess> applyChange(
            Document contract, String targetObjectId, BigDecimal changeAmount, String auditId) {
        BigDecimal previousChangeAmount = decimalProperty(contract, "change_amount");
        BigDecimal previousCurrentAmount = decimalProperty(contract, "current_amount");
        if (previousChangeAmount == null || previousCurrentAmount == null) {
            return invalidRequest(auditId, "Contract amounts must be finite decimal values.");
        }

        BigDecimal nextChangeAmount = previousChangeAmount.add(changeAmount);
        BigDecimal nextCurrentAmount = previousCurrentAmount.add(changeAmount);
        if (nextCurrentAmount.signum() < 0) {
            return invalidRequest(auditId, "current_amount cannot become negative.");
        }

        String latestChangeAt = Instant.now(clock).toString();
        Update update = new Update()
                .set("change_amount", nextChangeAmount)
                .set("current_amount", nextCurrentAmount)
                .set("latest_change_at", latestChangeAt);
        return mongoTemplate
                .findAndModify(
                        Query.query(Criteria.where("_id").is(targetObjectId)),
                        update,
                        FindAndModifyOptions.options().returnNew(true),
                        Document.class,
                        CONTRACTS)
                .switchIfEmpty(
                        domainFailure(auditId, TARGET_NOT_FOUND, "Contract " + targetObjectId + " was not found."))
                .thenReturn(new ExecuteSuccess(
                        OntologyActionServerProtocol.V1,
                        List.of(new TargetOutcome(
                                new ChangedObject(TARGET_OBJECT_TYPE, targetObjectId),
                                "SUCCEEDED",
                                List.of(new ChangedObject(TARGET_OBJECT_TYPE, targetObjectId)),
                                List.of(
                                        new ChangedProperty(
                                                TARGET_OBJECT_TYPE, targetObjectId, "change_amount", nextChangeAmount),
                                        new ChangedProperty(
                                                TARGET_OBJECT_TYPE,
                                                targetObjectId,
                                                "current_amount",
                                                nextCurrentAmount),
                                        new ChangedProperty(
                                                TARGET_OBJECT_TYPE,
                                                targetObjectId,
                                                "latest_change_at",
                                                latestChangeAt)),
                                null,
                                auditId))));
    }

    private static String requiredNonBlankParameter(ExecuteRequest request, String name) {
        Object value = request.parameters().get(name);
        return value instanceof String string && !string.isBlank() ? string : null;
    }

    private static BigDecimal decimalParameter(ExecuteRequest request, String name) {
        return parseDecimal(request.parameters().get(name));
    }

    private static BigDecimal decimalProperty(Document object, String name) {
        Object value = object.get(name);
        if (value instanceof Double decimal && Double.isFinite(decimal)) {
            return BigDecimal.valueOf(decimal);
        }
        if (value instanceof Float decimal && Float.isFinite(decimal)) {
            return new BigDecimal(decimal.toString());
        }
        return parseDecimal(value);
    }

    private static BigDecimal parseDecimal(Object value) {
        if (value == null) {
            return null;
        }
        try {
            if (value instanceof BigDecimal decimal) {
                return decimal;
            }
            if (value instanceof Decimal128 decimal128) {
                return decimal128.bigDecimalValue();
            }
            if (value instanceof Byte
                    || value instanceof Short
                    || value instanceof Integer
                    || value instanceof Long
                    || value instanceof java.math.BigInteger) {
                Number number = (Number) value;
                return new BigDecimal(number.toString());
            }
            if (value instanceof String string && !string.isBlank()) {
                return new BigDecimal(string.trim());
            }
        } catch (NumberFormatException ignored) {
            // Invalid action or stored values are reported as a declared domain failure below.
        }
        return null;
    }

    private static <T> Mono<T> invalidRequest(String auditId, String message) {
        return domainFailure(auditId, INVALID_ACTION_REQUEST, message);
    }

    private static <T> Mono<T> domainFailure(String auditId, String code, String message) {
        return Mono.error(new DeclaredDomainException(
                new DomainFailure(OntologyActionServerProtocol.V1, auditId, code, message)));
    }
}
