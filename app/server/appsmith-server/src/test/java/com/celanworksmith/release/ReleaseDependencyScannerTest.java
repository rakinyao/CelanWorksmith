package com.celanworksmith.release;

import com.appsmith.external.models.ActionConfiguration;
import com.appsmith.external.models.ActionDTO;
import com.appsmith.external.models.Datasource;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.PluginType;
import com.appsmith.external.models.Property;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.NewAction;
import com.appsmith.server.domains.Plugin;
import com.appsmith.server.plugins.base.PluginService;
import com.appsmith.server.repositories.NewActionRepository;
import com.celanworksmith.ontology.datasource.OntologyDatasourceService;
import com.celanworksmith.ontology.datasource.OntologyMetadataSnapshot;
import com.celanworksmith.ontology.datasource.OntologySnapshotService;
import com.celanworksmith.ontology.datasource.RuntimeProviderCompatibilityValidator;
import com.celanworksmith.ontology.datasource.RuntimeProviderRegistry;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.release.model.ReleaseDatasourcePin;
import com.celanworksmith.release.model.ReleaseDependency;
import com.celanworksmith.runtime.port.RuntimeProvider;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.when;

class ReleaseDependencyScannerTest {
    @Test
    void retainsAllMixedActionsAndOnlyRealStandaloneDatasourceDependencies() {
        MixedResources mixed = new MixedResources();
        var extraction = mixed.extractor.extract(mixed.candidate).block();
        var scan = new ReleaseDependencyScanner().scan(mixed.candidate, extraction.pins());

        assertThat(extraction.diagnostics()).isEmpty();
        assertThat(extraction.pins())
                .extracting(ReleaseDatasourcePin::datasourceId, ReleaseDatasourcePin::kind)
                .containsExactly(tuple("db-1", "NATIVE"), tuple("ontology-1", "ONTOLOGY"));
        assertThat(scan.diagnostics()).isEmpty();
        assertThat(scan.dependencies())
                .filteredOn(d -> "ACTION".equals(d.kind()))
                .extracting(ReleaseDependency::referenceId)
                .containsExactly("db-action", "inline-api-action", "js-action", "ontology-action");
        assertThat(scan.dependencies())
                .filteredOn(d -> "DATASOURCE".equals(d.kind()))
                .extracting(ReleaseDependency::datasourceId)
                .doesNotContainNull()
                .containsExactly("db-1", "ontology-1");
        assertThat(scan.dependencies())
                .filteredOn(d -> "OBJECT_TYPE".equals(d.kind()))
                .extracting(ReleaseDependency::datasourceId, ReleaseDependency::referenceId)
                .containsExactly(tuple("ontology-1", "Order"));
    }

    // Shared candidate keeps scanner, snapshot, validation and coordinator regressions on the same resources.
    static final class MixedResources {
        final NewActionRepository actions = mock(NewActionRepository.class);
        final ApplicationReleaseCandidate candidate;
        final ReleaseDatasourcePinExtractor extractor;
        final OntologyReleaseValidator ontologyValidator;
        final ApplicationReleaseValidationService validation;
        final ApplicationReleaseProviderHealthGate healthGate;

