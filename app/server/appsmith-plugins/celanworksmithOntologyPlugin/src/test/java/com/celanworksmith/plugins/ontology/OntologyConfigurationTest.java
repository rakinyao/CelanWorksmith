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
    }

    @Test
    void rejectsDatasourceWithoutSnapshotId() {
        DatasourceConfiguration configuration = datasourceConfiguration();
        configuration.setProperties(List.of(
                property("projectId", "supply-chain"),
                property("projectVersion", "1.0.0"),
                property("metadataDigest", "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"),
                property("runtimeProviderId", "demo-mongo-readonly")));

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
                property("runtimeProviderId", "demo-mongo-readonly")));

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
    }

    @Test
    void datasourceFormExposesReadOnlyImportedProjectMetadata() throws IOException {
        JsonNode children = new ObjectMapper()
                .readTree(getClass().getResourceAsStream("/form.json"))
                .at("/form/0/children");

        assertHiddenPropertyKey(children, 5, "projectName");
        assertHiddenPropertyKey(children, 6, "sourceKind");
        assertReadOnlyPropertyValue(children, 5);
        assertReadOnlyPropertyValue(children, 6);
    }

    private DatasourceConfiguration datasourceConfiguration() {
        DatasourceConfiguration configuration = new DatasourceConfiguration();
        configuration.setProperties(List.of(
                property("projectId", "supply-chain"),
                property("projectVersion", "1.0.0"),
                property("metadataSnapshotId", "snapshot-001"),
                property("metadataDigest", "sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789"),
                property("runtimeProviderId", "demo-mongo-readonly")));
        return configuration;
    }

    private Property property(String key, String value) {
        return new Property(key, value);
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
}
