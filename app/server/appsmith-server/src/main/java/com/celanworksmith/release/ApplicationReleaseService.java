package com.celanworksmith.release;

import com.appsmith.external.models.Datasource;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.datasources.base.DatasourceService;
import com.appsmith.server.domains.Application;
import com.appsmith.server.domains.NewAction;
import com.appsmith.server.domains.NewPage;
import com.appsmith.server.newpages.base.NewPageService;
import com.appsmith.server.repositories.NewActionRepository;
import com.appsmith.server.solutions.ApplicationPermission;
import com.appsmith.server.solutions.DatasourcePermission;
import com.celanworksmith.release.dto.ReleasePreflightResponse;
import com.celanworksmith.release.model.ApplicationReleaseSnapshot;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import com.celanworksmith.release.model.ReleaseValidationResult;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class ApplicationReleaseService {
    private final ApplicationService applicationService;
    private final ApplicationPermission applicationPermission;
    private final NewActionRepository actionRepository;
    private final DatasourceService datasourceService;
    private final DatasourcePermission datasourcePermission;
    private final NewPageService newPageService;
    private final ApplicationReleaseSnapshotBuilder snapshotBuilder;
    private final ApplicationReleaseValidationService validationService;
    private final ApplicationReleaseProviderHealthGate healthGate;
    private final ApplicationReleaseRepository releaseRepository;
    private final Clock clock;

    @Autowired
    public ApplicationReleaseService(
            ApplicationService applicationService,
            ApplicationPermission applicationPermission,
            NewActionRepository actionRepository,
            DatasourceService datasourceService,
            DatasourcePermission datasourcePermission,
            NewPageService newPageService,
            ApplicationReleaseSnapshotBuilder snapshotBuilder,
            ApplicationReleaseValidationService validationService,
            ApplicationReleaseProviderHealthGate healthGate,
            ApplicationReleaseRepository releaseRepository) {
        this(
                applicationService,
                applicationPermission,
                actionRepository,
                datasourceService,
                datasourcePermission,
                newPageService,
                snapshotBuilder,
                validationService,
                healthGate,
                releaseRepository,
                Clock.systemUTC());
    }

    ApplicationReleaseService(
            ApplicationService applicationService,
            ApplicationPermission applicationPermission,
            NewActionRepository actionRepository,
            DatasourceService datasourceService,
            DatasourcePermission datasourcePermission,
            NewPageService newPageService,
            ApplicationReleaseSnapshotBuilder snapshotBuilder,
            ApplicationReleaseValidationService validationService,
            ApplicationReleaseProviderHealthGate healthGate,
            ApplicationReleaseRepository releaseRepository,
            Clock clock) {
        this.applicationService = applicationService;
        this.applicationPermission = applicationPermission;
        this.actionRepository = actionRepository;
        this.datasourceService = datasourceService;
        this.datasourcePermission = datasourcePermission;
        this.newPageService = newPageService;
        this.snapshotBuilder = snapshotBuilder;
        this.validationService = validationService;
        this.healthGate = healthGate;
        this.releaseRepository = releaseRepository;
        this.clock = clock;
    }

    public Mono<ReleasePreflightResponse> preflight(String applicationId, String actor, String message) {
        return loadCandidate(applicationId, applicationPermission.getReadPermission())
                .flatMap(candidate ->
                        validationService.validate(candidate).map(result -> preflightResponse(candidate, result)));
    }

    public Mono<ApplicationReleaseSnapshot> createSnapshot(String applicationId, String actor, String message) {
        return loadCandidate(applicationId, applicationPermission.getEditPermission())
                .flatMap(candidate -> validationService.extract(candidate).flatMap(extraction -> validationService
                        .validate(candidate, extraction)
                        .flatMap(result -> {
                            if (!result.valid()) {
                                return Mono.error(new BlockingReleaseException(applicationId, result.diagnostics()));
                            }
                            return snapshotBuilder
                                    .build(candidate, extraction.pins(), actor, message, result.diagnostics())
                                    .flatMap(releaseRepository::save);
                        })));
    }

    public Flux<ApplicationReleaseSnapshot> list(String applicationId) {
        return loadApplication(applicationId, applicationPermission.getReadPermission())
                .thenMany(releaseRepository.findByApplicationId(applicationId));
    }

    public Mono<ApplicationReleaseSnapshot> getActive(String applicationId) {
        return loadApplication(applicationId, applicationPermission.getReadPermission())
                .then(releaseRepository.findActive(applicationId));
    }

    public Mono<ApplicationReleaseSnapshot> activate(String applicationId, String releaseId, String actor) {
        return activateRelease(applicationId, releaseId, actor);
    }

    public Mono<ApplicationReleaseSnapshot> rollback(String applicationId, String targetReleaseId, String actor) {
        return activateRelease(applicationId, targetReleaseId, actor);
    }

    private Mono<ApplicationReleaseSnapshot> activateRelease(String applicationId, String releaseId, String actor) {
        return loadApplication(applicationId, applicationPermission.getEditPermission())
                .then(findApplicationRelease(applicationId, releaseId))
                .flatMap(release -> healthGate.check(release.datasourcePins()).flatMap(diagnostics -> {
                    if (hasBlocking(diagnostics)) {
                        return Mono.error(new BlockingReleaseException(applicationId, diagnostics));
                    }
                    return releaseRepository
                            .activate(applicationId, releaseId, actor, Instant.now(clock))
                            .thenReturn(release);
                }));
    }

    private Mono<ApplicationReleaseSnapshot> findApplicationRelease(String applicationId, String releaseId) {
        return releaseRepository
                .findById(releaseId)
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Release does not exist: " + releaseId)))
                .flatMap(release -> {
                    if (!applicationId.equals(release.applicationId())) {
                        return Mono.error(new IllegalArgumentException("Release belongs to another application"));
                    }
                    return Mono.just(release);
                });
    }

    private Mono<ApplicationReleaseCandidate> loadCandidate(String applicationId, AclPermission permission) {
        return loadApplication(applicationId, permission).flatMap(application -> Mono.zip(
                        actionRepository
                                .findByApplicationId(applicationId, AclPermission.READ_ACTIONS)
                                .collectList(),
                        newPageService
                                .findNewPagesByApplicationId(applicationId, permission)
                                .collectList(),
                        datasourceService
                                .getAllByWorkspaceIdWithStorages(
                                        application.getWorkspaceId(), datasourcePermission.getReadPermission())
                                .collectList())
                .map(tuple -> candidate(application, tuple.getT1(), tuple.getT2(), tuple.getT3())));
    }

    private Mono<Application> loadApplication(String applicationId, AclPermission permission) {
        return applicationService
                .findById(applicationId, permission)
                .switchIfEmpty(
                        Mono.error(new IllegalArgumentException("Application does not exist: " + applicationId)));
    }

    private ApplicationReleaseCandidate candidate(
            Application application, List<NewAction> actions, List<NewPage> pages, List<Datasource> datasources) {
        Set<String> referencedDatasourceIds = actions.stream()
                .filter(action -> action != null
                        && action.getUnpublishedAction() != null
                        && action.getUnpublishedAction().getDatasource() != null)
                .map(action -> action.getUnpublishedAction().getDatasource().getId())
                .filter(id -> id != null && !id.isBlank())
                .collect(Collectors.toUnmodifiableSet());
        List<Datasource> usedDatasources = datasources.stream()
                .filter(datasource -> datasource != null && referencedDatasourceIds.contains(datasource.getId()))
                .toList();
        return new ApplicationReleaseCandidate(
                application, actions, pages, usedDatasources, baseRevisionId(application));
    }

    private String baseRevisionId(Application application) {
        if (application.getUpdatedAt() != null) {
            return application.getUpdatedAt().toString();
        }
        if (application.getCreatedAt() != null) {
            return application.getCreatedAt().toString();
        }
        return application.getId();
    }

    private ReleasePreflightResponse preflightResponse(
            ApplicationReleaseCandidate candidate, ReleaseValidationResult result) {
        return new ReleasePreflightResponse(
                candidate.application().getId(), candidate.baseRevisionId(), result.valid(), result.diagnostics());
    }

    private boolean hasBlocking(List<ReleaseDiagnostic> diagnostics) {
        return diagnostics.stream()
                .anyMatch(diagnostic -> diagnostic.severity() == ReleaseDiagnostic.Severity.BLOCKING);
    }

    public static final class BlockingReleaseException extends IllegalArgumentException {
        private final String applicationId;
        private final List<ReleaseDiagnostic> diagnostics;

        public BlockingReleaseException(String applicationId, List<ReleaseDiagnostic> diagnostics) {
            super("Release is blocked by validation diagnostics");
            this.applicationId = applicationId;
            this.diagnostics = List.copyOf(diagnostics);
        }

        public String applicationId() {
            return applicationId;
        }

        public List<ReleaseDiagnostic> diagnostics() {
            return diagnostics;
        }
    }
}
