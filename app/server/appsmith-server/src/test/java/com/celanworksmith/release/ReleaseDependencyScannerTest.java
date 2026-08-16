package com.celanworksmith.release;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionDTO;
import com.appsmith.external.models.Datasource;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.NewAction;
import com.celanworksmith.release.model.ReleaseDatasourcePin;
import com.celanworksmith.release.model.ReleaseDependency;
import org.junit.jupiter.api.Test;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;

class ReleaseDependencyScannerTest {
    @Test
    void scansNativeUqiJsonDefinitionAndNestedObjectProperties() {
        String definition = "{\"objectTypeId\":\"PurchaseOrder\",\"projection\":[\"status\"],"
                + "\"filter\":{\"conditions\":[{\"propertyId\":\"supplierId\"}]},"
                + "\"sort\":[{\"propertyId\":\"createdAt\",\"direction\":\"ASC\"}]}";
        ActionConfiguration configuration = formData(
                "OBJECT_QUERY",
                definition,
                Map.of(
                        "objectTypeId",
                        Map.of("data", "PurchaseOrder"),
                        "projection",
                        Map.of("data", List.of("effectiveStatus"))));
        ReleaseDependencyScanner.ScanResult result = scan(action("action-1", configuration));

        assertThat(result.diagnostics()).isEmpty();
        assertThat(result.dependencies())
                .extracting(ReleaseDependency::kind, ReleaseDependency::referenceId)
                .contains(
                        tuple("OBJECT_TYPE", "PurchaseOrder"),
                        tuple("PROPERTY", "effectiveStatus"),
                        tuple("PROPERTY", "supplierId"),
                        tuple("PROPERTY", "createdAt"));
    }

    @Test
    void scansAllOntologyOperationsAndTheirRelatedReferences() {
        assertThat(scan(action("function", formData("FUNCTION_QUERY", "{\"functionId\":\"f1\"}", Map.of())))
                        .dependencies())
                .extracting(ReleaseDependency::kind, ReleaseDependency::referenceId)
                .contains(tuple("FUNCTION", "f1"));
        assertThat(scan(action(
                                "ontology-action",
                                formData("ACTION_QUERY", "{\"actionId\":\"a1\",\"objectTypeId\":\"Order\"}", Map.of())))
                        .dependencies())
                .extracting(ReleaseDependency::kind, ReleaseDependency::referenceId)
                .contains(tuple("ONTOLOGY_ACTION", "a1"), tuple("OBJECT_TYPE", "Order"));
        assertThat(scan(action(
                                "link",
                                formData(
                                        "LINK_QUERY",
                                        "{\"linkId\":\"orders\",\"sourceTypeId\":\"Supplier\"}",
                                        Map.of())))
                        .dependencies())
                .extracting(ReleaseDependency::kind, ReleaseDependency::referenceId)
                .contains(tuple("LINK", "orders"), tuple("OBJECT_TYPE", "Supplier"));
    }

    @Test
    void skipsOrdinaryDatasourceFormDataWithoutDiagnostics() {
        ActionConfiguration configuration = new ActionConfiguration();
        configuration.setFormData(Map.of("operation", "NOT_ONTOLOGY_FORM_DATA"));
        NewAction action = action("db-action", configuration, "db-1");

        ReleaseDependencyScanner.ScanResult result =
                new ReleaseDependencyScanner().scan(candidate(action), List.of(pin("ontology-1")));

        assertThat(result.diagnostics()).isEmpty();
        assertThat(result.dependencies())
                .extracting(ReleaseDependency::kind, ReleaseDependency::referenceId)
                .containsExactly(tuple("ACTION", "db-action"), tuple("DATASOURCE", "db-1"));
    }

    @Test
    void selectorValuesOverrideDefinitionAndMissingSecondarySelectorsAreDiagnosed() {
        ActionConfiguration actionConfiguration = formData(
                "ACTION_QUERY",
                "{\"actionId\":\"stale-action\",\"objectTypeId\":\"stale-type\"}",
                Map.of(
                        "actionId",
                        Map.of("data", "effective-action"),
                        "objectTypeId",
                        Map.of("data", "effective-type")));
        ReleaseDependencyScanner.ScanResult actionResult = scan(action("action", actionConfiguration));
        assertThat(actionResult.dependencies())
                .extracting(ReleaseDependency::referenceId)
                .contains("effective-action", "effective-type")
                .doesNotContain("stale-action", "stale-type");

        ReleaseDependencyScanner.ScanResult missing =
                scan(action("missing", formData("LINK_QUERY", "{\"linkId\":\"orders\"}", Map.of())));
        assertThat(missing.diagnostics())
                .extracting("code", "path")
                .contains(
                        tuple(
                                "RELEASE_REFERENCE_MALFORMED",
                                "unpublishedActions[0].unpublishedAction.actionConfiguration.formData.definition.sourceTypeId"));
    }

    @Test
    void reportsMalformedJsonAndDoesNotUseDeletedOrMissingNameHeuristics() {
        ReleaseDependencyScanner.ScanResult malformed = scan(action("bad", formData("OBJECT_QUERY", "{bad", Map.of())));
        assertThat(malformed.diagnostics())
                .extracting("code", "path")
                .contains(tuple(
                        "RELEASE_REFERENCE_MALFORMED",
                        "unpublishedActions[0].unpublishedAction.actionConfiguration.formData.definition"));

        ReleaseDependencyScanner.ScanResult valid = scan(action(
                "valid",
                formData(
                        "OBJECT_QUERY",
                        "{\"objectTypeId\":\"Order\",\"projection\":[\"deletedAt\",\"missingReason\"]}",
                        Map.of())));
        assertThat(valid.diagnostics()).isEmpty();
        assertThat(valid.dependencies())
                .extracting(ReleaseDependency::referenceId)
                .contains("deletedAt", "missingReason");
    }

    private static ReleaseDependencyScanner.ScanResult scan(NewAction action) {
        return new ReleaseDependencyScanner().scan(candidate(action), List.of(pin("ontology-1")));
    }

    private static ActionConfiguration formData(String operation, String definition, Map<String, Object> selectors) {
        Map<String, Object> formData = new LinkedHashMap<>();
        formData.put("operation", Map.of("data", operation));
        formData.put("definition", Map.of("data", definition));
        selectors.forEach(formData::put);
        ActionConfiguration configuration = new ActionConfiguration();
        configuration.setFormData(formData);
        return configuration;
    }

    private static NewAction action(String id, ActionConfiguration configuration) {
        return action(id, configuration, "ontology-1");
    }

    private static NewAction action(String id, ActionConfiguration configuration, String datasourceId) {
        Datasource datasource = new Datasource();
        datasource.setId(datasourceId);
        datasource.setPluginId(datasourceId.equals("ontology-1") ? "opaque-plugin-id" : "postgres");
        ActionDTO dto = new ActionDTO();
        dto.setDatasource(datasource);
        dto.setActionConfiguration(configuration);
        NewAction action = new NewAction();
        action.setId(id);
        action.setUnpublishedAction(dto);
        return action;
    }

    private static ApplicationReleaseCandidate candidate(NewAction action) {
        Application app = new Application();
        app.setId("app-1");
        app.setWorkspaceId("workspace-1");
        return new ApplicationReleaseCandidate(app, List.of(action), List.of(), "revision-1");
    }

    private static ReleaseDatasourcePin pin(String id) {
        return new ReleaseDatasourcePin(
                id, "celanworksmithOntology", "ONTOLOGY", "provider-1", "snapshot-1", "sha256:" + "a".repeat(64), "1");
    }
}
