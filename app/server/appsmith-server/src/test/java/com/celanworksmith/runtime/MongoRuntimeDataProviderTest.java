package com.celanworksmith.runtime;

import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.application.CelanworksmithApplicationBindingResolver;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.runtime.adapter.mongodb.MongoRuntimeDataProvider;
import com.celanworksmith.runtime.adapter.mongodb.MongoRuntimeObjectDocument;
import com.celanworksmith.runtime.dto.ObjectSetResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class MongoRuntimeDataProviderTest {
    private ReactiveMongoTemplate template;
    private CelanworksmithApplicationBindingResolver resolver;
    private MongoRuntimeDataProvider provider;

    @BeforeEach
    void setUp() {
        template = mock(ReactiveMongoTemplate.class);
        resolver = mock(CelanworksmithApplicationBindingResolver.class);
        provider = new MongoRuntimeDataProvider(template, resolver);
    }

    @Test
    void exposesAllDemoObjectPropertiesForProviderCompatibilityChecks() {
        assertThat(provider.metadataCapabilities().block().objectProperties())
                .containsEntry(
                        "Supplier",
                        Map.of(
                                "name", "STRING",
                                "contactName", "STRING",
                                "riskLevel", "ENUM",
                                "averageRating", "DECIMAL"))
                .containsEntry(
                        "PurchaseOrder",
                        Map.of(
                                "supplierId", "REFERENCE",
                                "status", "ENUM",
                                "orderDate", "DATETIME",
                                "expectedDeliveryDate", "DATETIME",
                                "actualDeliveryDate", "DATETIME",
                                "amount", "DECIMAL",
                                "delayDays", "INTEGER"));
    }

    @Test
    void queriesBoundObjectsFromServerMappedCollection() {
        when(resolver.resolve("app-1")).thenReturn(Mono.just(RuntimeProviderTestFixtures.binding()));
        when(template.find(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Flux.just(document("PO001", "CONFIRMED", 0), document("PO002", "DELAYED", 4)));
        when(template.count(any(), eq("purchase_orders"))).thenReturn(Mono.just(2L));

        StepVerifier.create(provider.queryObjects(
                        RuntimeProviderTestFixtures.context("app-1"),
                        "PurchaseOrder",
                        RuntimeProviderTestFixtures.query(0, 10)))
                .assertNext(result -> {
                    assertThat(result.items()).hasSize(2);
                    assertThat(result.items().getFirst().id()).isEqualTo("PO001");
                    assertThat(result.items().getFirst().properties()).containsEntry("status", "CONFIRMED");
                })
                .verifyComplete();
    }

    @Test
    void queriesObjectsUsingThePinnedOntologyDefinitionWithoutAnApplicationBinding() {
        when(template.find(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Flux.just(document("PO001", "CONFIRMED", 0)));
        when(template.count(any(), eq("purchase_orders"))).thenReturn(Mono.just(1L));

        OntologyProjectDefinition pinnedDefinition =
                RuntimeProviderTestFixtures.binding().project();
        StepVerifier.create(provider.queryObjects(
                        pinnedDefinition, "PurchaseOrder", RuntimeProviderTestFixtures.query(0, 10)))
                .assertNext(result -> assertThat(result.items()).singleElement().satisfies(item -> {
                    assertThat(item.id()).isEqualTo("PO001");
                    assertThat(item.properties()).containsEntry("status", "CONFIRMED");
                }))
                .verifyComplete();

        verify(template).find(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders"));
        verify(resolver, never()).resolve(any());
    }

    @Test
    void returnsObjectInstanceAndCopiesProperties() {
        when(resolver.resolve("app-1")).thenReturn(Mono.just(RuntimeProviderTestFixtures.binding()));
        MongoRuntimeObjectDocument source = document("PO001", "DELAYED", 4);
        when(template.findOne(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Mono.just(source));

        StepVerifier.create(provider.getObject(RuntimeProviderTestFixtures.context("app-1"), "PurchaseOrder", "PO001"))
                .assertNext(result -> {
                    assertThat(result.properties()).containsEntry("delayDays", 4);
                    assertThat(result.properties()).isNotSameAs(source.getProperties());
                })
                .verifyComplete();
    }

    @Test
    void rejectsUnknownSortPropertyBeforeMongoQuery() {
        when(resolver.resolve("app-1")).thenReturn(Mono.just(RuntimeProviderTestFixtures.binding()));

        StepVerifier.create(provider.queryObjects(
                        RuntimeProviderTestFixtures.context("app-1"),
                        "PurchaseOrder",
                        new com.celanworksmith.runtime.dto.ObjectSetQuery(null, "notAllowed", "asc", 0, 10)))
                .expectErrorSatisfies(error -> assertThat(error)
                        .isInstanceOf(CelanWorksmithException.class)
                        .hasMessageContaining("Unknown sort property"))
                .verify();
    }

    @Test
    void rejectsUnknownObjectTypeAndMissingBinding() {
        when(resolver.resolve("app-1")).thenReturn(Mono.just(RuntimeProviderTestFixtures.binding()));
        StepVerifier.create(provider.queryObjects(
                        RuntimeProviderTestFixtures.context("app-1"),
                        "UnknownType",
                        RuntimeProviderTestFixtures.query(0, 10)))
                .expectError(CelanWorksmithException.class)
                .verify();

        when(resolver.resolve("missing"))
                .thenReturn(Mono.error(new CelanWorksmithException(
                        com.celanworksmith.CelanWorksmithErrorCode.INVALID_ARGUMENT,
                        "Application has no ontology project binding: missing")));
        StepVerifier.create(provider.queryObjects(
                        RuntimeProviderTestFixtures.context("missing"),
                        "PurchaseOrder",
                        RuntimeProviderTestFixtures.query(0, 10)))
                .expectErrorMessage("Application has no ontology project binding: missing")
                .verify();
    }

    @Test
    void preservesEmptyObjectSetShape() {
        when(resolver.resolve("app-1")).thenReturn(Mono.just(RuntimeProviderTestFixtures.binding()));
        when(template.find(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Flux.empty());
        when(template.count(any(), eq("purchase_orders"))).thenReturn(Mono.just(0L));

        StepVerifier.create(provider.queryObjects(
                        RuntimeProviderTestFixtures.context("app-1"),
                        "PurchaseOrder",
                        RuntimeProviderTestFixtures.query(0, 10)))
                .assertNext(result -> assertThat(result)
                        .isEqualTo(new ObjectSetResult("PurchaseOrder", java.util.List.of(), 0, 10, 0)))
                .verifyComplete();
    }

    @Test
    void clampsOffsetToTotalWhenPageStartsPastEnd() {
        when(resolver.resolve("app-1")).thenReturn(Mono.just(RuntimeProviderTestFixtures.binding()));
        when(template.find(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Flux.empty());
        when(template.count(any(), eq("purchase_orders"))).thenReturn(Mono.just(2L));

        StepVerifier.create(provider.queryObjects(
                        RuntimeProviderTestFixtures.context("app-1"),
                        "PurchaseOrder",
                        RuntimeProviderTestFixtures.query(10, 10)))
                .assertNext(result -> assertThat(result.offset()).isEqualTo(2))
                .verifyComplete();
    }

    @Test
    void doesNotOverflowWhenTotalExceedsIntegerRange() {
        when(resolver.resolve("app-1")).thenReturn(Mono.just(RuntimeProviderTestFixtures.binding()));
        when(template.find(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Flux.empty());
        when(template.count(any(), eq("purchase_orders"))).thenReturn(Mono.just(Long.MAX_VALUE));

        StepVerifier.create(provider.queryObjects(
                        RuntimeProviderTestFixtures.context("app-1"),
                        "PurchaseOrder",
                        RuntimeProviderTestFixtures.query(10, 10)))
                .assertNext(result -> assertThat(result.offset()).isEqualTo(10))
                .verifyComplete();
    }

    @Test
    void preservesUserFilterWhenQueryingLinksAndChecksSource() {
        when(resolver.resolve("app-1")).thenReturn(Mono.just(RuntimeProviderTestFixtures.binding()));
        when(template.findOne(any(), eq(MongoRuntimeObjectDocument.class), eq("suppliers")))
                .thenReturn(
                        Mono.just(new MongoRuntimeObjectDocument("S001", "Supplier", Map.of("name", "Supplier 1"))));
        when(template.find(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Flux.just(document("PO005", "DELAYED", 4)));
        when(template.count(any(), eq("purchase_orders"))).thenReturn(Mono.just(1L));

        StepVerifier.create(provider.getLinks(
                        RuntimeProviderTestFixtures.context("app-1"),
                        "Supplier",
                        "S001",
                        "supplier_orders",
                        new com.celanworksmith.runtime.dto.ObjectSetQuery(
                                RuntimeProviderTestFixtures.filter("status", "DELAYED"), "id", "asc", 0, 10)))
                .assertNext(result -> assertThat(result.items()).hasSize(1))
                .verifyComplete();

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(template).find(queryCaptor.capture(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders"));
        assertThat(queryCaptor.getValue().getQueryObject().toString())
                .contains("supplierId", "S001", "status", "DELAYED");
    }

    @Test
    void mergesStructuredV1FilterWithRelationshipCondition() {
        when(resolver.resolve("app-1")).thenReturn(Mono.just(RuntimeProviderTestFixtures.binding()));
        when(template.findOne(any(), eq(MongoRuntimeObjectDocument.class), eq("suppliers")))
                .thenReturn(
                        Mono.just(new MongoRuntimeObjectDocument("S001", "Supplier", Map.of("name", "Supplier 1"))));
        when(template.find(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Flux.empty());
        when(template.count(any(), eq("purchase_orders"))).thenReturn(Mono.just(0L));
        var filter = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
        filter.put("typeId", "PurchaseOrder").put("version", 1);
        filter.putArray("conditions")
                .addObject()
                .put("propertyId", "delayDays")
                .put("operator", "gt")
                .put("value", 0);

        StepVerifier.create(provider.getLinks(
                        RuntimeProviderTestFixtures.context("app-1"),
                        "Supplier",
                        "S001",
                        "supplier_orders",
                        new com.celanworksmith.runtime.dto.ObjectSetQuery(filter, "id", "asc", 0, 10)))
                .assertNext(result -> assertThat(result.total()).isZero())
                .verifyComplete();
        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(template).find(queryCaptor.capture(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders"));
        assertThat(queryCaptor.getValue().getQueryObject().toString()).contains("delayDays", "supplierId", "S001");
    }

    @Test
    void rejectsUnknownLinkSourceObject() {
        when(resolver.resolve("app-1")).thenReturn(Mono.just(RuntimeProviderTestFixtures.binding()));
        when(template.findOne(any(), eq(MongoRuntimeObjectDocument.class), eq("suppliers")))
                .thenReturn(Mono.empty());

        StepVerifier.create(provider.getLinks(
                        RuntimeProviderTestFixtures.context("app-1"),
                        "Supplier",
                        "S404",
                        "supplier_orders",
                        RuntimeProviderTestFixtures.query(0, 10)))
                .expectErrorMessage("Unknown object: Supplier/S404")
                .verify();
        verify(template, never()).find(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders"));
    }

    @Test
    void translatesStructuredIsEmptyToMongoOrNullOrEmptyString() {
        when(resolver.resolve("app-1")).thenReturn(Mono.just(RuntimeProviderTestFixtures.binding()));
        when(template.find(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Flux.empty());
        when(template.count(any(), eq("purchase_orders"))).thenReturn(Mono.just(0L));
        var filter = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
        filter.put("typeId", "PurchaseOrder").put("version", 1);
        filter.putArray("conditions").addObject().put("propertyId", "status").put("operator", "isEmpty");

        StepVerifier.create(provider.queryObjects(
                        RuntimeProviderTestFixtures.context("app-1"),
                        "PurchaseOrder",
                        new com.celanworksmith.runtime.dto.ObjectSetQuery(filter, "id", "asc", 0, 10)))
                .expectNextCount(1)
                .verifyComplete();
        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(template).find(queryCaptor.capture(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders"));
        assertThat(queryCaptor.getValue().getQueryObject().toString()).contains("$or", "status", "null");
    }

    @Test
    void addsCaseInsensitiveSearchAcrossIdAndDeclaredProperties() {
        when(resolver.resolve("app-1")).thenReturn(Mono.just(RuntimeProviderTestFixtures.binding()));
        when(template.find(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Flux.empty());
        when(template.count(any(), eq("purchase_orders"))).thenReturn(Mono.just(0L));

        StepVerifier.create(provider.queryObjects(
                        RuntimeProviderTestFixtures.context("app-1"),
                        "PurchaseOrder",
                        new com.celanworksmith.runtime.dto.ObjectSetQuery(null, "id", "asc", 0, 10, "delayed")))
                .expectNextCount(1)
                .verifyComplete();

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(template).find(queryCaptor.capture(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders"));
        assertThat(queryCaptor.getValue().getQueryObject().toString())
                .contains("$or", "_id", "properties.status", "\\Qdelayed\\E");
    }

    @Test
    void filtersDeclaredPrimaryKeyAgainstMongoDocumentIdWhenItIsNotAProperty() {
        when(template.find(any(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders")))
                .thenReturn(Flux.empty());
        when(template.count(any(), eq("purchase_orders"))).thenReturn(Mono.just(0L));
        var filter = com.fasterxml.jackson.databind.node.JsonNodeFactory.instance.objectNode();
        filter.put("typeId", "PurchaseOrder").put("version", 1);
        filter.putArray("conditions")
                .addObject()
                .put("propertyId", "id")
                .put("operator", "contains")
                .put("value", "PO");

        StepVerifier.create(provider.queryObjects(
                        primaryKeyOnlyDefinition(),
                        "PurchaseOrder",
                        new com.celanworksmith.runtime.dto.ObjectSetQuery(filter, "id", "asc", 0, 10)))
                .expectNextCount(1)
                .verifyComplete();

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(template).find(queryCaptor.capture(), eq(MongoRuntimeObjectDocument.class), eq("purchase_orders"));
        assertThat(queryCaptor.getValue().getQueryObject().toString()).contains("_id", "\\QPO\\E");
    }

    private OntologyProjectDefinition primaryKeyOnlyDefinition() {
        return new OntologyProjectDefinition(
                "celanworksmith-demo",
                "1.0.0",
                1,
                List.of(new ObjectTypeDTO(
                        "PurchaseOrder",
                        "Purchase Order",
                        "purchase_orders",
                        "id",
                        List.of(new PropertyDTO("delayDays", "Delay Days", "integer", false, false, false)))),
                List.of(),
                List.of(),
                List.of());
    }

    private MongoRuntimeObjectDocument document(String id, String status, int delayDays) {
        Map<String, Object> properties = new LinkedHashMap<>();
        properties.put("status", status);
        properties.put("delayDays", delayDays);
        return new MongoRuntimeObjectDocument(id, "PurchaseOrder", properties);
    }
}
