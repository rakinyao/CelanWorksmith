package com.celanworksmith.ontology.datasource;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class OntologyActionServerProtocolTest {
    @Test
    void copiesMapsAndRequiresVersionedRequestIdentity() {
        var request = new OntologyActionServerProtocol.ExecuteRequest(
                "v1",
                "workspace-1",
                "project-1",
                "1.0.0",
                "datasource-1",
                "UpdateProductionSchedule",
                new OntologyObjectSet("PurchaseOrder", List.of("PO001")),
                false,
                Map.of("newScheduleDate", "2026-09-01"),
                Map.of("metadataSnapshotId", "snapshot-1"),
                "key-1");

        assertThat(request.contractVersion()).isEqualTo("v1");
        assertThat(request.parameters()).isUnmodifiable();
        assertThat(request.targets()).isEqualTo(new OntologyObjectSet("PurchaseOrder", List.of("PO001")));
        assertThat(request.atomic()).isFalse();
        assertThatThrownBy(() -> request.parameters().put("x", "y")).isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void rejectsBlankActionIdAndIdempotencyKey() {
        assertThatThrownBy(() -> new OntologyActionServerProtocol.ExecuteRequest(
                        "v1",
                        "workspace-1",
                        "project-1",
                        "1.0.0",
                        "datasource-1",
                        " ",
                        new OntologyObjectSet("PurchaseOrder", List.of("PO001")),
                        false,
                        Map.of(),
                        Map.of(),
                        "key-1"))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new OntologyActionServerProtocol.ExecuteRequest(
                        "v1",
                        "workspace-1",
                        "project-1",
                        "1.0.0",
                        "datasource-1",
                        "UpdateProductionSchedule",
                        new OntologyObjectSet("PurchaseOrder", List.of("PO001")),
                        false,
                        Map.of(),
                        Map.of(),
                        ""))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void retainsAuditAndSafeMessagesAndCopiesSuccessLists() {
        var changedObjects = List.of(new OntologyActionServerProtocol.ChangedObject("PurchaseOrder", "PO001"));
        var changedProperties = List.of(
                new OntologyActionServerProtocol.ChangedProperty("PurchaseOrder", "PO001", "status", "approved"));
        var outcome = new OntologyActionServerProtocol.TargetOutcome(
                new OntologyActionServerProtocol.ChangedObject("PurchaseOrder", "PO001"),
                "SUCCEEDED",
                changedObjects,
                changedProperties,
                null,
                "audit-1");
        var success = new OntologyActionServerProtocol.ExecuteSuccess("v1", List.of(outcome));
        var failure =
                new OntologyActionServerProtocol.DomainFailure("v1", "audit-2", "DOMAIN_REJECTED", "Schedule rejected");

        assertThat(success.outcomes()).containsExactly(outcome);
        assertThat(success.outcomes()).isUnmodifiable();
        assertThat(failure.auditId()).isEqualTo("audit-2");
        assertThat(failure.message()).isEqualTo("Schedule rejected");
    }
}
