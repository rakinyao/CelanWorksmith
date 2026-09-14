package com.celanworksmith.demoactionserver.audit;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ActionExecutionAuditStoreTest {
    @Test
    void looksUpTheIdempotencyKeyBeforeInsertingANewRunningAudit() {
        ReactiveMongoTemplate mongoTemplate = mock(ReactiveMongoTemplate.class);
        ActionExecutionAuditStore store = new ActionExecutionAuditStore(mongoTemplate);
        ActionExecutionAuditDocument audit = new ActionExecutionAuditDocument(
                "audit-1",
                "key-1",
                "workspace-1",
                "project-1",
                "1.0.0",
                "datasource-1",
                "UpdateProductionSchedule",
                "PurchaseOrder",
                "PO001",
                Instant.parse("2026-08-22T00:00:00Z"),
                null,
                "RUNNING",
                null,
                List.of(),
                List.of());

        when(mongoTemplate.findOne(
                        any(Query.class),
                        eq(ActionExecutionAuditDocument.class),
                        eq(ActionExecutionAuditStore.COLLECTION)))
                .thenReturn(Mono.empty());
        when(mongoTemplate.insert(any(ActionExecutionAuditDocument.class), eq(ActionExecutionAuditStore.COLLECTION)))
                .thenReturn(Mono.just(audit));

        StepVerifier.create(store.createIfAbsent(audit)).expectNext(audit).verifyComplete();

        ArgumentCaptor<ActionExecutionAuditDocument> inserted =
                ArgumentCaptor.forClass(ActionExecutionAuditDocument.class);
        InOrder calls = inOrder(mongoTemplate);
        calls.verify(mongoTemplate)
                .findOne(
                        any(Query.class),
                        eq(ActionExecutionAuditDocument.class),
                        eq(ActionExecutionAuditStore.COLLECTION));
        calls.verify(mongoTemplate).insert(inserted.capture(), eq(ActionExecutionAuditStore.COLLECTION));
        assertThat(inserted.getValue()).isEqualTo(audit);
    }

    @Test
    void persistsOnlyApprovedApplyContractChangeParameterSummaryFields() {
        ReactiveMongoTemplate mongoTemplate = mock(ReactiveMongoTemplate.class);
        ActionExecutionAuditStore store = new ActionExecutionAuditStore(mongoTemplate);
        ActionExecutionAuditDocument audit = new ActionExecutionAuditDocument(
                "audit-2",
                "key-2",
                "workspace-1",
                "project-1",
                "1.0.0",
                "datasource-1",
                "ApplyContractChange",
                "contract",
                "C001",
                Instant.parse("2026-08-22T00:00:00Z"),
                null,
                "RUNNING",
                null,
                List.of(),
                List.of(),
                Map.of("changeAmount", 120000, "changeReason", "Scope expansion", "secret", "do-not-store"));

        when(mongoTemplate.findOne(
                        any(Query.class),
                        eq(ActionExecutionAuditDocument.class),
                        eq(ActionExecutionAuditStore.COLLECTION)))
                .thenReturn(Mono.empty());
        when(mongoTemplate.insert(any(ActionExecutionAuditDocument.class), eq(ActionExecutionAuditStore.COLLECTION)))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0, ActionExecutionAuditDocument.class)));

        ArgumentCaptor<ActionExecutionAuditDocument> inserted =
                ArgumentCaptor.forClass(ActionExecutionAuditDocument.class);
        StepVerifier.create(store.createIfAbsent(audit)).expectNextCount(1).verifyComplete();
        org.mockito.Mockito.verify(mongoTemplate).insert(inserted.capture(), eq(ActionExecutionAuditStore.COLLECTION));

        assertThat(inserted.getValue().parameterSummary())
                .containsEntry("changeAmount", 120000)
                .containsEntry("changeReason", "Scope expansion")
                .doesNotContainKey("secret");
    }

    @Test
    void dropsMalformedApplyContractChangeParameterValues() {
        ReactiveMongoTemplate mongoTemplate = mock(ReactiveMongoTemplate.class);
        ActionExecutionAuditStore store = new ActionExecutionAuditStore(mongoTemplate);
        ActionExecutionAuditDocument audit = new ActionExecutionAuditDocument(
                "audit-3",
                "key-3",
                "workspace-1",
                "project-1",
                "1.0.0",
                "datasource-1",
                "ApplyContractChange",
                "contract",
                "C001",
                Instant.parse("2026-08-22T00:00:00Z"),
                null,
                "RUNNING",
                null,
                List.of(),
                List.of(),
                Map.of("changeAmount", Map.of("nested", 1), "changeReason", List.of("bad")));

        when(mongoTemplate.findOne(
                        any(Query.class),
                        eq(ActionExecutionAuditDocument.class),
                        eq(ActionExecutionAuditStore.COLLECTION)))
                .thenReturn(Mono.empty());
        when(mongoTemplate.insert(any(ActionExecutionAuditDocument.class), eq(ActionExecutionAuditStore.COLLECTION)))
                .thenAnswer(invocation -> Mono.just(invocation.getArgument(0, ActionExecutionAuditDocument.class)));

        ArgumentCaptor<ActionExecutionAuditDocument> inserted =
                ArgumentCaptor.forClass(ActionExecutionAuditDocument.class);
        StepVerifier.create(store.createIfAbsent(audit)).expectNextCount(1).verifyComplete();
        org.mockito.Mockito.verify(mongoTemplate).insert(inserted.capture(), eq(ActionExecutionAuditStore.COLLECTION));

        assertThat(inserted.getValue().parameterSummary()).isEmpty();
    }
}
