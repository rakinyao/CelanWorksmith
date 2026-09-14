package com.celanworksmith.demoactionserver.handler;

import com.celanworksmith.demoactionserver.api.ActionExecutionService.DeclaredDomainException;
import com.celanworksmith.demoactionserver.runtime.DemoRuntimeObjectDocument;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedObject;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ChangedProperty;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import com.celanworksmith.ontology.datasource.OntologyObjectSet;
import org.bson.Document;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ApplyContractChangeHandlerTest {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-09-14T12:34:56Z"), ZoneOffset.UTC);

    private final ReactiveMongoTemplate template = mock(ReactiveMongoTemplate.class);
    private final ApplyContractChangeHandler handler = new ApplyContractChangeHandler(template, CLOCK);

    @Test
    void appliesPositiveChangeAndReportsOnlyAllowedProperties() {
        when(template.findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract")))
                .thenReturn(Mono.just(contract("CTR-1", "10.00", "100.00")));
        when(template.findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract")))
                .thenReturn(Mono.just(contract("CTR-1", "12.50", "102.50")));

        StepVerifier.create(handler.execute(request("CTR-1", "2.50", "Scope expansion"), "audit-1"))
                .assertNext(result -> {
                    assertThat(result.outcomes())
                            .containsExactly(
                                    new com.celanworksmith.ontology.datasource.OntologyActionServerProtocol
                                            .TargetOutcome(
                                            new ChangedObject("contract", "CTR-1"),
                                            "SUCCEEDED",
                                            List.of(new ChangedObject("contract", "CTR-1")),
                                            List.of(
                                                    new ChangedProperty(
                                                            "contract",
                                                            "CTR-1",
                                                            "change_amount",
                                                            new BigDecimal("12.50")),
                                                    new ChangedProperty(
                                                            "contract",
                                                            "CTR-1",
                                                            "current_amount",
                                                            new BigDecimal("102.50")),
                                                    new ChangedProperty(
                                                            "contract",
                                                            "CTR-1",
                                                            "latest_change_at",
                                                            "2026-09-14T12:34:56Z")),
                                            null,
                                            "audit-1"));
                })
                .verifyComplete();

        ArgumentCaptor<Update> updateCaptor = ArgumentCaptor.forClass(Update.class);
        verify(template)
                .findAndModify(
                        any(Query.class),
                        updateCaptor.capture(),
                        any(),
                        eq(DemoRuntimeObjectDocument.class),
                        eq("ont_contract"));
        Document set = (Document) updateCaptor.getValue().getUpdateObject().get("$set");
        assertThat(set)
                .containsExactlyInAnyOrderEntriesOf(Map.of(
                        "properties.change_amount", new BigDecimal("12.50"),
                        "properties.current_amount", new BigDecimal("102.50"),
                        "properties.latest_change_at", "2026-09-14T12:34:56Z"));
    }

    @Test
    void appliesNegativeChangeWithoutAllowingNegativeCurrentAmount() {
        when(template.findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract")))
                .thenReturn(Mono.just(contract("CTR-1", "10.00", "100.00")));
        when(template.findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract")))
                .thenReturn(Mono.just(contract("CTR-1", "7.50", "97.50")));

        StepVerifier.create(handler.execute(request("CTR-1", "-2.50", "Scope reduction"), "audit-1"))
                .assertNext(result -> assertThat(result.outcomes().getFirst().changedProperties())
                        .extracting(ChangedProperty::newValue)
                        .containsExactly(new BigDecimal("7.50"), new BigDecimal("97.50"), "2026-09-14T12:34:56Z"))
                .verifyComplete();
    }

    @Test
    void rejectsMissingTargetWithoutWriting() {
        when(template.findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract")))
                .thenReturn(Mono.empty());

        StepVerifier.create(handler.execute(request("CTR-404", "1.00", "Correction"), "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "TARGET_NOT_FOUND"))
                .verify();
        verify(template, never())
                .findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract"));
    }

    @Test
    void rejectsNonV1RequestsWithoutWriting() {
        StepVerifier.create(handler.execute(request("v2", true, "CTR-1", "1.00", "Correction"), "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "INVALID_ACTION_REQUEST"))
                .verify();
        verify(template, never()).findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract"));
    }

    @Test
    void rejectsNonAtomicRequestsWithoutWriting() {
        StepVerifier.create(handler.execute(request("v1", false, "CTR-1", "1.00", "Correction"), "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "INVALID_ACTION_REQUEST"))
                .verify();
        verify(template, never()).findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract"));
    }

    @Test
    void rejectsZeroAndNonDecimalAmountsWithoutWriting() {
        for (Object amount : List.of("0", "not-a-decimal", 1.25d, 1.25f)) {
            StepVerifier.create(handler.execute(request("CTR-1", amount, "Correction"), "audit-1"))
                    .expectErrorSatisfies(error -> assertDomainFailure(error, "INVALID_ACTION_REQUEST"))
                    .verify();
        }
        verify(template, never()).findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract"));
        verify(template, never())
                .findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract"));
    }

    @Test
    void rejectsBlankReasonWithoutWriting() {
        StepVerifier.create(handler.execute(request("CTR-1", "1.00", "  "), "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "INVALID_ACTION_REQUEST"))
                .verify();
        verify(template, never()).findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract"));
    }

    @Test
    void rejectsChangeThatWouldMakeCurrentAmountNegativeWithoutWriting() {
        when(template.findOne(any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract")))
                .thenReturn(Mono.just(contract("CTR-1", "10.00", "1.00")));

        StepVerifier.create(handler.execute(request("CTR-1", "-1.01", "Correction"), "audit-1"))
                .expectErrorSatisfies(error -> assertDomainFailure(error, "INVALID_ACTION_REQUEST"))
                .verify();
        verify(template, never())
                .findAndModify(any(), any(), any(), eq(DemoRuntimeObjectDocument.class), eq("ont_contract"));
    }

    private static void assertDomainFailure(Throwable error, String expectedCode) {
        assertThat(error).isInstanceOf(DeclaredDomainException.class);
        assertThat(((DeclaredDomainException) error).failure().code()).isEqualTo(expectedCode);
    }

    private static ExecuteRequest request(String objectId, Object amount, String reason) {
        return request("v1", true, objectId, amount, reason);
    }

    private static ExecuteRequest request(
            String contractVersion, boolean atomic, String objectId, Object amount, String reason) {
        return new ExecuteRequest(
                contractVersion,
                "workspace-1",
                "project-1",
                "1.2.0",
                "datasource-1",
                "ApplyContractChange",
                new OntologyObjectSet("contract", List.of(objectId)),
                atomic,
                Map.of("changeAmount", amount, "changeReason", reason),
                Map.of(),
                "key-1");
    }

    private static DemoRuntimeObjectDocument contract(String id, String changeAmount, String currentAmount) {
        return new DemoRuntimeObjectDocument(
                id,
                "contract",
                Map.of("change_amount", new BigDecimal(changeAmount), "current_amount", new BigDecimal(currentAmount)));
    }
}
