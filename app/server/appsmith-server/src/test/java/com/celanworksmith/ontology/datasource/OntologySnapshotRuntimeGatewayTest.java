package com.celanworksmith.ontology.datasource;

import com.appsmith.external.models.Datasource;
import com.appsmith.server.datasources.base.DatasourceService;
import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
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
import static org.mockito.Mockito.never;
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
                        assertThat(type.primaryKey()).isEqualTo("id");
                        assertThat(type.properties())
                                .extracting(OntologyRuntimeGateway.PropertyMetadata::id)
                                .containsExactly("id", "amount");
                    });
                    assertThat(gatewaySnapshot.functions()).singleElement().satisfies(function -> {
                        assertThat(function.id()).isEqualTo("delayScore");
                        assertThat(function.ownerObjectTypeIds()).containsExactly("PurchaseOrder");
                        assertThat(function.maxItems()).isEqualTo(2);
                    });
                    assertThat(gatewaySnapshot.actions()).singleElement().satisfies(action -> {
                        assertThat(action.id()).isEqualTo("updateSchedule");
                        assertThat(action.ownerObjectTypeIds()).containsExactly("PurchaseOrder");
                        assertThat(action.atomic()).isFalse();
                    });
                })
                .verifyComplete();

        OntologyRuntimeGateway.ObjectQuery query =
                new OntologyRuntimeGateway.ObjectQuery(List.of("id", "amount"), null, "amount", "desc", 20, 10);
        OntologyRuntimeGateway.Snapshot gatewaySnapshot =
                new OntologyRuntimeGateway.Snapshot(snapshot.id(), snapshot.metadataDigest(), List.of());
        StepVerifier.create(gateway.queryObjects(gatewaySnapshot, "PurchaseOrder", query))
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

        StepVerifier.create(gateway.executeFunction(
                        pinned,
                        "delayScore",
                        new OntologyObjectSet("PurchaseOrder", List.of("po-1")),
                        Map.of("delayDays", 5)))
                .expectNext(50)
                .verifyComplete();
        StepVerifier.create(gateway.resolveLink(pinned, "PurchaseOrder", "po-1", "po_delivery"))
                .expectNext(List.of(Map.of("id", "delivery-1", "status", "LATE")))
                .verifyComplete();

        org.mockito.ArgumentCaptor<com.celanworksmith.runtime.dto.FunctionExecutionRequest> requestCaptor =
                org.mockito.ArgumentCaptor.forClass(com.celanworksmith.runtime.dto.FunctionExecutionRequest.class);
        verify(provider).executeFunction(eq(snapshot.definition()), eq("delayScore"), requestCaptor.capture());
        assertThat(requestCaptor.getValue().targets())
                .isEqualTo(new OntologyObjectSet("PurchaseOrder", List.of("po-1")));
        assertThat(requestCaptor.getValue().parameters()).containsExactlyEntriesOf(Map.of("delayDays", 5));
        verify(provider)
                .getLinks(
                        eq(snapshot.definition()),
                        eq("PurchaseOrder"),
                        eq("po-1"),
                        eq("po_delivery"),
                        org.mockito.ArgumentMatchers.any(ObjectSetQuery.class));
    }

    @Test
    void validatesEveryTargetAgainstThePinnedRuntimeDefinition() {
        OntologySnapshotService snapshotService = mock(OntologySnapshotService.class);
        RuntimeProvider provider = mock(RuntimeProvider.class);
        OntologyMetadataSnapshot snapshot = snapshot();
        when(snapshotService.getRequiredSnapshot(snapshot.id(), snapshot.metadataDigest()))
                .thenReturn(Mono.just(snapshot));
        when(provider.providerId()).thenReturn("demo-mongo-readonly");
        when(provider.getObject(eq(snapshot.definition()), eq("PurchaseOrder"), eq("PO001")))
                .thenReturn(Mono.just(new ObjectInstanceDTO("PO001", "PurchaseOrder", Map.of())));
        when(provider.getObject(eq(snapshot.definition()), eq("PurchaseOrder"), eq("PO002")))
                .thenReturn(Mono.just(new ObjectInstanceDTO("PO002", "PurchaseOrder", Map.of())));
        OntologyRuntimeGateway gateway =
                new OntologySnapshotRuntimeGateway(snapshotService, new RuntimeProviderRegistry(List.of(provider)));
        OntologyRuntimeGateway.Snapshot pinned =
                new OntologyRuntimeGateway.Snapshot(snapshot.id(), snapshot.metadataDigest(), List.of());

        StepVerifier.create(gateway.validateTargetObjects(
                        pinned, new OntologyObjectSet("PurchaseOrder", List.of("PO001", "PO002"))))
                .verifyComplete();

        verify(provider).getObject(snapshot.definition(), "PurchaseOrder", "PO001");
        verify(provider).getObject(snapshot.definition(), "PurchaseOrder", "PO002");
    }

    @Test
    void validatesWorkspaceScopedTargetsAgainstThePinnedRuntimeDefinition() {
        OntologySnapshotService snapshotService = mock(OntologySnapshotService.class);
        DatasourceService datasourceService = mock(DatasourceService.class);
        RuntimeProvider provider = mock(RuntimeProvider.class);
        OntologyMetadataSnapshot snapshot = snapshot();
        Datasource datasource = new Datasource();
        datasource.setWorkspaceId("workspace-1");
        when(datasourceService.findById("datasource-1")).thenReturn(Mono.just(datasource));
        when(snapshotService.getRequiredSnapshot(snapshot.id(), snapshot.metadataDigest(), "workspace-1"))
                .thenReturn(Mono.just(snapshot));
        when(provider.providerId()).thenReturn("demo-mongo-readonly");
        when(provider.getObject(eq(snapshot.definition()), eq("PurchaseOrder"), eq("PO001")))
                .thenReturn(Mono.just(new ObjectInstanceDTO("PO001", "PurchaseOrder", Map.of())));
        OntologyRuntimeGateway gateway = new OntologySnapshotRuntimeGateway(
                snapshotService, new RuntimeProviderRegistry(List.of(provider)), datasourceService);
        OntologyRuntimeGateway.Snapshot pinned =
                new OntologyRuntimeGateway.Snapshot(snapshot.id(), snapshot.metadataDigest(), List.of());

        StepVerifier.create(gateway.validateTargetObjects(
                        "workspace-1",
                        "datasource-1",
                        pinned,
                        new OntologyObjectSet("PurchaseOrder", List.of("PO001"))))
                .verifyComplete();

        verify(provider).getObject(snapshot.definition(), "PurchaseOrder", "PO001");
        verify(provider, never()).getObject("PurchaseOrder", "PO001");
    }

    @Test
    void rejectsARuntimeTargetThatDoesNotBelongToTheDeclaredType() {
        OntologySnapshotService snapshotService = mock(OntologySnapshotService.class);
        RuntimeProvider provider = mock(RuntimeProvider.class);
        OntologyMetadataSnapshot snapshot = snapshot();
        when(snapshotService.getRequiredSnapshot(snapshot.id(), snapshot.metadataDigest()))
                .thenReturn(Mono.just(snapshot));
        when(provider.providerId()).thenReturn("demo-mongo-readonly");
        when(provider.getObject(eq(snapshot.definition()), eq("PurchaseOrder"), eq("SUP001")))
                .thenReturn(Mono.just(new ObjectInstanceDTO("SUP001", "Supplier", Map.of())));
        OntologyRuntimeGateway gateway =
                new OntologySnapshotRuntimeGateway(snapshotService, new RuntimeProviderRegistry(List.of(provider)));
        OntologyRuntimeGateway.Snapshot pinned =
                new OntologyRuntimeGateway.Snapshot(snapshot.id(), snapshot.metadataDigest(), List.of());

        StepVerifier.create(gateway.validateTargetObjects(
                        pinned, new OntologyObjectSet("PurchaseOrder", List.of("SUP001"))))
                .expectErrorSatisfies(error -> {
                    assertThat(error).isInstanceOf(CelanWorksmithException.class);
                    CelanWorksmithException targetError = (CelanWorksmithException) error;
                    assertThat(targetError.code()).isEqualTo(CelanWorksmithErrorCode.OBJECT_NOT_FOUND);
                    assertThat(targetError).hasMessage("Unknown object: PurchaseOrder/SUP001");
                })
                .verify();
    }

    @Test
    void preservesTheRuntimeTargetNotFoundError() {
        OntologySnapshotService snapshotService = mock(OntologySnapshotService.class);
        RuntimeProvider provider = mock(RuntimeProvider.class);
        OntologyMetadataSnapshot snapshot = snapshot();
        CelanWorksmithException targetNotFound = new CelanWorksmithException(
                CelanWorksmithErrorCode.OBJECT_NOT_FOUND, "Unknown object: PurchaseOrder/PO404");
        when(snapshotService.getRequiredSnapshot(snapshot.id(), snapshot.metadataDigest()))
                .thenReturn(Mono.just(snapshot));
        when(provider.providerId()).thenReturn("demo-mongo-readonly");
        when(provider.getObject(eq(snapshot.definition()), eq("PurchaseOrder"), eq("PO404")))
                .thenReturn(Mono.error(targetNotFound));
        OntologyRuntimeGateway gateway =
                new OntologySnapshotRuntimeGateway(snapshotService, new RuntimeProviderRegistry(List.of(provider)));
        OntologyRuntimeGateway.Snapshot pinned =
                new OntologyRuntimeGateway.Snapshot(snapshot.id(), snapshot.metadataDigest(), List.of());

        StepVerifier.create(
                        gateway.validateTargetObjects(pinned, new OntologyObjectSet("PurchaseOrder", List.of("PO404"))))
                .expectErrorSatisfies(error -> assertThat(error).isSameAs(targetNotFound))
                .verify();
    }

    @Test
    void rejectsPinnedSnapshotWhenPersistedDatasourceBelongsToAnotherWorkspace() {
        OntologySnapshotService snapshotService = mock(OntologySnapshotService.class);
        DatasourceService datasourceService = mock(DatasourceService.class);
        Datasource datasource = new Datasource();
        datasource.setWorkspaceId("workspace-b");
        when(datasourceService.findById("datasource-1")).thenReturn(Mono.just(datasource));
        OntologySnapshotRuntimeGateway gateway = new OntologySnapshotRuntimeGateway(
                snapshotService, new RuntimeProviderRegistry(List.of()), datasourceService);

        StepVerifier.create(gateway.getRequiredSnapshot(
                        "snapshot-1", "sha256:" + "a".repeat(64), "workspace-a", "datasource-1"))
                .expectErrorMessage("Ontology datasource is unavailable for this workspace")
                .verify();

        verify(snapshotService, never()).getRequiredSnapshot("snapshot-1", "sha256:" + "a".repeat(64), "workspace-a");
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
                                List.of("PurchaseOrder"),
                                List.of(new PropertyDTO("delayDays", "Delay Days", "INTEGER", true, false, false)),
                                true,
                                2,
                                "DEMO_HANDLER",
                                "demo.delay_score",
                                "1.0.0")),
                        List.of(new com.celanworksmith.ontology.dto.ActionTypeDTO(
                                "updateSchedule",
                                "Update Schedule",
                                List.of("PurchaseOrder"),
                                false,
                                List.of(),
                                false))));
    }
}
