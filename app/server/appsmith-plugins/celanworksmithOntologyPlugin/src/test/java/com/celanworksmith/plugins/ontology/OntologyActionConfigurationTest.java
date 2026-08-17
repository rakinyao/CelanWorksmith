package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.ActionConfiguration;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;

class OntologyActionConfigurationTest {

    @Test
    void structuredFormDataProducesCanonicalDefinition() {
        ActionConfiguration action = action(Map.of(
                "operation", "OBJECT_QUERY",
                "queryMode", "BUILDER",
                "objectTypeId", "PurchaseOrder"));

        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action);

        assertEquals(OntologyActionConfiguration.Operation.OBJECT_QUERY, configuration.operation());
        assertEquals(Map.of("objectTypeId", "PurchaseOrder"), configuration.definition());
    }

    @Test
    void advancedDefinitionIgnoresStaleBuilderFields() {
        ActionConfiguration action = action(Map.of(
                "operation", "OBJECT_QUERY",
                "queryMode", "ADVANCED",
                "objectTypeId", "StaleObject",
                "projection", List.of("staleProperty"),
                "definition", "{\"objectTypeId\":\"PurchaseOrder\",\"projection\":[\"id\"]}"));

        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action);

        assertEquals(Map.of("objectTypeId", "PurchaseOrder", "projection", List.of("id")), configuration.definition());
    }

    @Test
    void legacyDefinitionRemainsSupported() {
        ActionConfiguration action = action(Map.of(
                "operation", "OBJECT_QUERY",
                "objectTypeId", "PurchaseOrder",
                "definition", "{\"objectTypeId\":\"PurchaseOrder\"}"));

        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action);

        assertEquals("PurchaseOrder", configuration.definition().get("objectTypeId"));
    }

    @Test
    void structuredProjectionFilterSortAndPageAreCopied() {
        Map<String, Object> filter =
                Map.of("conditions", List.of(Map.of("propertyId", "delayDays", "operator", "gt", "value", 4)));
        Map<String, Object> sort = Map.of("propertyId", "delayDays", "direction", "DESC");
        Map<String, Object> page = Map.of("offset", 20, "limit", 10);
        ActionConfiguration action = action(Map.of(
                "operation",
                "OBJECT_QUERY",
                "queryMode",
                "BUILDER",
                "objectTypeId",
                "PurchaseOrder",
                "projection",
                List.of("id", "delayDays"),
                "filter",
                filter,
                "sort",
                List.of(sort),
                "page",
                page));

        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action);

        assertEquals(List.of("id", "delayDays"), configuration.definition().get("projection"));
        assertEquals(filter, configuration.definition().get("filter"));
        assertEquals(List.of(sort), configuration.definition().get("sort"));
        assertEquals(page, configuration.definition().get("page"));
    }

    @Test
    void malformedStructuredFilterIsRejected() {
        ActionConfiguration action = action(Map.of(
                "operation", "OBJECT_QUERY",
                "queryMode", "BUILDER",
                "objectTypeId", "PurchaseOrder",
                "filter", List.of("not-an-object")));

        IllegalArgumentException exception =
                assertThrows(IllegalArgumentException.class, () -> OntologyActionConfiguration.from(action));

        assertFalse(exception.getMessage().isBlank());
    }

    private ActionConfiguration action(Map<String, Object> formData) {
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(formData);
        return action;
    }
}
