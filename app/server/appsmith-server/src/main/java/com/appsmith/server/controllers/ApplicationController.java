package com.appsmith.server.controllers;

import com.appsmith.external.views.Views;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.artifacts.base.ArtifactService;
import com.appsmith.server.constants.Url;
import com.appsmith.server.controllers.ce.ApplicationControllerCE;
import com.appsmith.server.domains.User;
import com.appsmith.server.dtos.ResponseDTO;
import com.appsmith.server.exports.internal.ExportService;
import com.appsmith.server.exports.internal.partial.PartialExportService;
import com.appsmith.server.fork.internal.ApplicationForkingService;
import com.appsmith.server.imports.internal.ImportService;
import com.appsmith.server.imports.internal.partial.PartialImportService;
import com.appsmith.server.services.ApplicationPageService;
import com.appsmith.server.services.ApplicationSnapshotService;
import com.appsmith.server.services.SessionUserService;
import com.appsmith.server.solutions.UserReleaseNotes;
import com.appsmith.server.staticurl.StaticUrlService;
import com.appsmith.server.themes.base.ThemeService;
import com.celanworksmith.release.ApplicationReleasePublishCoordinator;
import com.fasterxml.jackson.annotation.JsonView;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import static com.appsmith.server.constants.FieldName.BRANCH_NAME;

@Slf4j
@RestController
@RequestMapping(Url.APPLICATION_URL)
public class ApplicationController extends ApplicationControllerCE {
    private final ApplicationReleasePublishCoordinator releasePublishCoordinator;
    private final SessionUserService sessionUserService;

    public ApplicationController(
            ArtifactService artifactService,
            ApplicationService service,
            StaticUrlService staticUrlService,
            ApplicationPageService applicationPageService,
            UserReleaseNotes userReleaseNotes,
            ApplicationForkingService applicationForkingService,
            ThemeService themeService,
            ApplicationSnapshotService applicationSnapshotService,
            PartialExportService partialExportService,
            PartialImportService partialImportService,
            ImportService importService,
            ExportService exportService,
            ApplicationReleasePublishCoordinator releasePublishCoordinator,
            SessionUserService sessionUserService) {
        super(
                artifactService,
                service,
                staticUrlService,
                applicationPageService,
                userReleaseNotes,
                applicationForkingService,
                themeService,
                applicationSnapshotService,
                partialExportService,
                partialImportService,
                importService,
                exportService);
        this.releasePublishCoordinator = releasePublishCoordinator;
        this.sessionUserService = sessionUserService;
    }

    @Override
    @JsonView(Views.Public.class)
    @PostMapping("/publish/{branchedApplicationId}")
    public Mono<ResponseDTO<Boolean>> publish(
            @PathVariable String branchedApplicationId,
            @RequestHeader(name = BRANCH_NAME, required = false) String branchName) {
        return sessionUserService
                .getCurrentUser()
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Authenticated user is required")))
                .map(this::actor)
                .flatMap(actor -> releasePublishCoordinator.publishWithRelease(
                        branchedApplicationId, actor, () -> super.publish(branchedApplicationId, branchName)));
    }

    private String actor(User user) {
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail();
        }
        if (user.getId() != null && !user.getId().isBlank()) {
            return user.getId();
        }
        throw new IllegalArgumentException("Authenticated user has no actor identity");
    }
}
