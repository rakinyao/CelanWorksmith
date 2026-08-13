package com.celanworksmith.ontology.datasource;

import com.appsmith.external.models.Datasource;
import com.appsmith.external.models.DatasourceConfiguration;
import com.appsmith.external.models.DatasourceStorageDTO;
import com.appsmith.external.models.Property;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.datasources.base.DatasourceService;
import com.appsmith.server.services.WorkspaceService;
import com.celanworksmith.ontology.datasource.dto.ImportOntologyDatasourceRequest;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OntologyDatasourceServiceTest {
    @Test
    void importsAdminSourceIntoOnePinnedWorkspaceDatasource() {
        WorkspaceService workspaceService = mock(WorkspaceService.class);
        DatasourceService datasourceService = mock(DatasourceService.class);
        OntologyProjectImportSource importer = mock(OntologyProjectImportSource.class);
        RuntimeProviderCompatibilityValidator validator = mock(RuntimeProviderCompatibilityValidator.class);
        AtomicReference<Datasource> created = new AtomicReference<>();
        when(workspaceService.findById("workspace-1", AclPermission.WORKSPACE_MANAGE_DATASOURCES))
                .thenReturn(Mono.just(mock(com.appsmith.server.domains.Workspace.class)));
        when(importer.sourceKind()).thenReturn(OntologyProjectImportSource.Kind.LOCAL_YAML);
        when(importer.importProject(any())).thenReturn(Mono.just(snapshot("local-yaml")));
        when(validator.validate(any(), eq("demo-mongo-readonly")))
                .thenReturn(Mono.just(new ProviderValidationResult(true, List.of())));
        when(datasourceService.create(any())).thenAnswer(invocation -> {
            Datasource datasource = invocation.getArgument(0);
            datasource.setId("datasource-1");
            created.set(datasource);
            return Mono.just(datasource);
        });
        when(datasourceService.updateDatasourceStorage(any(), eq(""), eq(true))).thenAnswer(invocation -> {
            DatasourceStorageDTO storage = invocation.getArgument(0);
            created.get().setDatasourceStorages(Map.of("", storage));
            return Mono.just(created.get());
        });
        OntologyDatasourceService service =
                new OntologyDatasourceService(workspaceService, datasourceService, List.of(importer), validator);

        StepVerifier.create(service.importDatasource(request("workspace-1")))
                .assertNext(summary -> {
                    assertThat(summary.datasourceId()).isEqualTo("datasource-1");
                    assertThat(summary.projectId()).isEqualTo("supply-chain");
                    assertThat(summary.projectVersion()).isEqualTo("1.0.0");
                    assertThat(summary.source()).isEqualTo("local-yaml");
                    assertThat(summary.provider()).isEqualTo("demo-mongo-readonly");
                    assertThat(summary.digest()).isEqualTo("sha256:" + "a".repeat(64));
                    assertThat(summary.status()).isEqualTo("ACTIVE");
                })
                .verifyComplete();

        assertThat(created.get().getPluginId()).isEqualTo("celanworksmith-ontology-plugin");
        assertThat(created.get().getWorkspaceId()).isEqualTo("workspace-1");
        assertThat(created.get().getDatasourceStorages()).hasSize(1);
        DatasourceStorageDTO storage =
                created.get().getDatasourceStorages().values().iterator().next();
        assertThat(properties(storage.getDatasourceConfiguration()))
                .containsExactly(
                        Map.entry("projectId", "supply-chain"),
                        Map.entry("projectVersion", "1.0.0"),
                        Map.entry("metadataSnapshotId", "snapshot-1"),
                        Map.entry("metadataDigest", "sha256:" + "a".repeat(64)),
                        Map.entry("runtimeProviderId", "demo-mongo-readonly"),
                        Map.entry("workspaceId", "workspace-1"),
                        Map.entry("datasourceId", "datasource-1"),
                        Map.entry("projectName", "Supply Chain"),
                        Map.entry("sourceKind", "local-yaml"));
    }

    @Test
    void rejectsNonAdminBeforeImportingOntologyMetadata() {
        WorkspaceService workspaceService = mock(WorkspaceService.class);
        DatasourceService datasourceService = mock(DatasourceService.class);
        OntologyProjectImportSource importer = mock(OntologyProjectImportSource.class);
        RuntimeProviderCompatibilityValidator validator = mock(RuntimeProviderCompatibilityValidator.class);
        when(workspaceService.findById("workspace-1", AclPermission.WORKSPACE_MANAGE_DATASOURCES))
                .thenReturn(Mono.empty());
        when(importer.sourceKind()).thenReturn(OntologyProjectImportSource.Kind.LOCAL_YAML);
        OntologyDatasourceService service =
                new OntologyDatasourceService(workspaceService, datasourceService, List.of(importer), validator);

        StepVerifier.create(service.importDatasource(request("workspace-1")))
                .expectError(IllegalArgumentException.class)
                .verify();

        verify(importer, never()).importProject(any());
        verify(datasourceService, never()).create(any());
    }

    @Test
    void doesNotCreateDatasourceWhenProviderRejectsPinnedSnapshot() {
        WorkspaceService workspaceService = mock(WorkspaceService.class);
        DatasourceService datasourceService = mock(DatasourceService.class);
        OntologyProjectImportSource importer = mock(OntologyProjectImportSource.class);
        RuntimeProviderCompatibilityValidator validator = mock(RuntimeProviderCompatibilityValidator.class);
        when(workspaceService.findById("workspace-1", AclPermission.WORKSPACE_MANAGE_DATASOURCES))
                .thenReturn(Mono.just(mock(com.appsmith.server.domains.Workspace.class)));
        when(importer.sourceKind()).thenReturn(OntologyProjectImportSource.Kind.LOCAL_YAML);
        when(importer.importProject(any())).thenReturn(Mono.just(snapshot("local-yaml")));
        when(validator.validate(any(), eq("demo-mongo-readonly")))
                .thenReturn(Mono.just(
                        new ProviderValidationResult(false, List.of("Missing Object mapping: PurchaseOrder"))));
        OntologyDatasourceService service =
                new OntologyDatasourceService(workspaceService, datasourceService, List.of(importer), validator);

        StepVerifier.create(service.importDatasource(request("workspace-1")))
                .expectError(IllegalArgumentException.class)
                .verify();

        verify(datasourceService, never()).create(any());
    }

    @Test
    void listsOneWorkspaceDatasourceForTwoApplicationsWithoutApplicationBindingState() {
        WorkspaceService workspaceService = mock(WorkspaceService.class);
        DatasourceService datasourceService = mock(DatasourceService.class);
        Datasource ontologyDatasource = datasource("datasource-1", "workspace-1", snapshot("local-yaml"));
        when(datasourceService.getAllByWorkspaceIdWithStorages("workspace-1", AclPermission.READ_DATASOURCES))
                .thenReturn(reactor.core.publisher.Flux.just(ontologyDatasource));
        OntologyDatasourceService service = new OntologyDatasourceService(
                workspaceService, datasourceService, List.of(), mock(RuntimeProviderCompatibilityValidator.class));

        StepVerifier.create(service.listDatasourceCandidates("workspace-1"))
                .assertNext(summary -> assertThat(summary.datasourceId()).isEqualTo("datasource-1"))
                .verifyComplete();

        verify(datasourceService).getAllByWorkspaceIdWithStorages("workspace-1", AclPermission.READ_DATASOURCES);
    }

    @Test
    void reportsAStoppedDatasourceWhenItsNativeStorageIsNotConfigured() {
        DatasourceService datasourceService = mock(DatasourceService.class);
        Datasource stopped = datasource("datasource-1", "workspace-1", snapshot("local-yaml"));
        stopped.getDatasourceStorages().get("").setIsConfigured(false);
        when(datasourceService.findById("datasource-1", AclPermission.READ_DATASOURCES))
                .thenReturn(Mono.just(stopped));
        when(datasourceService.getAllByWorkspaceIdWithStorages("workspace-1", AclPermission.READ_DATASOURCES))
                .thenReturn(reactor.core.publisher.Flux.just(stopped));
        OntologyDatasourceService service = new OntologyDatasourceService(
                mock(WorkspaceService.class),
                datasourceService,
                List.of(),
                mock(RuntimeProviderCompatibilityValidator.class));

        StepVerifier.create(service.getDatasourceSummary("datasource-1"))
                .assertNext(summary -> assertThat(summary.status()).isEqualTo("STOPPED"))
                .verifyComplete();
    }

    @Test
    void stopsAnOntologyDatasourceThroughItsNativeStorageConfiguration() {
        DatasourceService datasourceService = mock(DatasourceService.class);
        Datasource datasource = datasource("datasource-1", "workspace-1", snapshot("local-yaml"));
        DatasourceStorageDTO storage = datasource.getDatasourceStorages().get("");
        when(datasourceService.findById("datasource-1", AclPermission.MANAGE_DATASOURCES))
                .thenReturn(Mono.just(datasource));
        when(datasourceService.getAllByWorkspaceIdWithStorages("workspace-1", AclPermission.MANAGE_DATASOURCES))
                .thenReturn(reactor.core.publisher.Flux.just(datasource));
        when(datasourceService.updateDatasourceStorage(storage, "", true)).thenReturn(Mono.just(datasource));
        OntologyDatasourceService service = new OntologyDatasourceService(
                mock(WorkspaceService.class),
                datasourceService,
                List.of(),
                mock(RuntimeProviderCompatibilityValidator.class));

        StepVerifier.create(service.stopDatasource("datasource-1"))
                .assertNext(summary -> assertThat(summary.status()).isEqualTo("STOPPED"))
                .verifyComplete();

        assertThat(storage.getIsConfigured()).isFalse();
    }

    @Test
    void archivesOnlyOntologyDatasources() {
        DatasourceService datasourceService = mock(DatasourceService.class);
        Datasource datasource = datasource("datasource-1", "workspace-1", snapshot("local-yaml"));
        when(datasourceService.findById("datasource-1", AclPermission.DELETE_DATASOURCES))
                .thenReturn(Mono.just(datasource));
        when(datasourceService.archiveById("datasource-1")).thenReturn(Mono.just(datasource));
        OntologyDatasourceService service = new OntologyDatasourceService(
                mock(WorkspaceService.class),
                datasourceService,
                List.of(),
                mock(RuntimeProviderCompatibilityValidator.class));

        StepVerifier.create(service.deleteDatasource("datasource-1")).verifyComplete();

        verify(datasourceService).archiveById("datasource-1");
    }

    private static ImportOntologyDatasourceRequest request(String workspaceId) {
        return new ImportOntologyDatasourceRequest(
                workspaceId,
                "Supply Chain",
                new OntologyProjectImportRequest(
                        OntologyProjectImportSource.Kind.LOCAL_YAML,
                        "projectId: supply-chain".getBytes(),
                        "local-upload.yaml",
                        "demo-mongo-readonly",
                        "admin-1"),
                "Initial import");
    }

    private static OntologyMetadataSnapshot snapshot(String source) {
        return new OntologyMetadataSnapshot(
                "snapshot-1",
                "supply-chain",
                "1.0.0",
                source,
                "local-upload.yaml",
                "demo-mongo-readonly",
                "admin-1",
                Instant.parse("2026-08-13T00:00:00Z"),
                "sha256:" + "a".repeat(64),
                new OntologyProjectDefinition("supply-chain", "1.0.0", 1, List.of(), List.of(), List.of(), List.of()));
    }

    private static Datasource datasource(String id, String workspaceId, OntologyMetadataSnapshot snapshot) {
        Datasource datasource = new Datasource();
        datasource.setId(id);
        datasource.setName("Supply Chain");
        datasource.setPluginId("celanworksmith-ontology-plugin");
        datasource.setWorkspaceId(workspaceId);
        datasource.setDatasourceStorages(Map.of("", new DatasourceStorageDTO(null, "", configuration(snapshot))));
        return datasource;
    }

    private static DatasourceConfiguration configuration(OntologyMetadataSnapshot snapshot) {
        return DatasourceConfiguration.builder()
                .properties(List.of(
                        new Property("projectId", snapshot.projectId()),
                        new Property("projectVersion", snapshot.projectVersion()),
                        new Property("metadataSnapshotId", snapshot.id()),
                        new Property("metadataDigest", snapshot.metadataDigest()),
                        new Property("runtimeProviderId", snapshot.runtimeProviderId()),
                        new Property("workspaceId", "workspace-1"),
                        new Property("datasourceId", "datasource-1"),
                        new Property("projectName", "Supply Chain"),
                        new Property("sourceKind", snapshot.sourceKind())))
                .build();
    }

    private static List<Map.Entry<String, String>> properties(DatasourceConfiguration configuration) {
        return configuration.getProperties().stream()
                .map(property -> Map.entry(property.getKey(), String.valueOf(property.getValue())))
                .toList();
    }
}
