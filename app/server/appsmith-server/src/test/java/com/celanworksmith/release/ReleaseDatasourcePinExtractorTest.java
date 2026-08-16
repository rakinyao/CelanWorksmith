package com.celanworksmith.release;

import com.appsmith.external.models.Datasource;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.DatasourceStorageDTO;
import com.appsmith.external.models.Property;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.NewAction;
import com.appsmith.server.domains.Plugin;
import com.appsmith.server.plugins.base.PluginService;
import com.appsmith.server.repositories.NewActionRepository;
import com.celanworksmith.ontology.datasource.OntologyDatasourceService;
import com.celanworksmith.release.model.ReleaseDatasourcePin;
import com.celanworksmith.release.model.ReleaseDatasourcePinExtractionResult;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import reactor.core.publisher.Flux;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.eq;

class ReleaseDatasourcePinExtractorTest {
    @Test
    void extractsSortedMixedNativeAndOntologyPinsWithoutCredentials() {
        NewActionRepository repository = Mockito.mock(NewActionRepository.class);
        PluginService pluginService = ontologyPluginService("opaque-plugin-id");
        Datasource database = datasource("db-1", "postgres", List.of());
        Datasource api = datasource("api-1", "restApi", List.of());
        Datasource ontology = datasource("ontology-1", "opaque-plugin-id", ontologyProperties("2026-01"));
        Mockito.when(repository.findByApplicationId(eq("app-1"), eq(AclPermission.READ_ACTIONS)))
                .thenReturn(
                        Flux.just(action("action-3", ontology), action("action-1", database), action("action-2", api)));

        ReleaseDatasourcePinExtractionResult result = new ReleaseDatasourcePinExtractor(repository, pluginService)
                .extract(candidate())
                .block();

        assertThat(result.diagnostics()).isEmpty();
        assertThat(result.pins())
                .extracting(ReleaseDatasourcePin::datasourceId)
                .containsExactly("api-1", "db-1", "ontology-1");
        assertThat(result.pins().get(2))
                .isEqualTo(new ReleaseDatasourcePin(
                        "ontology-1",
                        "opaque-plugin-id",
                        "ONTOLOGY",
                        "provider-1",
                        "snapshot-7",
                        "sha256:" + "a".repeat(64),
                        "2026-01",
                        "project-1",
                        "2.4.0"));
    }

    @Test
    void reportsMalformedDatasourceConfigurationWithoutThrowing() {
        NewActionRepository repository = Mockito.mock(NewActionRepository.class);
        PluginService pluginService = ontologyPluginService("opaque-plugin-id");
        Datasource ontology =
                datasource("ontology-1", "opaque-plugin-id", List.of(new Property("projectId", "project-1")));
        Mockito.when(repository.findByApplicationId("app-1", AclPermission.READ_ACTIONS))
                .thenReturn(Flux.just(action("action-1", ontology)));

        ReleaseDatasourcePinExtractionResult result = new ReleaseDatasourcePinExtractor(repository, pluginService)
                .extract(candidate(action("action-1", ontology)))
                .block();

        assertThat(result.pins()).isEmpty();
        assertThat(result.diagnostics())
                .extracting("code", "path")
                .contains(
                        tuple(
                                "RELEASE_DATASOURCE_CONFIGURATION_MALFORMED",
                                "unpublishedActions[actionId=action-1].unpublishedAction.datasource.datasourceConfiguration.properties.projectVersion"));
    }

