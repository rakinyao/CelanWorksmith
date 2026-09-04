package com.celanworksmith.runtime;

import com.celanworksmith.application.CelanworksmithApplicationBindingResolver;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.ontology.release.OntologyModelReleaseMapper;
import com.celanworksmith.ontology.release.OntologyModelReleaseParser;
import com.celanworksmith.runtime.adapter.mongodb.MongoRuntimeDataProvider;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.bson.Document;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.springframework.data.mongodb.core.query.Query;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ReleaseMappedMongoRuntimeAdapterTest {
    private ReactiveMongoTemplate template;
    private MongoRuntimeDataProvider provider;
    private OntologyProjectDefinition releaseDefinition;

    @BeforeEach
    void setUp() {
        template = mock(ReactiveMongoTemplate.class);
        provider = new MongoRuntimeDataProvider(template, mock(CelanworksmithApplicationBindingResolver.class));
        releaseDefinition =
                new OntologyModelReleaseMapper().map(new OntologyModelReleaseParser().parse(fixtureBytes()));
    }

    @Test
    void queriesTopLevelReleaseAssetFieldsWithMappedFilterSortAndSearch() {
        when(template.find(any(), eq(Document.class), eq("ont_contract")))
                .thenReturn(Flux.just(new Document(Map.of(
                        "id", "CTR-1",
                        "contract_name", "智慧运营中心合同",
                        "customer_code", "CUS-1"))));
        when(template.count(any(), eq("ont_contract"))).thenReturn(Mono.just(1L));

        StepVerifier.create(provider.queryObjects(
                        releaseDefinition,
                        "contract",
                        new ObjectSetQuery(
                                JsonNodeFactory.instance.objectNode().put("contract_name", "智慧运营中心合同"),
                                "contract_name",
                                "desc",
                                0,
                                10,
                                "智慧")))
                .assertNext(result -> {
                    assertThat(result.typeId()).isEqualTo("contract");
                    assertThat(result.items()).singleElement().satisfies(item -> {
                        assertThat(item.id()).isEqualTo("CTR-1");
                        assertThat(item.properties()).containsEntry("contract_name", "智慧运营中心合同");
                    });
                })
                .verifyComplete();

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(template).find(queryCaptor.capture(), eq(Document.class), eq("ont_contract"));
        assertThat(queryCaptor.getValue().getQueryObject().toJson())
                .contains("contract_name", "智慧")
                .doesNotContain("properties.");
        assertThat(queryCaptor.getValue().getSortObject().toJson()).contains("contract_name", "-1");
    }

    @Test
    void getsReleaseObjectsByTheirMappedPrimaryKey() {
        CelanworksmithApplicationBindingResolver resolver = mock(CelanworksmithApplicationBindingResolver.class);
        provider = new MongoRuntimeDataProvider(template, resolver);
        when(resolver.resolve("app-1"))
                .thenReturn(Mono.just(new CelanworksmithApplicationBindingResolver.ResolvedBinding(
                        releaseDefinition, "demo-mongo-readonly")));
        when(template.findOne(any(), eq(Document.class), eq("ont_customer"))).thenAnswer(invocation -> {
            Query query = invocation.getArgument(0);
            return Long.valueOf(1).equals(query.getQueryObject().get("source_customer_id"))
                    ? Mono.just(new Document(
                            Map.of("source_customer_id", 1, "customer_code", "CUS-1", "customer_name", "客户一")))
                    : Mono.empty();
        });

        StepVerifier.create(provider.getObject(RuntimeProviderTestFixtures.context("app-1"), "customer", "1"))
                .assertNext(result -> {
                    assertThat(result.id()).isEqualTo("1");
                    assertThat(result.properties()).containsEntry("customer_name", "客户一");
                })
                .verifyComplete();

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(template).findOne(queryCaptor.capture(), eq(Document.class), eq("ont_customer"));
        assertThat(queryCaptor.getValue().getQueryObject().toJson()).contains("source_customer_id", "1");
    }

    @Test
    void sortsByTheExplicitReleasePrimaryKeyMappingByDefault() {
        OntologyProjectDefinition definition = withPrimaryKeyColumn("contract", "runtime_contract_id");
        when(template.find(any(), eq(Document.class), eq("ont_contract")))
                .thenReturn(Flux.just(new Document(
                        Map.of("runtime_contract_id", "CTR-1", "id", "CTR-1", "contract_name", "智慧运营中心合同"))));
        when(template.count(any(), eq("ont_contract"))).thenReturn(Mono.just(1L));

        StepVerifier.create(provider.queryObjects(definition, "contract", ObjectSetQuery.defaults()))
                .expectNextCount(1)
                .verifyComplete();

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(template).find(queryCaptor.capture(), eq(Document.class), eq("ont_contract"));
        assertThat(queryCaptor.getValue().getSortObject().toJson()).contains("runtime_contract_id");
    }

    @Test
    void filtersReleasePrimaryKeysUsingTheirExplicitMapping() {
        OntologyProjectDefinition definition = withPrimaryKeyColumn("contract", "runtime_contract_id");
        when(template.find(any(), eq(Document.class), eq("ont_contract")))
                .thenReturn(Flux.just(new Document(
                        Map.of("runtime_contract_id", "CTR-1", "id", "CTR-1", "contract_name", "智慧运营中心合同"))));
        when(template.count(any(), eq("ont_contract"))).thenReturn(Mono.just(1L));

        StepVerifier.create(provider.queryObjects(
                        definition,
                        "contract",
                        new ObjectSetQuery(
                                JsonNodeFactory.instance.objectNode().put("id", "CTR-1"), "id", "asc", 0, 10, null)))
                .expectNextCount(1)
                .verifyComplete();

        ArgumentCaptor<Query> queryCaptor = ArgumentCaptor.forClass(Query.class);
        verify(template).find(queryCaptor.capture(), eq(Document.class), eq("ont_contract"));
        assertThat(queryCaptor.getValue().getQueryObject().toJson())
                .contains("runtime_contract_id")
                .doesNotContain("\"id\"");
    }

    @Test
    void traversesAllReleaseLinksUsingTheirExplicitFieldMappings() {
        when(template.findOne(any(), eq(Document.class), anyString())).thenAnswer(invocation -> {
            String collection = invocation.getArgument(2);
            return switch (collection) {
                case "ont_contract" ->
                    Mono.just(new Document(Map.of("id", "CTR-1", "customer_code", "CUS-1", "supplier_code", "SUP-1")));
                case "ont_purchase_order" ->
                    Mono.just(
                            new Document(Map.of("order_no", "PO-1", "contract_no", "CON-1", "supplier_code", "SUP-1")));
                default -> Mono.error(new AssertionError("Unexpected source collection: " + collection));
            };
        });
        when(template.find(any(), eq(Document.class), anyString())).thenAnswer(invocation -> {
            String collection = invocation.getArgument(2);
            return switch (collection) {
                case "ont_customer" ->
                    Flux.just(new Document(Map.of("source_customer_id", "CUS-1", "customer_code", "CUS-1")));
                case "ont_supplier" -> Flux.just(new Document(Map.of("supplier_code", "SUP-1")));
                case "ont_contract" -> Flux.just(new Document(Map.of("id", "CTR-1", "contract_no", "CON-1")));
                default -> Flux.error(new AssertionError("Unexpected target collection: " + collection));
            };
        });
        when(template.count(any(), anyString())).thenReturn(Mono.just(1L));

        List<String> resultTypes = Flux.concat(
                        provider.getLinks(
                                releaseDefinition, "contract", "CTR-1", "contract_customer", ObjectSetQuery.defaults()),
                        provider.getLinks(
                                releaseDefinition, "contract", "CTR-1", "contract_supplier", ObjectSetQuery.defaults()),
                        provider.getLinks(
                                releaseDefinition,
                                "purchase_order",
                                "PO-1",
                                "purchase_order_contract",
                                ObjectSetQuery.defaults()),
                        provider.getLinks(
                                releaseDefinition,
                                "purchase_order",
                                "PO-1",
                                "purchase_order_supplier",
                                ObjectSetQuery.defaults()))
                .map(result -> result.typeId())
                .collectList()
                .block();

        assertThat(resultTypes).containsExactly("customer", "supplier", "contract", "supplier");
        ArgumentCaptor<Query> targetQueries = ArgumentCaptor.forClass(Query.class);
        verify(template, times(4)).find(targetQueries.capture(), eq(Document.class), anyString());
        List<String> queryJson = targetQueries.getAllValues().stream()
                .map(query -> query.getQueryObject().toJson())
                .toList();
        assertThat(queryJson.get(0)).contains("customer_code", "CUS-1").doesNotContain("properties.");
        assertThat(queryJson.get(1)).contains("supplier_code", "SUP-1").doesNotContain("properties.");
        assertThat(queryJson.get(2)).contains("contract_no", "CON-1").doesNotContain("properties.");
        assertThat(queryJson.get(3)).contains("supplier_code", "SUP-1").doesNotContain("properties.");
    }

    @Test
    void exposesAllBusinessReleaseAssetsForCompatibilityValidation() {
        Map<String, Map<String, String>> capabilities =
                provider.metadataCapabilities(releaseDefinition).block().objectProperties();
        assertThat(capabilities).hasSize(4);
        assertThat(capabilities.get("contract")).containsEntry("contract_name", "STRING");
        assertThat(capabilities.get("contract")).containsEntry("original_amount", "DECIMAL");
        assertThat(capabilities.get("contract")).containsEntry("has_warranty", "BOOLEAN");
        assertThat(capabilities.get("contract")).containsEntry("signed_at", "TIMESTAMP");
        assertThat(capabilities.get("customer")).containsEntry("customer_code", "STRING");
        assertThat(capabilities.get("customer")).containsEntry("registered_capital", "DECIMAL");
        assertThat(capabilities.get("supplier")).containsEntry("supplier_code", "STRING");
        assertThat(capabilities.get("supplier")).containsEntry("tax_rate", "DECIMAL");
        assertThat(capabilities.get("supplier")).containsEntry("created_at", "TIMESTAMP");
        assertThat(capabilities.get("purchase_order")).containsEntry("order_no", "STRING");
        assertThat(capabilities.get("purchase_order")).containsEntry("order_amount", "DECIMAL");
        assertThat(capabilities.get("purchase_order")).containsEntry("arrived_at", "TIMESTAMP");
    }

    private static byte[] fixtureBytes() {
        try {
            return Files.readAllBytes(Path.of("../../../docs/superpowers/fixtures/ontology-model-release-demo.json"));
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private OntologyProjectDefinition withPrimaryKeyColumn(String objectTypeId, String column) {
        List<OntologyProjectDefinition.ObjectRuntimeMapping> mappings =
                releaseDefinition.runtimeMappings().objectMappings().stream()
                        .map(mapping -> mapping.objectTypeId().equals(objectTypeId)
                                ? new OntologyProjectDefinition.ObjectRuntimeMapping(
                                        mapping.objectTypeId(), mapping.assetRef(), Map.of("id", column))
                                : mapping)
                        .toList();
        return new OntologyProjectDefinition(
                releaseDefinition.projectId(),
                releaseDefinition.version(),
                releaseDefinition.schemaVersion(),
                releaseDefinition.objectTypes(),
                releaseDefinition.linkTypes(),
                releaseDefinition.functions(),
                releaseDefinition.actions(),
                new OntologyProjectDefinition.RuntimeMappings(
                        mappings, releaseDefinition.runtimeMappings().linkMappings()));
    }
}
