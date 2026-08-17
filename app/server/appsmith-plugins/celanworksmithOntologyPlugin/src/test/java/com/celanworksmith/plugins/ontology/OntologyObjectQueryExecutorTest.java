package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionExecutionResult;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.DatasourceStructure;
import com.appsmith.external.models.TriggerRequestDTO;
import com.appsmith.external.models.TriggerResultDTO;
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
import java.util.LinkedHashMap;
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
        assertEquals(1, gateway.queryCalls);
        assertEquals("demo-mongo-readonly", gateway.providerId);
        assertEquals(List.of("id", "supplierId", "delayDays"), gateway.query.projection());
    }

    @Test
    void returnsEmptyResultWithoutTriggeringAnotherProviderCall() {
        RecordingGateway gateway = gateway();
        gateway.emptyResult = true;

        ActionExecutionResult result = execute(gateway, Map.of("objectTypeId", "PurchaseOrder"));

        assertTrue(result.getIsExecutionSuccess());
        assertEquals(List.of(), rows(result));
        assertEquals(1, gateway.queryCalls);
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
    void executesStructuredBuilderFormData() {
        RecordingGateway gateway = gateway();
        ActionExecutionResult result = executeStructured(
                gateway,
                Map.of(
                        "queryMode", "BUILDER",
                        "objectTypeId", "PurchaseOrder",
                        "projection", List.of("id", "delayDays"),
                        "filter",
                                Map.of(
                                        "conditions",
                                        List.of(Map.of("propertyId", "delayDays", "operator", "gt", "value", 4))),
                        "sort", List.of(Map.of("propertyId", "delayDays", "direction", "DESC")),
                        "page", Map.of("offset", 20, "limit", 10)));

        assertTrue(result.getIsExecutionSuccess());
        assertEquals(List.of("id", "delayDays"), gateway.query.projection());
        assertEquals("delayDays", gateway.query.sortBy());
        assertEquals(20, gateway.query.offset());
        assertEquals(10, gateway.query.limit());
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
    void rejectsHiddenPropertyProjectionBeforeProviderCall() {
        RecordingGateway gateway = gateway();

        ActionExecutionResult result =
                execute(gateway, Map.of("objectTypeId", "PurchaseOrder", "projection", List.of("internalNote")));

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
        assertEquals(1, gateway.queryCalls);
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

    @Test
    void exposesPinnedObjectTypesForTheNativeQueryEditor() {
        RecordingGateway gateway = gateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        TriggerResultDTO result = executor.trigger(
                        datasource(),
                        datasourceConfiguration(),
                        new TriggerRequestDTO("ONTOLOGY_OBJECT_TYPES", Map.of(), null))
                .block();

        assertEquals(
                List.of(metadata("PurchaseOrder", "PurchaseOrder", "object", false, true, false)), result.getTrigger());
        assertEquals(List.of(new SnapshotRequest(SNAPSHOT_ID, DIGEST)), gateway.snapshotRequests);
    }

    @Test
    void exposesEmptyFunctionMetadataWithoutBlockingTheQueryEditor() {
        RecordingGateway gateway = gateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        TriggerResultDTO result = executor.trigger(
                        datasource(),
                        datasourceConfiguration(),
                        new TriggerRequestDTO("ONTOLOGY_FUNCTIONS", Map.of(), null))
                .block();

        assertEquals(List.of(), result.getTrigger());
    }

    @Test
    void exposesRichVisiblePropertyMetadataAndFiltersHiddenProperties() {
        RecordingGateway gateway = gateway();
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);

        TriggerResultDTO result = executor.trigger(
                        datasource(),
                        datasourceConfiguration(),
                        new TriggerRequestDTO(
                                "ONTOLOGY_OBJECT_PROPERTIES", Map.of("objectTypeId", "PurchaseOrder"), null))
                .block();

        assertEquals(
                List.of(
                        propertyMetadata("id", "id", "string", false, false, false),
                        propertyMetadata("supplierId", "supplierId", "string", false, false, false),
                        propertyMetadata("delayDays", "delayDays", "integer", false, false, false)),
                result.getTrigger());
    }

    private ActionExecutionResult execute(RecordingGateway gateway, Map<String, Object> definition) {
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(Map.of("operation", "OBJECT_QUERY", "definition", definition));
        return executor.execute(datasource(), null, action).block();
    }

    private ActionExecutionResult executeStructured(RecordingGateway gateway, Map<String, Object> formData) {
        OntologyPlugin.OntologyPluginExecutor executor = new OntologyPlugin.OntologyPluginExecutor(gateway);
        ActionConfiguration action = new ActionConfiguration();
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("operation", "OBJECT_QUERY");
        values.putAll(formData);
        action.setFormData(values);
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

    private Map<String, Object> metadata(
            String label, String value, String dataType, boolean required, boolean readOnly, boolean derived) {
        Map<String, Object> metadata = new LinkedHashMap<>();
        metadata.put("label", label);
        metadata.put("value", value);
        metadata.put("dataType", dataType);
        metadata.put("description", description(label, dataType, required, readOnly, derived));
        metadata.put("enumValues", List.of());
        metadata.put("referenceTypeId", null);
        metadata.put("required", required);
        metadata.put("readOnly", readOnly);
        metadata.put("derived", derived);
        return metadata;
    }

    private Map<String, Object> propertyMetadata(
            String label, String value, String dataType, boolean required, boolean readOnly, boolean derived) {
        Map<String, Object> metadata = metadata(label, value, dataType, required, readOnly, derived);
        metadata.put(
                "operators",
                OntologyQueryOperatorCatalog.operatorsFor(dataType).stream()
                        .map(operator -> Map.of("value", operator.value(), "label", operator.label()))
                        .toList());
        return metadata;
    }

    private String description(String label, String dataType, boolean required, boolean readOnly, boolean derived) {
        String description = label + " (" + dataType + ")";
        if (required) description += "; required";
        if (readOnly) description += "; read-only";
        if (derived) description += "; derived";
        return description;
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
        private boolean emptyResult;

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
            List<Map<String, Object>> items = emptyResult
                    ? List.of()
                    : List.of(Map.of(
                            "id", "po-1", "supplierId", "supplier-7", "delayDays", 5, "internalNote", "private"));
            return Mono.just(new ObjectQueryResult(items, query.offset(), query.limit(), 21));
        }
    }
}
