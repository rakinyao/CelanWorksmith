package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.Property;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class OntologyConfigurationTest {

    @Test
    void readsAValidPinnedDatasourceConfiguration() {
        OntologyDatasourceConfiguration configuration = OntologyDatasourceConfiguration.from(datasourceConfiguration());

        assertEquals("supply-chain", configuration.projectId());
        assertEquals("1.0.0", configuration.projectVersion());
        assertEquals("snapshot-001", configuration.metadataSnapshotId());
        assertEquals(
                "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789",
                configuration.metadataDigest());
        assertEquals("demo-mongo-readonly", configuration.runtimeProviderId());
        assertEquals("workspace-1", configuration.workspaceId());
        assertEquals("datasource-1", configuration.datasourceId());
    }

    @Test
    void rejectsDatasourceWithoutSnapshotId() {
        DatasourceConfiguration configuration = datasourceConfiguration();
        configuration.setProperties(List.of(
                property("projectId", "supply-chain"),
                property("projectVersion", "1.0.0"),
                property("metadataDigest", "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"),
                property("runtimeProviderId", "demo-mongo-readonly"),
                property("workspaceId", "workspace-1"),
                property("datasourceId", "datasource-1")));

        assertThrows(IllegalArgumentException.class, () -> OntologyDatasourceConfiguration.from(configuration));
    }

    @Test
    void rejectsDatasourceWithInvalidDigest() {
        DatasourceConfiguration configuration = datasourceConfiguration();
        configuration.setProperties(List.of(
                property("projectId", "supply-chain"),
                property("projectVersion", "1.0.0"),
                property("metadataSnapshotId", "snapshot-001"),
                property("metadataDigest", "not-a-digest"),
                property("runtimeProviderId", "demo-mongo-readonly"),
                property("workspaceId", "workspace-1"),
                property("datasourceId", "datasource-1")));

        assertThrows(IllegalArgumentException.class, () -> OntologyDatasourceConfiguration.from(configuration));
    }

    @Test
    void readsObjectQueryConfiguration() {
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(Map.of("operation", "OBJECT_QUERY", "definition", Map.of("objectTypeId", "PurchaseOrder")));

        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action);

        assertEquals(OntologyActionConfiguration.Operation.OBJECT_QUERY, configuration.operation());
        assertEquals("PurchaseOrder", configuration.definition().get("objectTypeId"));
    }

    @Test
    void unwrapsNativeUqiEditorValuesBeforeValidatingTheOntologyQuery() {
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(Map.of(
                "operation", Map.of("data", "OBJECT_QUERY"),
                "definition", Map.of("data", Map.of("objectTypeId", "PurchaseOrder"))));

        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action);

        assertEquals(OntologyActionConfiguration.Operation.OBJECT_QUERY, configuration.operation());
        assertEquals("PurchaseOrder", configuration.definition().get("objectTypeId"));
    }

    @Test
    void parsesNativeUqiJsonDefinitionTextBeforeValidatingTheOntologyQuery() {
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(Map.of(
                "operation", Map.of("data", "OBJECT_QUERY"),
                "definition", Map.of("data", "{\"objectTypeId\":\"PurchaseOrder\"}")));

        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action);

        assertEquals("PurchaseOrder", configuration.definition().get("objectTypeId"));
    }

    @Test
    void mergesNativeUqiSelectorFieldsIntoTheAdvancedDefinition() {
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(Map.of(
                "operation", Map.of("data", "ACTION_QUERY"),
                "actionId", Map.of("data", "ReschedulePurchaseOrder"),
                "objectTypeId", Map.of("data", "PurchaseOrder"),
                "objectId", Map.of("data", "PO001"),
                "definition", Map.of("data", "{\"actionId\":\"ignored\",\"parameters\":{}}")));

        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action);

        assertEquals("ReschedulePurchaseOrder", configuration.definition().get("actionId"));
        assertEquals("PurchaseOrder", configuration.definition().get("objectTypeId"));
        assertEquals("PO001", configuration.definition().get("objectId"));
        assertEquals(Map.of(), configuration.definition().get("parameters"));
    }

    @Test
    void rejectsActionConfigurationThatOverridesDatasourceContext() {
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(Map.of(
                "operation", "ACTION_QUERY",
                "projectVersion", "2.0.0",
                "callerContext", "forged",
                "definition", Map.of("actionId", "UpdateProductionSchedule")));

        assertThrows(IllegalArgumentException.class, () -> OntologyActionConfiguration.from(action));
    }

    @Test
    void datasourceFormPersistsKeysForPinnedProperties() throws IOException {
        JsonNode children = new ObjectMapper()
                .readTree(getClass().getResourceAsStream("/form.json"))
                .at("/form/0/children");

        assertHiddenPropertyKey(children, 0, "projectId");
        assertHiddenPropertyKey(children, 1, "projectVersion");
        assertHiddenPropertyKey(children, 2, "metadataSnapshotId");
        assertHiddenPropertyKey(children, 3, "metadataDigest");
        assertHiddenPropertyKey(children, 4, "runtimeProviderId");
        assertHiddenPropertyKey(children, 5, "workspaceId");
        assertHiddenPropertyKey(children, 6, "datasourceId");
    }

    @Test
    void datasourceFormExposesReadOnlyImportedProjectMetadata() throws IOException {
        JsonNode children = new ObjectMapper()
                .readTree(getClass().getResourceAsStream("/form.json"))
                .at("/form/0/children");

        assertHiddenPropertyKey(children, 7, "projectName");
        assertHiddenPropertyKey(children, 8, "sourceKind");
        assertReadOnlyPropertyValue(children, 7);
        assertReadOnlyPropertyValue(children, 8);
    }

    @Test
    void shipsNativeUqiResourcesForEachOntologyOperationWithoutTrustedContextInputs() throws IOException {
        JsonNode root = readEditorResource("root.json");
        assertEquals(
                "OBJECT_QUERY",
                root.at("/editor/0/children/0/children/0/initialValue").asText());
        assertEquals(4, root.at("/editor/0/children/0/children/0/options").size());
        for (String resource :
                List.of("object-query.json", "function-query.json", "action-query.json", "link-query.json")) {
            JsonNode editor = readEditorResource(resource);
            JsonNode children = editor.at("/children/0/children");
            assertEquals(
                    "actionConfiguration.formData.definition.data",
                    findControl(children, "actionConfiguration.formData.definition.data")
                            .path("configProperty")
                            .asText());
            assertTrue(editor.toString().contains("definition"));
            assertTrue(!editor.toString().contains("metadataDigest"));
            assertTrue(!editor.toString().contains("workspaceId"));
        }
    }

    @Test
    void exposesNativeMetadataSelectorsForEachOntologyOperation() throws IOException {
        assertSelector("object-query.json", "objectTypeId", "ONTOLOGY_OBJECT_TYPES");
        assertSelector("function-query.json", "functionId", "ONTOLOGY_FUNCTIONS");
        assertSelector("action-query.json", "actionId", "ONTOLOGY_ACTIONS");
        assertSelector("link-query.json", "linkId", "ONTOLOGY_LINKS");
    }

    private DatasourceConfiguration datasourceConfiguration() {
        DatasourceConfiguration configuration = new DatasourceConfiguration();
        configuration.setProperties(List.of(
                property("projectId", "supply-chain"),
                property("projectVersion", "1.0.0"),
                property("metadataSnapshotId", "snapshot-001"),
                property("metadataDigest", "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"),
                property("runtimeProviderId", "demo-mongo-readonly"),
                property("workspaceId", "workspace-1"),
                property("datasourceId", "datasource-1")));
        return configuration;
    }

    private Property property(String key, String value) {
        return new Property(key, value);
    }

    private JsonNode readEditorResource(String resource) throws IOException {
        return new ObjectMapper().readTree(getClass().getResourceAsStream("/editor/" + resource));
    }

    private void assertHiddenPropertyKey(JsonNode children, int propertyIndex, String propertyKey) {
        String configProperty = "datasourceConfiguration.properties[" + propertyIndex + "].key";
        boolean exists = false;

        for (JsonNode child : children) {
            if (configProperty.equals(child.path("configProperty").asText())
                    && propertyKey.equals(child.path("initialValue").asText())
                    && child.path("hidden").asBoolean()) {
                exists = true;
                break;
            }
        }

        assertTrue(exists, "Expected hidden datasource property key for " + propertyKey);
    }

    private void assertReadOnlyPropertyValue(JsonNode children, int propertyIndex) {
        String configProperty = "datasourceConfiguration.properties[" + propertyIndex + "].value";
        boolean exists = false;

        for (JsonNode child : children) {
            if (configProperty.equals(child.path("configProperty").asText())
                    && child.path("disabled").asBoolean()) {
                exists = true;
                break;
            }
        }

        assertTrue(exists, "Expected read-only datasource property value at index " + propertyIndex);
    }

    private void assertSelector(String resource, String selectorField, String requestType) throws IOException {
        JsonNode editor = readEditorResource(resource);
        JsonNode selector = editor.at("/children/0/children/0");
        assertEquals(
                "actionConfiguration.formData." + selectorField + ".data",
                selector.path("configProperty").asText());
        assertEquals("DROP_DOWN", selector.path("controlType").asText());
        assertEquals(
                requestType,
                selector.at("/conditionals/fetchDynamicValues/config/params/requestType")
                        .asText());
    }

    private JsonNode findControl(JsonNode children, String configProperty) {
        for (JsonNode child : children) {
            if (configProperty.equals(child.path("configProperty").asText())) {
                return child;
            }
        }
        throw new AssertionError("Expected control: " + configProperty);
    }
}
