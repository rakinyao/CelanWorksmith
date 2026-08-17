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
                "operation",
                "OBJECT_QUERY",
                "queryMode",
                "ADVANCED",
                "objectTypeId",
                "StaleObject",
                "projection",
                List.of("staleProperty"),
                "filter",
                Map.of("stale", true),
                "sort",
                List.of(Map.of("propertyId", "staleProperty", "direction", "ASC")),
                "page",
                Map.of("offset", 99, "limit", 1),
                "definition",
                "{\"objectTypeId\":\"PurchaseOrder\",\"projection\":[\"id\"]}"));

        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action);

        assertEquals(Map.of("objectTypeId", "PurchaseOrder", "projection", List.of("id")), configuration.definition());
    }

    @Test
    void builderDefinitionIgnoresRetainedAdvancedDefinition() {
        ActionConfiguration action = action(Map.of(
                "operation",
                "OBJECT_QUERY",
                "queryMode",
                "BUILDER",
                "objectTypeId",
                "PurchaseOrder",
                "projection",
                List.of("id"),
                "definition",
                Map.of(
                        "objectTypeId",
                        "StaleObject",
                        "projection",
                        List.of("staleProperty"),
                        "filter",
                        Map.of(
                                "conditions",
                                List.of(Map.of("propertyId", "staleProperty", "operator", "eq", "value", "stale"))),
                        "page",
                        Map.of("offset", 99, "limit", 1))));

        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action);

        assertEquals(Map.of("objectTypeId", "PurchaseOrder", "projection", List.of("id")), configuration.definition());
    }

    @Test
    void advancedDefinitionDoesNotRequireBuilderObjectType() {
        OntologyActionConfiguration configuration = configuration(
                "OBJECT_QUERY",
                Map.of(
                        "queryMode",
                        "ADVANCED",
                        "definition",
                        "{\"objectTypeId\":\"PurchaseOrder\",\"projection\":[\"id\"]}"));

        assertEquals(Map.of("objectTypeId", "PurchaseOrder", "projection", List.of("id")), configuration.definition());
    }

    @Test
    void builderDefinitionRequiresObjectType() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class, () -> configuration("OBJECT_QUERY", Map.of("queryMode", "BUILDER")));

        assertEquals("Ontology operation definition requires: objectTypeId", exception.getMessage());
    }

    @Test
    void advancedDefinitionRequiresRawDefinition() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class, () -> configuration("OBJECT_QUERY", Map.of("queryMode", "ADVANCED")));

        assertEquals("Ontology operation definition is required", exception.getMessage());
    }

    @Test
    void functionQueryKeepsLegacySelectorBehaviorWhenQueryModeIsPresent() {
        OntologyActionConfiguration configuration = configuration(
                "FUNCTION_QUERY",
                Map.of(
                        "queryMode", "BUILDER",
                        "functionId", "selectedFunction",
                        "filter", Map.of("stale", true),
                        "sort", List.of(Map.of("stale", true)),
                        "page", Map.of("offset", 99),
                        "definition", Map.of("functionId", "definitionFunction")));

        assertEquals("selectedFunction", configuration.definition().get("functionId"));
        assertFalse(configuration.definition().containsKey("filter"));
        assertFalse(configuration.definition().containsKey("sort"));
        assertFalse(configuration.definition().containsKey("page"));
    }

    @Test
    void actionQueryKeepsLegacySelectorBehaviorWhenQueryModeIsPresent() {
        OntologyActionConfiguration configuration = configuration(
                "ACTION_QUERY",
                Map.of(
                        "queryMode",
                        "ADVANCED",
                        "actionId",
                        "selectedAction",
                        "projection",
                        List.of("staleProperty"),
                        "definition",
                        Map.of("actionId", "definitionAction")));

        assertEquals("selectedAction", configuration.definition().get("actionId"));
        assertEquals(List.of("staleProperty"), configuration.definition().get("projection"));
    }

    @Test
    void linkQueryKeepsLegacySelectorBehaviorWhenQueryModeIsPresent() {
        OntologyActionConfiguration configuration = configuration(
                "LINK_QUERY",
                Map.of(
                        "queryMode", "BUILDER",
                        "linkId", "selectedLink",
                        "sourceTypeId", "PurchaseOrder",
                        "sourceId", "po-1",
                        "definition", Map.of("linkId", "definitionLink")));

        assertEquals("selectedLink", configuration.definition().get("linkId"));
        assertEquals("PurchaseOrder", configuration.definition().get("sourceTypeId"));
        assertEquals("po-1", configuration.definition().get("sourceId"));
    }

    @Test
    void advancedDefinitionCannotOverrideProtectedContext() {
        ActionConfiguration action = action(Map.of(
                "operation", "OBJECT_QUERY",
                "queryMode", "ADVANCED",
                "definition", Map.of("objectTypeId", "PurchaseOrder", "projectId", "forged")));

        assertThrows(IllegalArgumentException.class, () -> OntologyActionConfiguration.from(action));
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

    @Test
    void malformedStructuredProjectionIsRejected() {
        assertThrows(
                IllegalArgumentException.class,
                () -> OntologyActionConfiguration.from(action(Map.of(
                        "operation", "OBJECT_QUERY",
                        "queryMode", "BUILDER",
                        "objectTypeId", "PurchaseOrder",
                        "projection", "id"))));
    }

    @Test
    void malformedStructuredSortIsRejected() {
        assertThrows(
                IllegalArgumentException.class,
                () -> OntologyActionConfiguration.from(action(Map.of(
                        "operation", "OBJECT_QUERY",
                        "queryMode", "BUILDER",
                        "objectTypeId", "PurchaseOrder",
                        "sort", Map.of("propertyId", "delayDays")))));
    }

    @Test
    void malformedStructuredPageIsRejected() {
        assertThrows(
                IllegalArgumentException.class,
                () -> OntologyActionConfiguration.from(action(Map.of(
                        "operation", "OBJECT_QUERY",
                        "queryMode", "BUILDER",
                        "objectTypeId", "PurchaseOrder",
                        "page", List.of(10, 20)))));
    }

    private OntologyActionConfiguration configuration(String operation, Map<String, Object> formData) {
        Map<String, Object> values = new java.util.LinkedHashMap<>();
        values.put("operation", operation);
        values.putAll(formData);
        return OntologyActionConfiguration.from(action(values));
    }

    private ActionConfiguration action(Map<String, Object> formData) {
        ActionConfiguration action = new ActionConfiguration();
        action.setFormData(formData);
        return action;
    }
}