    @Test
    void resolvesCompactActionDatasourceReferenceToStorageBackedOntologyDatasource() {
        NewActionRepository repository = Mockito.mock(NewActionRepository.class);
        PluginService pluginService = ontologyPluginService("opaque-plugin-id");
        Datasource compactReference = datasource("ontology-1", "opaque-plugin-id", List.of());
        compactReference.setDatasourceConfiguration(null);
        Datasource storedDatasource = datasource("ontology-1", "opaque-plugin-id", List.of());
        storedDatasource.setDatasourceStorages(
                Map.of("", new DatasourceStorageDTO(null, "", configuration(ontologyProperties("2026-01")))));
        Mockito.when(repository.findByApplicationId("app-1", AclPermission.READ_ACTIONS))
                .thenReturn(Flux.just(action("action-1", compactReference)));

        ReleaseDatasourcePinExtractionResult result = new ReleaseDatasourcePinExtractor(repository, pluginService)
                .extract(candidate(List.of(storedDatasource), action("action-1", compactReference)))
                .block();

        assertThat(result.diagnostics()).isEmpty();
        assertThat(result.pins())
                .containsExactly(new ReleaseDatasourcePin(
                        "ontology-1",
                        "opaque-plugin-id",
                        "ONTOLOGY",
                        "provider-1",
                        "snapshot-7",
                        "sha256:" + "a".repeat(64),
                        "2026-01",
                        "project-1",
                        "2.4.0"));
    }

    @Test
    void selectsFirstValidStorageByEnvironmentKeyWhenDefaultStorageIsMissing() {
        NewActionRepository repository = Mockito.mock(NewActionRepository.class);
        PluginService pluginService = ontologyPluginService("opaque-plugin-id");
        Datasource compactReference = datasource("ontology-1", "opaque-plugin-id", List.of());
        compactReference.setDatasourceConfiguration(null);
        Datasource storedDatasource = datasource("ontology-1", "opaque-plugin-id", List.of());
        Map<String, DatasourceStorageDTO> storages = new LinkedHashMap<>();
        storages.put("z-env", new DatasourceStorageDTO(null, "z-env", configuration(ontologyProperties("z-version"))));
        storages.put("empty-env", new DatasourceStorageDTO(null, "empty-env", null));
        storages.put("a-env", new DatasourceStorageDTO(null, "a-env", configuration(ontologyProperties("a-version"))));
        storedDatasource.setDatasourceStorages(storages);
        Mockito.when(repository.findByApplicationId("app-1", AclPermission.READ_ACTIONS))
                .thenReturn(Flux.just(action("action-1", compactReference)));

        ReleaseDatasourcePinExtractionResult result = new ReleaseDatasourcePinExtractor(repository, pluginService)
                .extract(candidate(List.of(storedDatasource), action("action-1", compactReference)))
                .block();

        assertThat(result.diagnostics()).isEmpty();
        assertThat(result.pins())
                .containsExactly(new ReleaseDatasourcePin(
                        "ontology-1",
                        "opaque-plugin-id",
                        "ONTOLOGY",
                        "provider-1",
                        "snapshot-7",
                        "sha256:" + "a".repeat(64),
                        "a-version",
                        "project-1",
                        "2.4.0"));
    }

    @Test
    void reportsMissingCandidateDatasourceForCompactActionReference() {
        NewActionRepository repository = Mockito.mock(NewActionRepository.class);
        PluginService pluginService = ontologyPluginService("opaque-plugin-id");
        Datasource compactReference = datasource("missing-datasource", "opaque-plugin-id", List.of());
        compactReference.setDatasourceConfiguration(null);
        Mockito.when(repository.findByApplicationId("app-1", AclPermission.READ_ACTIONS))
                .thenReturn(Flux.just(action("action-1", compactReference)));

        ReleaseDatasourcePinExtractionResult result = new ReleaseDatasourcePinExtractor(repository, pluginService)
                .extract(candidate(action("action-1", compactReference)))
                .block();

        assertThat(result.pins()).isEmpty();
        assertThat(result.diagnostics())
                .extracting("code", "path")
                .containsExactly(tuple(
                        "RELEASE_DATASOURCE_REFERENCE_NOT_FOUND",
                        "unpublishedActions[actionId=action-1].unpublishedAction.datasource.id"));
    }

