package com.celanworksmith.release;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.datasources.base.DatasourceService;
import com.appsmith.server.dtos.ResponseDTO;
import com.appsmith.server.newpages.base.NewPageService;
import com.appsmith.server.solutions.ApplicationPermission;
import com.appsmith.server.solutions.DatasourcePermission;
import com.celanworksmith.release.dto.ReleasePreflightResponse;
import com.celanworksmith.release.model.ApplicationReleaseSnapshot;
import com.celanworksmith.release.model.ApplicationReleaseStatus;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationReleasePublishCoordinatorTest {
    @Mock
    ApplicationReleaseService releaseService;

    @Mock
    ApplicationReleaseProviderHealthGate healthGate;

    @Mock
    ApplicationReleaseRepository releaseRepository;

    @Mock
    Supplier<Mono<ResponseDTO<Boolean>>> nativePublish;

    private ApplicationReleasePublishCoordinator coordinator;
    private ApplicationReleaseSnapshot snapshot;
    private ResponseDTO<Boolean> nativeResponse;

    @BeforeEach
    void setUp() {
        coordinator = new ApplicationReleasePublishCoordinator(releaseService, healthGate, releaseRepository);
        snapshot = snapshot("release-1");
        nativeResponse = new ResponseDTO<>(200, true, null);
    }

    @Test
    void mixedResourcesReachNativePublishWithOnlyStandalonePins() {
        var mixed = new ReleaseDependencyScannerTest.MixedResources();
        coordinator = mixedCoordinator(mixed);
        when(releaseRepository.save(any())).thenAnswer(call -> Mono.just(call.getArgument(0)));
        when(nativePublish.get()).thenReturn(Mono.just(nativeResponse));
        when(releaseRepository.activate(eq("app-1"), any(), eq("actor@example.com"), any()))
                .thenReturn(Mono.just(new ApplicationReleaseRepository.ActivationResult(null, "release-1")));

        ResponseDTO<Boolean> response = coordinator
                .publishWithRelease("app-1", "actor@example.com", nativePublish)
                .block();

        assertThat(response).isSameAs(nativeResponse);
        var saved = org.mockito.ArgumentCaptor.forClass(ApplicationReleaseSnapshot.class);
        InOrder order = inOrder(releaseRepository, nativePublish, healthGate);
        order.verify(releaseRepository).save(saved.capture());
        order.verify(nativePublish).get();
        order.verify(healthGate).check(saved.getValue().datasourcePins());
        order.verify(releaseRepository)
                .activate(eq("app-1"), eq(saved.getValue().releaseId()), eq("actor@example.com"), any());
        assertThat(saved.getValue().datasourcePins())
                .extracting("datasourceId", "kind")
                .containsExactly(
                        org.assertj.core.api.Assertions.tuple("db-1", "NATIVE"),
                        org.assertj.core.api.Assertions.tuple("ontology-1", "ONTOLOGY"));
        var actions = new ObjectMapper()
                .valueToTree(saved.getValue().applicationContent())
                .path("actions");
        assertThat(actions.findValuesAsText("id"))
                .contains("js-action", "inline-api-action", "db-action", "ontology-action");
        verify(nativePublish).get();
    }

    @Test
    void invalidOntologyInMixedResourcesBlocksNativePublishAndSnapshotCreation() {
        var mixed = new ReleaseDependencyScannerTest.MixedResources();
        mixed.referenceMissingObject();
        coordinator = mixedCoordinator(mixed);

        ResponseDTO<Boolean> response = coordinator
                .publishWithRelease("app-1", "actor@example.com", nativePublish)
                .block();

        assertThat(response.getData()).isFalse();
        assertThat(response.getResponseMeta().getStatus()).isEqualTo(422);
        assertThat(response.getResponseMeta().getMessage()).contains("RELEASE_ONTOLOGY_METADATA_NOT_FOUND");
        verify(nativePublish, never()).get();
        verify(releaseRepository, never()).save(any());
        verify(releaseRepository, never()).activate(any(), any(), any(), any());
        verify(healthGate, never()).check(any());
    }

    private ApplicationReleasePublishCoordinator mixedCoordinator(ReleaseDependencyScannerTest.MixedResources mixed) {
        healthGate = mixed.healthGate;
        ApplicationService applications = mock(ApplicationService.class);
        ApplicationPermission applicationPermission = mock(ApplicationPermission.class);
        DatasourceService datasources = mock(DatasourceService.class);
        DatasourcePermission datasourcePermission = mock(DatasourcePermission.class);
        NewPageService pages = mock(NewPageService.class);
        when(applicationPermission.getReadPermission()).thenReturn(AclPermission.READ_APPLICATIONS);
        org.mockito.Mockito.lenient()
                .when(applicationPermission.getEditPermission())
                .thenReturn(AclPermission.MANAGE_APPLICATIONS);
        when(applications.findById(eq("app-1"), any())).thenReturn(Mono.just(mixed.candidate.application()));
        when(datasourcePermission.getReadPermission()).thenReturn(AclPermission.READ_DATASOURCES);
        when(datasources.getAllByWorkspaceIdWithStorages("workspace-1", AclPermission.READ_DATASOURCES))
                .thenReturn(Flux.fromIterable(mixed.candidate.usedDatasources()));
        when(pages.findNewPagesByApplicationId(eq("app-1"), any())).thenReturn(Flux.empty());
        ApplicationReleaseService service = new ApplicationReleaseService(
                applications,
                applicationPermission,
                mixed.actions,
                datasources,
                datasourcePermission,
                pages,
                new ApplicationReleaseSnapshotBuilder(new ObjectMapper().findAndRegisterModules()),
                mixed.validation,
                healthGate,
                releaseRepository);
        return new ApplicationReleasePublishCoordinator(service, healthGate, releaseRepository);
    }

    @Test
    void blockingPreflightDoesNotCreateSnapshotOrCallNativePublish() {
        ReleaseDiagnostic diagnostic = blockingDiagnostic("RELEASE_BLOCKED");
        when(releaseService.preflight("app-1", "actor@example.com", null))
                .thenReturn(Mono.just(new ReleasePreflightResponse("app-1", "revision-1", false, List.of(diagnostic))));

        ResponseDTO<Boolean> response = coordinator
                .publishWithRelease("app-1", "actor@example.com", nativePublish)
                .block();

        assertThat(response.getData()).isFalse();
        assertThat(response.getResponseMeta().getStatus()).isEqualTo(422);
        assertThat(response.getResponseMeta().getMessage()).contains("RELEASE_BLOCKED");
        verify(releaseService, never()).createSnapshot(any(), any(), any());
        verify(nativePublish, never()).get();
        verify(healthGate, never()).check(any());
        verify(releaseRepository, never()).activate(any(), any(), any(), any());
    }

    @Test
    void successfulPublishActivatesSnapshotAfterFinalHealthGate() {
        stubValidRelease();
        when(nativePublish.get()).thenReturn(Mono.just(nativeResponse));
        when(healthGate.check(snapshot.datasourcePins())).thenReturn(Mono.just(List.of()));
        when(releaseRepository.activate(eq("app-1"), eq("release-1"), eq("actor@example.com"), any()))
                .thenReturn(Mono.just(new ApplicationReleaseRepository.ActivationResult(null, "release-1")));

        ResponseDTO<Boolean> response = coordinator
                .publishWithRelease("app-1", "actor@example.com", nativePublish)
                .block();

        assertThat(response).isSameAs(nativeResponse);
        InOrder order = inOrder(releaseService, nativePublish, healthGate, releaseRepository);
        order.verify(releaseService).preflight("app-1", "actor@example.com", null);
        order.verify(releaseService).createSnapshot("app-1", "actor@example.com", null);
        order.verify(nativePublish).get();
        order.verify(healthGate).check(snapshot.datasourcePins());
        order.verify(releaseRepository).activate(eq("app-1"), eq("release-1"), eq("actor@example.com"), any());
    }

    @Test
    void nativePublishFailureDoesNotActivateSnapshot() {
        stubValidRelease();
        RuntimeException nativeFailure = new RuntimeException("native publish failed");
        when(nativePublish.get()).thenReturn(Mono.error(nativeFailure));

        assertThatThrownBy(() -> coordinator
                        .publishWithRelease("app-1", "actor@example.com", nativePublish)
                        .block())
                .hasMessage("native publish failed");

        verify(nativePublish).get();
        verify(healthGate, never()).check(any());
        verify(releaseRepository, never()).activate(any(), any(), any(), any());
    }

    @Test
    void finalProviderHealthFailureDoesNotActivateSnapshot() {
        stubValidRelease();
        when(nativePublish.get()).thenReturn(Mono.just(nativeResponse));
        when(healthGate.check(snapshot.datasourcePins()))
                .thenReturn(Mono.just(List.of(blockingDiagnostic("RELEASE_ONTOLOGY_PROVIDER_UNAVAILABLE"))));

        ResponseDTO<Boolean> response = coordinator
                .publishWithRelease("app-1", "actor@example.com", nativePublish)
                .block();

        assertThat(response.getData()).isFalse();
        assertThat(response.getResponseMeta().getStatus()).isEqualTo(422);
        assertThat(response.getResponseMeta().getSuccess()).isFalse();
        assertThat(response.getResponseMeta().getMessage()).contains("RELEASE_ONTOLOGY_PROVIDER_UNAVAILABLE");
        verify(nativePublish).get();
        verify(releaseRepository, never()).activate(any(), any(), any(), any());
    }

    @Test
    void suppliedNativeCallbackIsTheOnlyPublishExecutionAndRunsOnce() {
        stubValidRelease();
        when(nativePublish.get()).thenReturn(Mono.just(nativeResponse));
        when(healthGate.check(snapshot.datasourcePins())).thenReturn(Mono.just(List.of()));
        when(releaseRepository.activate(eq("app-1"), eq("release-1"), eq("actor@example.com"), any()))
                .thenReturn(Mono.just(new ApplicationReleaseRepository.ActivationResult(null, "release-1")));

        coordinator
                .publishWithRelease("app-1", "actor@example.com", nativePublish)
                .block();

        verify(nativePublish).get();
        verify(releaseService).preflight("app-1", "actor@example.com", null);
        verify(releaseService).createSnapshot("app-1", "actor@example.com", null);
        verify(releaseRepository).activate(eq("app-1"), eq("release-1"), eq("actor@example.com"), any());
        verify(releaseRepository, never()).transitionStatus(any(), any());
    }

    private void stubValidRelease() {
        when(releaseService.preflight("app-1", "actor@example.com", null))
                .thenReturn(Mono.just(new ReleasePreflightResponse("app-1", "revision-1", true, List.of())));
        when(releaseService.createSnapshot("app-1", "actor@example.com", null)).thenReturn(Mono.just(snapshot));
    }

    private ReleaseDiagnostic blockingDiagnostic(String code) {
        return new ReleaseDiagnostic(
                ReleaseDiagnostic.Severity.BLOCKING, code, "release", "Release is blocked", Map.of());
    }

    private ApplicationReleaseSnapshot snapshot(String releaseId) {
        return new ApplicationReleaseSnapshot(
                releaseId,
                "app-1",
                "workspace-1",
                "revision-1",
                "1",
                "actor@example.com",
                Instant.parse("2026-08-15T00:00:00Z"),
                "message",
                "sha256:" + "a".repeat(64),
                Map.of("application", Map.of("id", "app-1")),
                List.of(),
                List.of(),
                ApplicationReleaseStatus.SNAPSHOT_CREATED);
    }
}
