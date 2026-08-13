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
                        List.of(),
                        List.of(),
                        List.of()));
    }
}
