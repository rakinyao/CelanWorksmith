package com.celanworksmith.demoactionserver.audit;

import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedObject;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedProperty;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.DomainFailure;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.domain.Sort.Direction;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Repository;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;

@Repository
public class ActionExecutionAuditStore {
    public static final String COLLECTION = "actionExecutionAudits";

    private final ReactiveMongoTemplate mongoTemplate;

    public ActionExecutionAuditStore(ReactiveMongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    public Mono<String> ensureIdempotencyIndex() {
        return mongoTemplate
                .indexOps(COLLECTION)
                .ensureIndex(new Index().on("idempotencyKey", Direction.ASC).unique());
    }

    public Mono<ActionExecutionAuditDocument> findByIdempotencyKey(String idempotencyKey) {
        return mongoTemplate.findOne(
                Query.query(Criteria.where("idempotencyKey").is(idempotencyKey)),
                ActionExecutionAuditDocument.class,
                COLLECTION);
    }

    public Mono<ActionExecutionAuditDocument> createIfAbsent(ActionExecutionAuditDocument audit) {
        return findByIdempotencyKey(audit.idempotencyKey())
                .switchIfEmpty(mongoTemplate.insert(audit, COLLECTION))
                .onErrorResume(DuplicateKeyException.class, exception -> findByIdempotencyKey(audit.idempotencyKey())
                        .switchIfEmpty(Mono.error(exception)));
    }

    public Mono<ActionExecutionAuditDocument> markSucceeded(
            String auditId,
            Instant completedAt,
            String successMessage,
            List<ChangedObject> changedObjects,
            List<ChangedProperty> changedProperties) {
        Update update = new Update()
                .set("status", "SUCCEEDED")
                .set("completedAt", completedAt)
                .set("failure", null)
                .set("successMessage", successMessage)
                .set("changedObjects", changedObjects)
                .set("changedProperties", changedProperties);
        return terminalAuditUpdate(auditId, update);
    }

    public Mono<ActionExecutionAuditDocument> markFailed(String auditId, Instant completedAt, DomainFailure failure) {
        Update update = new Update()
                .set("status", "FAILED")
                .set("completedAt", completedAt)
                .set("failure", failure);
        return terminalAuditUpdate(auditId, update);
    }

    private Mono<ActionExecutionAuditDocument> terminalAuditUpdate(String auditId, Update update) {
        return mongoTemplate
                .findAndModify(runningAuditQuery(auditId), update, ActionExecutionAuditDocument.class, COLLECTION)
                .switchIfEmpty(Mono.error(new IllegalStateException("Audit " + auditId + " is not RUNNING.")));
    }

    private static Query runningAuditQuery(String auditId) {
        return Query.query(Criteria.where("_id").is(auditId).and("status").is("RUNNING"));
    }
}
