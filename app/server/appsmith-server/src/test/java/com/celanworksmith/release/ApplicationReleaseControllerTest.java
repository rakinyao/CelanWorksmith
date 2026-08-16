package com.celanworksmith.release;

import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.datasources.base.DatasourceService;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.NewAction;
import com.appsmith.server.domains.NewPage;
import com.appsmith.server.domains.User;
import com.appsmith.server.newpages.base.NewPageService;
import com.appsmith.server.repositories.NewActionRepository;
import com.appsmith.server.solutions.ApplicationPermission;
import com.appsmith.server.solutions.DatasourcePermission;
import com.celanworksmith.CelanWorksmithExceptionHandler;
import com.celanworksmith.release.model.ApplicationReleaseSnapshot;
import com.celanworksmith.release.model.ApplicationReleaseStatus;
import com.celanworksmith.release.model.ReleaseDatasourcePinExtractionResult;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import com.celanworksmith.release.model.ReleaseValidationResult;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ApplicationReleaseControllerTest {
    @Mock
    ApplicationService applicationService;

    @Mock
    ApplicationPermission applicationPermission;

    @Mock
    DatasourceService datasourceService;

    @Mock
    DatasourcePermission datasourcePermission;

    @Mock
    NewActionRepository actionRepository;

    @Mock
    ApplicationReleaseSnapshotBuilder snapshotBuilder;

    @Mock
    ApplicationReleaseValidationService validationService;

    @Mock
    ApplicationReleaseProviderHealthGate healthGate;

    @Mock
    ApplicationReleaseRepository releaseRepository;

    @Mock
    NewPageService newPageService;

    @Mock
    com.appsmith.server.services.SessionUserService sessionUserService;

    private ApplicationReleaseService service;
    private WebTestClient client;
    private Application application;
    private ApplicationReleaseSnapshot snapshot;

    @BeforeEach
    void setUp() {
        application = new Application();
        application.setId("app-1");
        application.setWorkspaceId("workspace-1");
        application.setUpdatedAt(Instant.parse("2026-08-15T00:00:00Z"));
        snapshot = snapshot("release-1", "app-1");

        lenient()
                .when(applicationPermission.getReadPermission())
                .thenReturn(com.appsmith.server.acl.AclPermission.READ_APPLICATIONS);
        lenient()
                .when(applicationPermission.getEditPermission())
                .thenReturn(com.appsmith.server.acl.AclPermission.MANAGE_APPLICATIONS);
        lenient()
                .when(datasourcePermission.getReadPermission())
                .thenReturn(com.appsmith.server.acl.AclPermission.READ_DATASOURCES);
        lenient().when(applicationService.findById(eq("app-1"), any())).thenReturn(Mono.just(application));
        lenient().when(actionRepository.findByApplicationId(eq("app-1"), any())).thenReturn(Flux.empty());
        lenient()
                .when(newPageService.findNewPagesByApplicationId(eq("app-1"), any()))
                .thenReturn(Flux.empty());
        lenient()
                .when(datasourceService.getAllByWorkspaceIdWithStorages(eq("workspace-1"), any()))
                .thenReturn(Flux.empty());
        lenient()
                .when(validationService.extract(any()))
                .thenReturn(Mono.just(new ReleaseDatasourcePinExtractionResult(List.of(), List.of())));
        lenient().when(healthGate.check(any())).thenReturn(Mono.just(List.of()));

        service = new ApplicationReleaseService(
                applicationService,
                applicationPermission,
                actionRepository,
                datasourceService,
                datasourcePermission,
                newPageService,
                snapshotBuilder,
                validationService,
                healthGate,
                releaseRepository);
        User user = new User();
        user.setEmail("actor@example.com");
        lenient().when(sessionUserService.getCurrentUser()).thenReturn(Mono.just(user));
        client = WebTestClient.bindToController(new ApplicationReleaseController(service, sessionUserService))
                .controllerAdvice(new CelanWorksmithExceptionHandler())
                .build();
    }

    @Test
    void preflightReturnsDiagnosticsWithoutPersisting() {
        ReleaseDiagnostic diagnostic = blockingDiagnostic();
        when(validationService.validate(any())).thenReturn(Mono.just(new ReleaseValidationResult(List.of(diagnostic))));

        client.post()
                .uri("/api/v1/celanworksmith/applications/app-1/releases/preflight")
                .bodyValue(Map.of("message", "check"))
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data.valid")
                .isEqualTo(false)
                .jsonPath("$.data.diagnostics[0].code")
                .isEqualTo("RELEASE_BLOCKED");

        verify(releaseRepository, never()).save(any());
        verify(snapshotBuilder, never()).build(any(), any(), any(), any());
    }

    @Test
    void createRejectsBlockingDiagnosticsWithoutPersistence() {
        when(validationService.validate(any(), any()))
                .thenReturn(Mono.just(new ReleaseValidationResult(List.of(blockingDiagnostic()))));

        client.post()
                .uri("/api/v1/celanworksmith/applications/app-1/releases")
                .bodyValue(Map.of("message", "blocked"))
                .exchange()
                .expectStatus()
                .isEqualTo(422)
                .expectBody()
                .jsonPath("$.data.valid")
                .isEqualTo(false)
                .jsonPath("$.data.diagnostics[0].severity")
                .isEqualTo("BLOCKING");

        verify(releaseRepository, never()).save(any());
    }

    @Test
    void createPersistsOnlyTheServerBuiltSnapshot() {
        List<ReleaseDiagnostic> diagnostics = List.of(new ReleaseDiagnostic(
                ReleaseDiagnostic.Severity.WARNING, "RELEASE_WARNING", "release", "safe", Map.of()));
        when(validationService.validate(any(), any())).thenReturn(Mono.just(new ReleaseValidationResult(diagnostics)));
        when(snapshotBuilder.build(any(), eq(List.of()), eq("actor@example.com"), eq("valid"), eq(diagnostics)))
                .thenReturn(Mono.just(snapshot));
        when(releaseRepository.save(snapshot)).thenReturn(Mono.just(snapshot));

        client.post()
                .uri("/api/v1/celanworksmith/applications/app-1/releases")
                .bodyValue(Map.of(
                        "message", "valid",
                        "applicationContent", Map.of("forged", true),
                        "datasources", List.of(Map.of("password", "forged"))))
                .exchange()
                .expectStatus()
                .isCreated()
                .expectBody()
                .jsonPath("$.data.releaseId")
                .isEqualTo("release-1");

        verify(snapshotBuilder).build(any(), eq(List.of()), eq("actor@example.com"), eq("valid"), eq(diagnostics));
        verify(releaseRepository).save(snapshot);
    }

    @Test
    void activationRunsFinalHealthGateBeforePointerOperation() {
        when(releaseRepository.findById("release-1")).thenReturn(Mono.just(snapshot));
        when(releaseRepository.activate(eq("app-1"), eq("release-1"), eq("actor@example.com"), any()))
                .thenReturn(Mono.just(new ApplicationReleaseRepository.ActivationResult(null, "release-1")));

        client.post()
                .uri("/api/v1/celanworksmith/applications/app-1/releases/release-1/activate")
                .exchange()
                .expectStatus()
                .isOk();

        verify(healthGate).check(snapshot.datasourcePins());
        verify(releaseRepository).activate(eq("app-1"), eq("release-1"), eq("actor@example.com"), any());
        var order = inOrder(applicationService, releaseRepository, healthGate);
        order.verify(applicationService)
                .findById(eq("app-1"), eq(com.appsmith.server.acl.AclPermission.MANAGE_APPLICATIONS));
        order.verify(releaseRepository).findById("release-1");
        order.verify(healthGate).check(snapshot.datasourcePins());
        order.verify(releaseRepository).activate(eq("app-1"), eq("release-1"), eq("actor@example.com"), any());
    }

    @Test
    void blockingHealthGatePreventsActivationAndRollbackAndPreservesReads() {
        ReleaseDiagnostic blocking = blockingDiagnostic();
        ApplicationReleaseSnapshot oldActive = snapshot("release-old", "app-1");
        when(releaseRepository.findById(any())).thenReturn(Mono.just(snapshot));
        when(healthGate.check(any())).thenReturn(Mono.just(List.of(blocking)));
        when(releaseRepository.findActive("app-1")).thenReturn(Mono.just(oldActive));
        when(releaseRepository.findByApplicationId("app-1")).thenReturn(Flux.just(snapshot, oldActive));

        client.post()
                .uri("/api/v1/celanworksmith/applications/app-1/releases/release-1/activate")
                .exchange()
                .expectStatus()
                .isEqualTo(422);
        client.post()
                .uri("/api/v1/celanworksmith/applications/app-1/releases/release-1/rollback")
                .exchange()
                .expectStatus()
                .isEqualTo(422);
        client.get()
                .uri("/api/v1/celanworksmith/applications/app-1/releases/active")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data.releaseId")
                .isEqualTo("release-old");
        client.get()
                .uri("/api/v1/celanworksmith/applications/app-1/releases")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data.length()")
                .isEqualTo(2);

        verify(releaseRepository, never()).activate(any(), any(), any(), any());
    }

    @Test
    void rollbackUsesTheSelectedReleaseAndLeavesReleaseRecordsUntouched() {
        when(releaseRepository.findById("release-1")).thenReturn(Mono.just(snapshot));
        when(releaseRepository.activate(eq("app-1"), eq("release-1"), eq("actor@example.com"), any()))
                .thenReturn(Mono.just(new ApplicationReleaseRepository.ActivationResult("release-2", "release-1")));

        client.post()
                .uri("/api/v1/celanworksmith/applications/app-1/releases/release-1/rollback")
                .exchange()
                .expectStatus()
                .isOk();

        verify(releaseRepository).activate(eq("app-1"), eq("release-1"), eq("actor@example.com"), any());
        verify(releaseRepository, never()).transitionStatus(any(), any());
    }

    @Test
    void rejectsCrossApplicationReleaseIdsBeforePointerOperation() {
        ApplicationReleaseSnapshot foreign = snapshot("release-1", "other-app");
        when(releaseRepository.findById("release-1")).thenReturn(Mono.just(foreign));

        client.post()
                .uri("/api/v1/celanworksmith/applications/app-1/releases/release-1/activate")
                .exchange()
                .expectStatus()
                .isBadRequest();

        verify(healthGate, never()).check(any());
        verify(releaseRepository, never()).activate(any(), any(), any(), any());
    }

    @Test
    void rejectsCrossApplicationReleaseIdsForRollback() {
        when(releaseRepository.findById("release-1")).thenReturn(Mono.just(snapshot("release-1", "other-app")));

        client.post()
                .uri("/api/v1/celanworksmith/applications/app-1/releases/release-1/rollback")
                .exchange()
                .expectStatus()
                .isBadRequest();

        verify(healthGate, never()).check(any());
        verify(releaseRepository, never()).activate(any(), any(), any(), any());
    }

    @Test
    void loadsPermissionAwareDraftCandidateIncludingPages() {
        NewAction action = new NewAction();
        action.setId("action-1");
        NewPage page = new NewPage();
        page.setId("page-1");
        page.setApplicationId("app-1");
        when(actionRepository.findByApplicationId(eq("app-1"), eq(com.appsmith.server.acl.AclPermission.READ_ACTIONS)))
                .thenReturn(Flux.just(action));
        when(newPageService.findNewPagesByApplicationId(
                        eq("app-1"), eq(com.appsmith.server.acl.AclPermission.READ_APPLICATIONS)))
                .thenReturn(Flux.just(page));
        when(validationService.validate(any())).thenReturn(Mono.just(new ReleaseValidationResult(List.of())));

        client.post()
                .uri("/api/v1/celanworksmith/applications/app-1/releases/preflight")
                .exchange()
                .expectStatus()
                .isOk();

        ArgumentCaptor<ApplicationReleaseCandidate> candidateCaptor =
                ArgumentCaptor.forClass(ApplicationReleaseCandidate.class);
        verify(validationService).validate(candidateCaptor.capture());
        assertThat(candidateCaptor.getValue().unpublishedActions()).containsExactly(action);
        assertThat(candidateCaptor.getValue().unpublishedPages()).containsExactly(page);
        verify(actionRepository).findByApplicationId("app-1", com.appsmith.server.acl.AclPermission.READ_ACTIONS);
        verify(newPageService)
                .findNewPagesByApplicationId("app-1", com.appsmith.server.acl.AclPermission.READ_APPLICATIONS);
        verify(datasourceService)
                .getAllByWorkspaceIdWithStorages("workspace-1", com.appsmith.server.acl.AclPermission.READ_DATASOURCES);
    }

    @Test
    void listsAndResolvesActiveReleasesWithReadPermission() {
        when(releaseRepository.findByApplicationId("app-1")).thenReturn(Flux.just(snapshot));
        when(releaseRepository.findActive("app-1")).thenReturn(Mono.just(snapshot));

        client.get()
                .uri("/api/v1/celanworksmith/applications/app-1/releases")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data[0].releaseId")
                .isEqualTo("release-1");
        client.get()
                .uri("/api/v1/celanworksmith/applications/app-1/releases/active")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data.releaseId")
                .isEqualTo("release-1");

        verify(applicationService, org.mockito.Mockito.atLeast(2))
                .findById("app-1", com.appsmith.server.acl.AclPermission.READ_APPLICATIONS);
    }

    @Test
    void serviceRejectsBlockingCreateBeforeBuildingOrSaving() {
        when(validationService.validate(any(), any()))
                .thenReturn(Mono.just(new ReleaseValidationResult(List.of(blockingDiagnostic()))));

        assertThatThrownBy(() -> service.createSnapshot("app-1", "actor@example.com", "blocked")
                        .block())
                .isInstanceOf(ApplicationReleaseService.BlockingReleaseException.class);

        verify(snapshotBuilder, never()).build(any(), any(), any(), any(), any());
        verify(releaseRepository, never()).save(any());
    }

    private ReleaseDiagnostic blockingDiagnostic() {
        return new ReleaseDiagnostic(
                ReleaseDiagnostic.Severity.BLOCKING, "RELEASE_BLOCKED", "release", "Release is blocked", Map.of());
    }

    private ApplicationReleaseSnapshot snapshot(String releaseId, String applicationId) {
        return new ApplicationReleaseSnapshot(
                releaseId,
                applicationId,
                "workspace-1",
                "revision-1",
                "1",
                "actor@example.com",
                Instant.parse("2026-08-15T00:00:00Z"),
                "message",
                "sha256:" + "a".repeat(64),
                Map.of("application", Map.of("id", applicationId)),
                List.of(),
                List.of(),
                ApplicationReleaseStatus.SNAPSHOT_CREATED);
    }
}
