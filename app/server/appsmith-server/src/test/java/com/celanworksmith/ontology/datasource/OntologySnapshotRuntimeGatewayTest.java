package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.runtime.dto.ObjectInstanceDTO;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.celanworksmith.runtime.dto.ObjectSetResult;
import com.celanworksmith.runtime.port.RuntimeProvider;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OntologySnapshotRuntimeGatewayTest {
    @Test
    void mapsThePinnedSnapshotAndGatewayQueryToTheResolvedProvider() {
        OntologySnapshotService snapshotService = mock(OntologySnapshotService.class);
        RuntimeProvider provider = mock(RuntimeProvider.class);
        OntologyMetadataSnapshot snapshot = snapshot();
        when(snapshotService.getRequiredSnapshot(snapshot.id(), snapshot.metadataDigest()))
                .thenReturn(Mono.just(snapshot));
        when(provider.providerId()).thenReturn("demo-mongo-readonly");
        RuntimeProviderRegistry registry = new RuntimeProviderRegistry(List.of(provider));
        when(provider.queryObjects(
                        eq(snapshot.definition()),
                        eq("PurchaseOrder"),
                        org.mockito.ArgumentMatchers.any(ObjectSetQuery.class)))
                .thenReturn(Mono.just(new ObjectSetResult(
                        "PurchaseOrder",
                        List.of(new ObjectInstanceDTO("po-1", "PurchaseOrder", Map.of("amount", 42))),
                        20,
                        10,
                        21)));

        OntologyRuntimeGateway gateway = new OntologySnapshotRuntimeGateway(snapshotService, registry);

        StepVerifier.create(gateway.getRequiredSnapshot(snapshot.id(), snapshot.metadataDigest()))
                .assertNext(gatewaySnapshot -> {
                    assertThat(gatewaySnapshot.id()).isEqualTo(snapshot.id());
                    assertThat(gatewaySnapshot.digest()).isEqualTo(snapshot.metadataDigest());
                    assertThat(gatewaySnapshot.objectTypes()).singleElement().satisfies(type -> {
                        assertThat(type.id()).isEqualTo("PurchaseOrder");
                        assertThat(type.properties())
                                .extracting(OntologyRuntimeGateway.PropertyMetadata::id)
                                .containsExactly("id", "amount");
                    });
                })
                .verifyComplete();

        OntologyRuntimeGateway.ObjectQuery query =
                new OntologyRuntimeGateway.ObjectQuery(List.of("id", "amount"), null, "amount", "desc", 20, 10);
        OntologyRuntimeGateway.Snapshot gatewaySnapshot =
                new OntologyRuntimeGateway.Snapshot(snapshot.id(), snapshot.metadataDigest(), List.of());
        StepVerifier.create(gateway.queryObjects("demo-mongo-readonly", gatewaySnapshot, "PurchaseOrder", query))
                .assertNext(result -> {
                    assertThat(result.items()).containsExactly(Map.of("id", "po-1", "amount", 42));
                    assertThat(result.offset()).isEqualTo(20);
                    assertThat(result.limit()).isEqualTo(10);
                    assertThat(result.total()).isEqualTo(21);
                })
                .verifyComplete();

        verify(snapshotService, times(2)).getRequiredSnapshot(snapshot.id(), snapshot.metadataDigest());
        verify(provider)
                .queryObjects(
                        snapshot.definition(), "PurchaseOrder", new ObjectSetQuery(null, "amount", "desc", 20, 10));
    }

    @Test
    void executesFunctionsAndResolvesLinksThroughThePinnedDefinition() {
        OntologySnapshotService snapshotService = mock(OntologySnapshotService.class);
        RuntimeProvider provider = mock(RuntimeProvider.class);
        OntologyMetadataSnapshot snapshot = snapshot();
        when(snapshotService.getRequiredSnapshot(snapshot.id(), snapshot.metadataDigest()))
                .thenReturn(Mono.just(snapshot));
        when(provider.providerId()).thenReturn("demo-mongo-readonly");
        when(provider.executeFunction(eq(snapshot.definition()), eq("delayScore"), org.mockito.ArgumentMatchers.any()))
                .thenReturn(Mono.just(50));
        when(provider.getLinks(
                        eq(snapshot.definition()),
                        eq("PurchaseOrder"),
                        eq("po-1"),
                        eq("po_delivery"),
                        org.mockito.ArgumentMatchers.any(ObjectSetQuery.class)))
                .thenReturn(Mono.just(new ObjectSetResult(
                        "DeliveryOrder",
                        List.of(new ObjectInstanceDTO("delivery-1", "DeliveryOrder", Map.of("status", "LATE"))),
                        0,
                        50,
                        1)));
        OntologyRuntimeGateway gateway =
                new OntologySnapshotRuntimeGateway(snapshotService, new RuntimeProviderRegistry(List.of(provider)));
        OntologyRuntimeGateway.Snapshot pinned =
                new OntologyRuntimeGateway.Snapshot(snapshot.id(), snapshot.metadataDigest(), List.of());

        StepVerifier.create(
                        gateway.executeFunction("demo-mongo-readonly", pinned, "delayScore", Map.of("delayDays", 5)))
                .expectNext(50)
                .verifyComplete();
        StepVerifier.create(gateway.resolveLink("demo-mongo-readonly", pinned, "PurchaseOrder", "po-1", "po_delivery"))
                .expectNext(List.of(Map.of("id", "delivery-1", "status", "LATE")))
                .verifyComplete();

        verify(provider)
                .executeFunction(eq(snapshot.definition()), eq("delayScore"), org.mockito.ArgumentMatchers.any());
        verify(provider)
                .getLinks(
                        eq(snapshot.definition()),
                        eq("PurchaseOrder"),
                        eq("po-1"),
                        eq("po_delivery"),
                        org.mockito.ArgumentMatchers.any(ObjectSetQuery.class));
    }

    private OntologyMetadataSnapshot snapshot() {
        return new OntologyMetadataSnapshot(
                "snapshot-1",
                "supply-chain",
                "1.0.0",
                "demo",
                "builtin-demo",
                "demo-mongo-readonly",
                "admin-1",
                Instant.parse("2026-08-13T00:00:00Z"),
                "sha256:" + "a".repeat(64),
                new OntologyProjectDefinition(
                        "supply-chain",
                        "1.0.0",
                        1,
                        List.of(new ObjectTypeDTO(
                                "PurchaseOrder",
                                "Purchase Order",
                                List.of(
                                        new PropertyDTO("id", "ID", "STRING", true, true, false),
                                        new PropertyDTO("amount", "Amount", "DECIMAL", true, false, false)),
                                null,
                                "id")),
                        List.of(new com.celanworksmith.ontology.dto.LinkTypeDTO(
                                "po_delivery", "Delivery", "PurchaseOrder", "DeliveryOrder", "ONE_TO_ONE")),
                        List.of(new com.celanworksmith.ontology.dto.FunctionDTO(
                                "delayScore",
                                "Delay Score",
                                "INTEGER",
                                List.of(new PropertyDTO("delayDays", "Delay Days", "INTEGER", true, false, false)),
                                true)),
                        List.of()));
    }
}