        MixedResources() {
            PluginService plugins = mock(PluginService.class);
            Plugin ontologyPlugin = new Plugin();
            ontologyPlugin.setId("ontology-plugin");
            when(plugins.findByPackageName(OntologyDatasourceService.PLUGIN_PACKAGE_NAME))
                    .thenReturn(Mono.just(ontologyPlugin));
            registerPlugin(plugins, "js-plugin-id", "js-plugin", PluginType.JS);
            registerPlugin(plugins, "rest-plugin-id", "restapi-plugin", PluginType.API);

            NewAction js = action("js-action", new ActionConfiguration(), null);
            js.getUnpublishedAction().getDatasource().setPluginId("js-plugin-id");
            js.setPluginId("js-plugin-id");
            js.setPluginType(PluginType.JS);
            js.getUnpublishedAction().setName("ComputeOrders");
            js.getUnpublishedAction().getActionConfiguration().setTimeoutInMillisecond("4321");
            js.getUnpublishedAction().getActionConfiguration().setBody("return 'private-js-source';");

            NewAction api = action("inline-api-action", new ActionConfiguration(), null);
            api.getUnpublishedAction().getDatasource().setPluginId("rest-plugin-id");
            api.getUnpublishedAction().getDatasource().setDatasourceConfiguration(new DatasourceConfiguration());
            api.getUnpublishedAction()
                    .getDatasource()
                    .getDatasourceConfiguration()
                    .setUrl("https://example.test/items");
            api.setPluginId("rest-plugin-id");
            api.setPluginType(PluginType.API);
            api.getUnpublishedAction().setName("FetchOrders");
            api.getUnpublishedAction()
                    .getActionConfiguration()
                    .setHeaders(List.of(new Property("X-Public", "public-marker")));

            NewAction database = action("db-action", new ActionConfiguration(), "db-1");
            database.getUnpublishedAction().getDatasource().setDatasourceConfiguration(new DatasourceConfiguration());
            NewAction ontology =
                    action("ontology-action", formData("OBJECT_QUERY", "{\"objectTypeId\":\"Order\"}", Map.of()));
            Datasource ontologyDatasource = ontology.getUnpublishedAction().getDatasource();
            ontologyDatasource.setPluginId("ontology-plugin");
            DatasourceConfiguration config = new DatasourceConfiguration();
            config.setProperties(List.of(
                    new Property("projectId", "project-1"),
                    new Property("projectVersion", "1"),
                    new Property("metadataSnapshotId", "snapshot-1"),
                    new Property("metadataDigest", "sha256:" + "a".repeat(64)),
                    new Property("providerContractVersion", "1")));
            ontologyDatasource.setDatasourceConfiguration(config);
            Application application = new Application();
            application.setId("app-1");
            application.setWorkspaceId("workspace-1");
            candidate = new ApplicationReleaseCandidate(
                    application,
                    List.of(js, api, database, ontology),
                    List.of(),
                    List.of(database.getUnpublishedAction().getDatasource(), ontologyDatasource),
                    "revision-1");
            when(actions.findByApplicationId("app-1", AclPermission.READ_ACTIONS))
                    .thenReturn(Flux.fromIterable(candidate.unpublishedActions()));

            OntologyProjectDefinition definition = new OntologyProjectDefinition(
                    "project-1",
                    "1",
                    1,
                    List.of(new ObjectTypeDTO("Order", "Order", List.of())),
                    List.of(),
                    List.of(),
                    List.of());
            OntologyMetadataSnapshot snapshot = new OntologyMetadataSnapshot(
                    "snapshot-1",
                    "project-1",
                    "1",
                    "demo",
                    null,
                    "provider-1",
                    "test",
                    java.time.Instant.EPOCH,
                    "sha256:" + "a".repeat(64),
                    definition);
            OntologySnapshotService snapshots = mock(OntologySnapshotService.class);
            when(snapshots.getRequiredSnapshot("snapshot-1", "sha256:" + "a".repeat(64)))
                    .thenReturn(Mono.just(snapshot));
            RuntimeProvider provider = mock(RuntimeProvider.class);
            when(provider.providerId()).thenReturn("provider-1");
            when(provider.metadataCapabilities(definition))
                    .thenReturn(Mono.just(new RuntimeProvider.RuntimeMetadataCapabilities(Map.of("Order", Map.of()))));
            extractor = new ReleaseDatasourcePinExtractor(actions, plugins, snapshots);
            var compatibility =
                    new RuntimeProviderCompatibilityValidator(new RuntimeProviderRegistry(List.of(provider)));
            ontologyValidator = spy(new OntologyReleaseValidator(snapshots, null, compatibility));
            healthGate = spy(new ApplicationReleaseProviderHealthGate(snapshots, compatibility));
            validation = new ApplicationReleaseValidationService(
                    extractor, new ReleaseDependencyScanner(), ontologyValidator);
        }

        void referenceMissingObject() {
            candidate
                    .unpublishedActions()
                    .get(3)
                    .getUnpublishedAction()
                    .setActionConfiguration(formData("OBJECT_QUERY", "{\"objectTypeId\":\"MissingOrder\"}", Map.of()));
        }

        private static void registerPlugin(PluginService plugins, String id, String packageName, PluginType type) {
            Plugin plugin = new Plugin();
            plugin.setId(id);
            plugin.setPackageName(packageName);
            plugin.setType(type);
            when(plugins.findById(id)).thenReturn(Mono.just(plugin));
        }
    }

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
        assertThat(scan(action(
                                "function",
                                formData(
                                        "FUNCTION_QUERY",
                                        "{\"functionId\":\"f1\"}",
                                        Map.of("objectTypeId", Map.of("data", "Order")))))
                        .dependencies())
                .extracting(ReleaseDependency::kind, ReleaseDependency::referenceId)
                .contains(tuple("FUNCTION", "f1"), tuple("OBJECT_TYPE", "Order"));
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
        datasource.setPluginId("ontology-1".equals(datasourceId) ? "opaque-plugin-id" : "postgres");
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
