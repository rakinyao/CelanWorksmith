package com.celanworksmith.plugins.ontology;

import com.appsmith.external.models.ActionConfiguration;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

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
    void ignoresNullOptionalFieldsRetainedByNativeQueryEditor() {
        Map<String, Object> formData = new java.util.LinkedHashMap<>();
        formData.put("operation", "OBJECT_QUERY");
        formData.put("queryMode", "BUILDER");
        formData.put("objectTypeId", "PurchaseOrder");
        formData.put("projection", null);
        formData.put("filter", null);
        formData.put("sort", null);
        formData.put("page", null);

        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action(formData));

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
    void uqiWrappedBuilderFieldsProduceTheSameDefinitionAsAdvancedJson() {
        Map<String, Object> filter =
                Map.of("conditions", List.of(Map.of("propertyId", "delayDays", "operator", "gt", "value", 4)));
        Map<String, Object> sort = Map.of("propertyId", "delayDays", "direction", "DESC");
        Map<String, Object> page = Map.of("offset", 20, "limit", 10);
        Map<String, Object> builder = new java.util.LinkedHashMap<>();
        builder.put("operation", uqi("OBJECT_QUERY"));
        builder.put("queryMode", uqi("BUILDER"));
        builder.put("objectTypeId", uqi("PurchaseOrder"));
        builder.put("projection", uqi(List.of("id", "delayDays")));
        builder.put("filter", uqi(filter));
        builder.put("sort", uqi(List.of(sort)));
        builder.put("page", uqi(page));

        OntologyActionConfiguration builderConfiguration = OntologyActionConfiguration.from(action(builder));
        OntologyActionConfiguration advancedConfiguration = configuration(
                "OBJECT_QUERY",
                Map.of(
                        "queryMode",
                        "ADVANCED",
                        "definition",
                        "{\"objectTypeId\":\"PurchaseOrder\",\"projection\":[\"id\",\"delayDays\"],"
                                + "\"filter\":{\"conditions\":[{\"propertyId\":\"delayDays\","
                                + "\"operator\":\"gt\",\"value\":4}]},\"sort\":[{\"propertyId\":"
                                + "\"delayDays\",\"direction\":\"DESC\"}],\"page\":{\"offset\":20,"
                                + "\"limit\":10}}"));

        assertEquals(advancedConfiguration.definition(), builderConfiguration.definition());
    }

    @Test
    void advancedDefinitionPreservesDynamicPageBindings() {
        OntologyActionConfiguration configuration = configuration(
                "OBJECT_QUERY",
                Map.of(
                        "queryMode",
                        "ADVANCED",
                        "definition",
                        "{\"objectTypeId\":\"PurchaseOrder\",\"page\":{"
                                + "\"offset\":\"{{Table1.pageNo}}\",\"limit\":\"{{Table1.pageSize}}\"}}"));

        assertEquals(
                Map.of(
                        "objectTypeId",
                        "PurchaseOrder",
                        "page",
                        Map.of("offset", "{{Table1.pageNo}}", "limit", "{{Table1.pageSize}}")),
                configuration.definition());
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
    void builderFunctionQueryComposesSelectedCapabilityOwnerAndTarget() {
        OntologyActionConfiguration configuration = configuration(
                "FUNCTION_QUERY",
                Map.of(
                        "queryMode",
                        "BUILDER",
                        "objectTypeId",
                        "PurchaseOrder",
                        "functionId",
                        "selectedFunction",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                        "parameters",
                        Map.of("delayDays", 5),
                        "definition",
                        Map.of("functionId", "definitionFunction")));

        assertEquals(
                Map.of(
                        "functionId",
                        "selectedFunction",
                        "objectTypeId",
                        "PurchaseOrder",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                        "parameters",
                        Map.of("delayDays", 5)),
                configuration.definition());
    }

    @Test
    void builderFunctionQueryMergesFunctionParametersIntoCanonicalDefinition() {
        Map<String, Object> formData = Map.of(
                "operation",
                "FUNCTION_QUERY",
                "queryMode",
                "BUILDER",
                "objectTypeId",
                "PurchaseOrder",
                "functionId",
                "delayScore",
                "target",
                Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                "parameters",
                Map.of("delayDays", "{{Table1.selectedRow.delayDays}}"));

        assertEquals(
                Map.of(
                        "functionId",
                        "delayScore",
                        "objectTypeId",
                        "PurchaseOrder",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                        "parameters",
                        Map.of("delayDays", "{{Table1.selectedRow.delayDays}}")),
                OntologyActionConfiguration.from(action(formData)).definition());
    }

    @Test
    void builderFunctionQueryParsesDynamicJsonParametersIntoTheCanonicalDefinition() {
        assertEquals(
                Map.of(
                        "functionId",
                        "delayScore",
                        "objectTypeId",
                        "PurchaseOrder",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                        "parameters",
                        Map.of("delayDays", 5)),
                OntologyActionConfiguration.from(action(Map.of(
                                "operation", uqi("FUNCTION_QUERY"),
                                "queryMode", uqi("BUILDER"),
                                "objectTypeId", uqi("PurchaseOrder"),
                                "functionId", uqi("delayScore"),
                                "target", uqi(Map.of("source", "SINGLE_OBJECT", "objectId", "PO002")),
                                "parameters", uqi("{\"delayDays\":5}"))))
                        .definition());
    }

    @Test
    void builderFunctionQueryRejectsDynamicJsonThatIsNotAnObject() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> OntologyActionConfiguration.from(action(Map.of(
                        "operation", uqi("FUNCTION_QUERY"),
                        "queryMode", uqi("BUILDER"),
                        "objectTypeId", uqi("PurchaseOrder"),
                        "functionId", uqi("delayScore"),
                        "target", uqi(Map.of("source", "SINGLE_OBJECT", "objectId", "PO002")),
                        "parameters", uqi("[]")))));

        assertEquals("Ontology capability parameters selector must be an object", exception.getMessage());
    }

    @Test
    void builderFunctionQueryUsesEmptyParametersWhenAbsent() {
        assertEquals(
                Map.of(
                        "functionId",
                        "delayScore",
                        "objectTypeId",
                        "PurchaseOrder",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                        "parameters",
                        Map.of()),
                OntologyActionConfiguration.from(action(Map.of(
                                "operation", "FUNCTION_QUERY",
                                "queryMode", "BUILDER",
                                "objectTypeId", "PurchaseOrder",
                                "functionId", "delayScore",
                                "target", Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"))))
                        .definition());
    }

    @Test
    void builderFunctionQueryRejectsNonMapParameters() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> OntologyActionConfiguration.from(action(Map.of(
                        "operation", "FUNCTION_QUERY",
                        "queryMode", "BUILDER",
                        "objectTypeId", "PurchaseOrder",
                        "functionId", "delayScore",
                        "target", Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                        "parameters", List.of("not-an-object")))));

        assertEquals("Ontology capability parameters selector must be an object", exception.getMessage());
    }

    @Test
    void advancedFunctionQueryComposesSelectedFunctionWithDefinitionTargetAndParameters() {
        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action(Map.of(
                "operation", "FUNCTION_QUERY",
                "queryMode", "ADVANCED",
                "objectTypeId", "PurchaseOrder",
                "functionId", "delayScore",
                "definition",
                        "{\"target\":{\"source\":\"SINGLE_OBJECT\",\"objectId\":\"PO002\"},"
                                + "\"parameters\":{\"delayDays\":5}}")));

        assertEquals(
                Map.of(
                        "functionId",
                        "delayScore",
                        "objectTypeId",
                        "PurchaseOrder",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                        "parameters",
                        Map.of("delayDays", 5)),
                configuration.definition());
    }

    @Test
    void preservesNullAdvancedFunctionParametersForNativeSemanticValidation() {
        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action(Map.of(
                "operation", uqi("FUNCTION_QUERY"),
                "queryMode", uqi("ADVANCED"),
                "objectTypeId", uqi("PurchaseOrder"),
                "functionId", uqi("delayScore"),
                "definition",
                        uqi("{\"target\":{\"source\":\"SINGLE_OBJECT\",\"objectId\":\"PO002\"},"
                                + "\"parameters\":{\"delayDays\":null}}"))));

        Map<?, ?> parameters = (Map<?, ?>) configuration.definition().get("parameters");
        assertTrue(parameters.containsKey("delayDays"));
        assertEquals(null, parameters.get("delayDays"));
    }

    @Test
    void advancedFunctionQueryTreatsFunctionIdInParametersAsAParameter() {
        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action(Map.of(
                "operation", "FUNCTION_QUERY",
                "queryMode", "ADVANCED",
                "objectTypeId", "PurchaseOrder",
                "functionId", "delayScore",
                "definition",
                        "{\"target\":{\"source\":\"SINGLE_OBJECT\",\"objectId\":\"PO002\"},"
                                + "\"parameters\":{\"functionId\":\"nested\"}}")));

        assertEquals(
                Map.of(
                        "functionId",
                        "delayScore",
                        "objectTypeId",
                        "PurchaseOrder",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                        "parameters",
                        Map.of("functionId", "nested")),
                configuration.definition());
    }

    @Test
    void advancedFunctionQueryRejectsMalformedOrNonObjectParameters() {
        IllegalArgumentException malformed = assertThrows(
                IllegalArgumentException.class,
                () -> OntologyActionConfiguration.from(action(Map.of(
                        "operation", "FUNCTION_QUERY",
                        "queryMode", "ADVANCED",
                        "objectTypeId", "PurchaseOrder",
                        "functionId", "delayScore",
                        "definition", "not-json"))));
        IllegalArgumentException array = assertThrows(
                IllegalArgumentException.class,
                () -> OntologyActionConfiguration.from(action(Map.of(
                        "operation", "FUNCTION_QUERY",
                        "queryMode", "ADVANCED",
                        "objectTypeId", "PurchaseOrder",
                        "functionId", "delayScore",
                        "definition", "[]"))));

        assertEquals("Ontology operation definition must be a JSON object", malformed.getMessage());
        assertEquals("Ontology operation definition must be a JSON object", array.getMessage());
    }

    @Test
    void functionQueryRequiresASelectedFunctionId() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> OntologyActionConfiguration.from(action(Map.of(
                        "operation", "FUNCTION_QUERY",
                        "queryMode", "ADVANCED",
                        "objectTypeId", "PurchaseOrder",
                        "definition",
                                "{\"target\":{\"source\":\"SINGLE_OBJECT\",\"objectId\":\"PO002\"},"
                                        + "\"parameters\":{}}"))));

        assertEquals("Ontology operation definition requires: functionId", exception.getMessage());
    }

    @Test
    void functionQueryLeavesUnknownFunctionAndParameterIdsForNativeValidation() {
        OntologyActionConfiguration configuration = OntologyActionConfiguration.from(action(Map.of(
                "operation", "FUNCTION_QUERY",
                "queryMode", "ADVANCED",
                "objectTypeId", "PurchaseOrder",
                "functionId", "unknownFunction",
                "definition",
                        "{\"target\":{\"source\":\"SINGLE_OBJECT\",\"objectId\":\"PO002\"},"
                                + "\"parameters\":{\"poId\":\"missing\"}}")));

        assertEquals(
                Map.of(
                        "functionId",
                        "unknownFunction",
                        "objectTypeId",
                        "PurchaseOrder",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                        "parameters",
                        Map.of("poId", "missing")),
                configuration.definition());
    }

    @Test
    void builderActionQueryComposesSelectedOwnerCapabilityAndTarget() {
        OntologyActionConfiguration configuration = configuration(
                "ACTION_QUERY",
                Map.of(
                        "queryMode",
                        "BUILDER",
                        "objectTypeId",
                        "PurchaseOrder",
                        "actionId",
                        "selectedAction",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                        "parameters",
                        Map.of("newScheduleDate", "2026-08-27"),
                        "definition",
                        Map.of("actionId", "definitionAction")));

        assertEquals(
                Map.of(
                        "actionId",
                        "selectedAction",
                        "objectTypeId",
                        "PurchaseOrder",
                        "target",
                        Map.of("source", "SINGLE_OBJECT", "objectId", "PO002"),
                        "parameters",
                        Map.of("newScheduleDate", "2026-08-27")),
                configuration.definition());
    }

    @Test
    void advancedCapabilityDefinitionRejectsProtectedSelectorsAndAtomicity() {
        for (String protectedField : List.of("functionId", "actionId", "objectTypeId", "atomic")) {
            IllegalArgumentException exception = assertThrows(
                    IllegalArgumentException.class,
                    () -> configuration(
                            "FUNCTION_QUERY",
                            Map.of(
                                    "queryMode", "ADVANCED",
                                    "objectTypeId", "PurchaseOrder",
                                    "functionId", "delayScore",
                                    "definition",
                                            "{\"target\":{\"source\":\"SINGLE_OBJECT\",\"objectId\":\"PO002\"},"
                                                    + "\"parameters\":{},\"" + protectedField + "\":\"forged\"}")));

            assertTrue(exception.getMessage().contains(protectedField));
        }
    }

    @Test
    void capabilityQueryRequiresTargetDefinition() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> configuration(
                        "FUNCTION_QUERY",
                        Map.of("queryMode", "BUILDER", "objectTypeId", "PurchaseOrder", "functionId", "delayScore")));

        assertEquals("Ontology capability query definition requires: target", exception.getMessage());
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
    void structuredTotalResultModeIsCopiedForGeneratedCountQueries() {
        OntologyActionConfiguration configuration = configuration(
                "OBJECT_QUERY",
                Map.of(
                        "queryMode", "BUILDER",
                        "objectTypeId", "PurchaseOrder",
                        "resultMode", "TOTAL"));

        assertEquals("TOTAL", configuration.definition().get("resultMode"));
    }

    @Test
    void rejectsUnsupportedObjectQueryResultMode() {
        IllegalArgumentException exception = assertThrows(
                IllegalArgumentException.class,
                () -> configuration(
                        "OBJECT_QUERY",
                        Map.of(
                                "queryMode", "BUILDER",
                                "objectTypeId", "PurchaseOrder",
                                "resultMode", "UNKNOWN")));

        assertEquals("Ontology object query result mode must be ROWS or TOTAL", exception.getMessage());
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

    private Map<String, Object> uqi(Object value) {
        return Map.of("data", value);
    }
}