    @Test
    void reportsConflictingDuplicateDatasourceAfterStableActionOrdering() {
        NewActionRepository repository = Mockito.mock(NewActionRepository.class);
        PluginService pluginService = ontologyPluginService("opaque-plugin-id");
        Datasource first = datasource("ontology-1", "opaque-plugin-id", ontologyProperties("1"));
        Datasource second = datasource("ontology-1", "opaque-plugin-id", ontologyProperties("2"));
        Mockito.when(repository.findByApplicationId("app-1", AclPermission.READ_ACTIONS))
                .thenReturn(Flux.just(action("z-action", second), action("a-action", first)));

        ReleaseDatasourcePinExtractionResult result = new ReleaseDatasourcePinExtractor(repository, pluginService)
                .extract(candidate(action("z-action", second), action("a-action", first)))
                .block();

        assertThat(result.pins()).isEmpty();
        assertThat(result.diagnostics()).extracting("code").containsExactly("RELEASE_DATASOURCE_CONFLICT");
        assertThat(result.diagnostics().get(0).path())
                .isEqualTo("unpublishedActions[actionId=z-action].unpublishedAction.datasource");

        Mockito.when(repository.findByApplicationId("app-1", AclPermission.READ_ACTIONS))
                .thenReturn(Flux.just(action("a-action", first), action("z-action", second)));
        ReleaseDatasourcePinExtractionResult reversed = new ReleaseDatasourcePinExtractor(repository, pluginService)
                .extract(candidate(action("a-action", first), action("z-action", second)))
                .block();
        assertThat(reversed.diagnostics().get(0).path())
                .isEqualTo(result.diagnostics().get(0).path());
    }

    private static ApplicationReleaseCandidate candidate(NewAction... actions) {
        return candidate(List.of(), actions);
    }

    private static ApplicationReleaseCandidate candidate(List<Datasource> usedDatasources, NewAction... actions) {
        Application application = new Application();
        application.setId("app-1");
        application.setWorkspaceId("workspace-1");
        return new ApplicationReleaseCandidate(application, List.of(actions), List.of(), usedDatasources, "revision-1");
    }

    private static Datasource datasource(String id, String pluginId, List<Property> properties) {
        Datasource datasource = new Datasource();
        datasource.setId(id);
        datasource.setPluginId(pluginId);
        DatasourceConfiguration configuration = new DatasourceConfiguration();
        configuration.setProperties(properties);
        datasource.setDatasourceConfiguration(configuration);
        return datasource;
    }

    private static List<Property> ontologyProperties(String contractVersion) {
        return List.of(
                new Property("projectId", "project-1"),
                new Property("projectVersion", "2.4.0"),
                new Property("metadataSnapshotId", "snapshot-7"),
                new Property("metadataDigest", "sha256:" + "a".repeat(64)),
                new Property("runtimeProviderId", "provider-1"),
                new Property("providerContractVersion", contractVersion),
                new Property("password", "must-not-be-copied"));
    }

    private static DatasourceConfiguration configuration(List<Property> properties) {
        DatasourceConfiguration configuration = new DatasourceConfiguration();
        configuration.setProperties(properties);
        return configuration;
    }

    private static NewAction action(String id, Datasource datasource) {
        NewAction action = new NewAction();
        action.setId(id);
        var dto = new com.appsmith.external.models.ActionDTO();
        dto.setDatasource(datasource);
        action.setUnpublishedAction(dto);
        return action;
    }

    private static PluginService ontologyPluginService(String pluginId) {
        PluginService pluginService = Mockito.mock(PluginService.class);
        Plugin plugin = new Plugin();
        plugin.setId(pluginId);
        plugin.setPackageName(OntologyDatasourceService.PLUGIN_PACKAGE_NAME);
        Mockito.when(pluginService.findByPackageName(OntologyDatasourceService.PLUGIN_PACKAGE_NAME))
                .thenReturn(reactor.core.publisher.Mono.just(plugin));
        return pluginService;
    }
}
