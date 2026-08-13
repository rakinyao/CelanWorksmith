package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionExecutionResult;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.DatasourceStructure;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.ObjectQuery;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.ObjectQueryResult;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.ObjectTypeMetadata;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.PropertyMetadata;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway.Snapshot;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OntologyObjectQueryExecutorTest {

    private static final String SNAPSHOT_ID = "snapshot-001";
    private static final String DIGEST = "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";

    @Test
    void returnsAllDisplayablePropertiesWhenProjectionIsOmitted() {
        RecordingGateway gateway = gateway();

        ActionExecutionResult result = execute(gateway, Map.of("objectTypeId", "PurchaseOrder"));

        assertTrue(result.getIsExecutionSuccess());
        List<Map<String, Object>> rows = rows(result);
        assertEquals(List.of(Map.of("id", "po-1", "supplierId", "supplier-7", "delayDays", 5)), rows);
        assertEquals(List.of("id", "supplierId", "delayDays"), gateway.query.projection());
    }

    @Test
    void returnsOnlyExplicitStableIdProjection() {
        RecordingGateway gateway = gateway();

        ActionExecutionResult result =
                execute(gateway, Map.of("objectTypeId", "PurchaseOrder", "projection", List.of("id", "delayDays")));

        assertTrue(result.getIsExecutionSuccess());
        assertEquals(List.of(Map.of("id", "po-1", "delayDays", 5)), rows(result));
        assertEquals(List.of("id", "delayDays"), gateway.query.projection());
    }

    @Test
    void forwardsTypedFilterSortAndPageToTheResolvedProvider() {
        RecordingGateway gateway = gateway();
        Map<String, Object> definition = Map.of(
                "objectTypeId", "PurchaseOrder",
                "filter",
                        Map.of("conditions", List.of(Map.of("propertyId", "delayDays", "operator", "gt", "value", 4))),
                "sort", List.of(Map.of("propertyId", "delayDays", "direction", "DESC")),
                "page", Map.of("offset", 20, "limit", 10));

        ActionExecutionResult result = execute(gateway, definition);

        assertTrue(result.getIsExecutionSuccess());
        assertEquals("demo-mongo-readonly", gateway.providerId);
        assertEquals("PurchaseOrder", gateway.objectTypeId);
        assertEquals("delayDays", gateway.query.sortBy());
        assertEquals("desc", gateway.query.sortDirection());
        assertEquals(20, gateway.query.offset());
        assertEquals(10, gateway.query.limit());
        JsonNode filter = gateway.query.filter();
        assertEquals("PurchaseOrder", filter.path("typeId").asText());
        assertEquals(1, filter.path("version").asInt());
        assertEquals(4, filter.at("/conditions/0/value").asInt());
    }

    @Test
    void rejectsUnknownObjectBeforeProviderCall() {
        RecordingGateway gateway = gateway();

        ActionExecutionResult result = execute(gateway, Map.of("objectTypeId", "UnknownObject"));

        assertFalse(result.getIsExecutionSuccess());
        assertEquals(0, gateway.queryCalls);
        assertTrue(result.getReadableError().contains("Unknown ontology object type"));
    }

    @Test
    void rejectsUnknownPropertyBeforeProviderCall() {
        RecordingGateway gateway = gateway();

        ActionExecutionResult result =
                execute(gateway, Map.of("objectTypeId", "PurchaseOrder", "projection", List.of("unknownProperty")));

        assertFalse(result.getIsExecutionSuccess());
        assertEquals(0, gateway.queryCalls);
        assertTrue(result.getReadableError().contains("Unknown ontology property"));
    }

    @Test
    void mapsProviderErrorsToAStandardFailedResult() {
        RecordingGateway gateway = gateway();
        gateway.queryFailure = new IllegalStateException("Provider unavailable");

        ActionExecutionResult result = execute(gateway, Map.of("objectTypeId", "PurchaseOrder"));

        assertFalse(result.getIsExecutionSuccess());
        assertTrue(result.getReadableError().contains("Provider unavailable"));
    }

    @Test
    void usesOnlyThePinnedSnapshotWithoutRefreshingMetadata() {
        RecordingGateway gateway = gateway();

        execute(gateway, Map.of("objectTypeId", "PurchaseOrder"));

        assertEquals(List.of(new SnapshotRequest(SNAPSHOT_ID, DIGEST)), gateway.snapshotRequests);
        assertEquals(0, gateway.liveMetadataRefreshCalls);
    }

    @Test
    void exposesPinnedObjectTypesAndVisiblePropertiesAsNativeDatasourceStructure() {
        RecordingGateway gateway = gateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        DatasourceStructure structure =
                executor.getStructure(datasource(), datasourceConfiguration()).block();

        assertEquals(1, structure.getTables().size());
        DatasourceStructure.Table objectType = structure.getTables().getFirst();
        assertEquals(DatasourceStructure.TableType.TABLE, objectType.getType());
        assertEquals("PurchaseOrder", objectType.getName());
        assertEquals(
                List.of("id", "supplierId", "delayDays"),
                objectType.getColumns().stream()
                        .map(DatasourceStructure.Column::getName)
                        .toList());
        assertEquals(
                List.of("string", "string", "integer"),
                objectType.getColumns().stream()
                        .map(DatasourceStructure.Column::getType)
                        .toList());
        assertEquals(1, gateway.snapshotRequests.size());
    }

    private ActionExecutionResult execute(RecordingGateway gateway, Map<String, Object> definition) {
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(Map.of("operation", "OBJECT_QUERY", "definition", definition));
        return executor.execute(datasource(), null, action).block();
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> rows(ActionExecutionResult result) {
        return assertInstanceOf(List.class, result.getBody());
    }

    private OntologyDatasourceConfiguration datasource() {
        return new OntologyDatasourceConfiguration(
                "supply-chain", "1.0.0", SNAPSHOT_ID, DIGEST, "demo-mongo-readonly", "workspace-1", "datasource-1");
    }

    private DatasourceConfiguration datasourceConfiguration() {
        DatasourceConfiguration configuration = new DatasourceConfiguration();
        configuration.setProperties(List.of(
                new com.appsmith.external.models.Property("projectId", "supply-chain"),
                new com.appsmith.external.models.Property("projectVersion", "1.0.0"),
                new com.appsmith.external.models.Property("metadataSnapshotId", SNAPSHOT_ID),
                new com.appsmith.external.models.Property("metadataDigest", DIGEST),
                new com.appsmith.external.models.Property("runtimeProviderId", "demo-mongo-readonly"),
                new com.appsmith.external.models.Property("workspaceId", "workspace-1"),
                new com.appsmith.external.models.Property("datasourceId", "datasource-1")));
        return configuration;
    }

    private RecordingGateway gateway() {
        return new RecordingGateway(new Snapshot(
                SNAPSHOT_ID,
                DIGEST,
                List.of(new ObjectTypeMetadata(
                        "PurchaseOrder",
                        List.of(
                                new PropertyMetadata("id", "string", false),
                                new PropertyMetadata("supplierId", "string", false),
                                new PropertyMetadata("delayDays", "integer", false),
                                new PropertyMetadata("internalNote", "string", true))))));
    }

    private record SnapshotRequest(String snapshotId, String digest) {}

    private static final class RecordingGateway implements OntologyRuntimeGateway {
        private final Snapshot snapshot;
        private final List<SnapshotRequest> snapshotRequests = new ArrayList<>();
        private int liveMetadataRefreshCalls;
        private int queryCalls;
        private String providerId;
        private String objectTypeId;
        private ObjectQuery query;
        private RuntimeException queryFailure;

        private RecordingGateway(Snapshot snapshot) {
            this.snapshot = snapshot;
        }

        @Override
        public Mono<Snapshot> getRequiredSnapshot(String snapshotId, String digest) {
            snapshotRequests.add(new SnapshotRequest(snapshotId, digest));
            return Mono.just(snapshot);
        }

        @Override
        public Mono<ObjectQueryResult> queryObjects(
                String providerId, Snapshot snapshot, String objectTypeId, ObjectQuery query) {
            queryCalls++;
            this.providerId = providerId;
            this.objectTypeId = objectTypeId;
            this.query = query;
            if (queryFailure != null) {
                return Mono.error(queryFailure);
            }
            return Mono.just(new ObjectQueryResult(
                    List.of(Map.of(
                            "id", "po-1", "supplierId", "supplier-7", "delayDays", 5, "internalNote", "private")),
                    query.offset(),
                    query.limit(),
                    21));
        }
    }
}
