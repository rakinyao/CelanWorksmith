package com.celanworksmith.plugins.ontology;

import com.appsmith.external.dtos.ExecuteActionDTO;
import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.Param;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class OntologyCapabilityDefinitionSubstitutorTest {

    @Test
    void substitutesSingleObjectBindingWithBracketNotation() {
        String definition =
                """
                {"target":{"source":"SINGLE_OBJECT","objectId":"{{Table1.selectedRow[\\"id\\"]}}"},"parameters":{}}
                """;

        assertThat(OntologyCapabilityDefinitionSubstitutor.substitute(
                        definition, Map.of("Table1.selectedRow[\"id\"]", "CTR-100")))
                .isEqualTo("{\"target\":{\"source\":\"SINGLE_OBJECT\",\"objectId\":\"CTR-100\"},\"parameters\":{}}");
    }

    @Test
    void substitutesWholeObjectSetBindingAsJsonArrayBeforeDefinitionParsing() {
        String definition =
                """
                {"target":{"source":"OBJECT_SET","objectIds":"{{Table1.selectedRows.map(row => row.id)}}"},"parameters":{}}
                """;

        assertThat(OntologyCapabilityDefinitionSubstitutor.substitute(
                        definition, Map.of("Table1.selectedRows.map(row => row.id)", "[\"CTR-1\",\"CTR-10\"]")))
                .isEqualTo(
                        "{\"target\":{\"source\":\"OBJECT_SET\",\"objectIds\":[\"CTR-1\",\"CTR-10\"]},\"parameters\":{}}");
    }

    @Test
    void preservesArrayShapeWhenPreparingAdvancedCapabilityExecution() {
        ActionConfiguration actionConfiguration = new ActionConfiguration();
        Map<String, Object> formData = new java.util.HashMap<>();
        formData.put("operation", Map.of("data", "FUNCTION_QUERY"));
        formData.put("queryMode", Map.of("data", "ADVANCED"));
        formData.put(
                "definition",
                Map.of(
                        "data",
                        """
                {"target":{"source":"OBJECT_SET","objectIds":"{{Table1.selectedRows.map(row => row.id)}}"},"parameters":{}}
                """));
        actionConfiguration.setFormData(formData);

        ExecuteActionDTO request = new ExecuteActionDTO();
        request.setParams(new ArrayList<>(
                java.util.List.of(new Param("Table1.selectedRows.map(row => row.id)", "[\"CTR-1\",\"CTR-10\"]"))));

        new OntologyPlugin.OntologyPluginExecutor(null)
                .prepareConfigurationsForExecution(request, actionConfiguration, null);

        assertThat(((Map<?, ?>) actionConfiguration.getFormData().get("definition")).get("data"))
                .isEqualTo(
                        "{\"target\":{\"source\":\"OBJECT_SET\",\"objectIds\":[\"CTR-1\",\"CTR-10\"]},\"parameters\":{}}");
    }
}
