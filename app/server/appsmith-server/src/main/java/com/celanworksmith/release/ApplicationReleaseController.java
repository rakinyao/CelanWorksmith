package com.celanworksmith.release;

import com.appsmith.server.domains.User;
import com.appsmith.server.dtos.ResponseDTO;
import com.appsmith.server.services.SessionUserService;
import com.celanworksmith.release.dto.ReleasePreflightResponse;
import com.celanworksmith.release.model.ApplicationReleaseSnapshot;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/v1/celanworksmith/applications/{applicationId}/releases")
public class ApplicationReleaseController {
    private final ApplicationReleaseService service;
    private final SessionUserService sessionUserService;

    public ApplicationReleaseController(ApplicationReleaseService service, SessionUserService sessionUserService) {
        this.service = service;
        this.sessionUserService = sessionUserService;
    }

    @PostMapping("/preflight")
    public Mono<ResponseDTO<ReleasePreflightResponse>> preflight(
            @PathVariable String applicationId, @RequestBody(required = false) ReleaseRequest request) {
        return currentActor()
                .flatMap(actor -> service.preflight(applicationId, actor, message(request)))
                .map(response -> new ResponseDTO<>(HttpStatus.OK, response));
    }

    @PostMapping
    public Mono<ResponseDTO<Object>> createSnapshot(
            @PathVariable String applicationId,
            @RequestBody(required = false) ReleaseRequest request,
            ServerHttpResponse response) {
        return currentActor()
                .flatMap(actor -> service.createSnapshot(applicationId, actor, message(request)))
                .doOnNext(ignored -> response.setStatusCode(HttpStatus.CREATED))
                .map(snapshot -> new ResponseDTO<Object>(HttpStatus.CREATED, snapshot))
                .onErrorResume(ApplicationReleaseService.BlockingReleaseException.class, error -> {
                    response.setStatusCode(HttpStatus.UNPROCESSABLE_ENTITY);
                    return Mono.just(new ResponseDTO<Object>(
                            HttpStatus.UNPROCESSABLE_ENTITY.value(),
                            new ReleasePreflightResponse(error.applicationId(), null, false, error.diagnostics()),
                            error.getMessage()));
                });
    }

    @GetMapping
    public Mono<ResponseDTO<List<ApplicationReleaseSnapshot>>> list(@PathVariable String applicationId) {
        return service.list(applicationId).collectList().map(releases -> new ResponseDTO<>(HttpStatus.OK, releases));
    }

    @GetMapping("/active")
    public Mono<ResponseDTO<ApplicationReleaseSnapshot>> active(@PathVariable String applicationId) {
        return service.getActive(applicationId).map(release -> new ResponseDTO<>(HttpStatus.OK, release));
    }

    @PostMapping("/{releaseId}/activate")
    public Mono<ResponseDTO<Object>> activate(
            @PathVariable String applicationId, @PathVariable String releaseId, ServerHttpResponse response) {
        return currentActor()
                .flatMap(actor -> service.activate(applicationId, releaseId, actor))
                .map(release -> new ResponseDTO<Object>(HttpStatus.OK, release))
                .onErrorResume(ApplicationReleaseService.BlockingReleaseException.class, error -> {
                    response.setStatusCode(HttpStatus.UNPROCESSABLE_ENTITY);
                    return Mono.just(new ResponseDTO<Object>(
                            HttpStatus.UNPROCESSABLE_ENTITY.value(),
                            new ReleasePreflightResponse(error.applicationId(), null, false, error.diagnostics()),
                            error.getMessage()));
                });
    }

    @PostMapping("/{releaseId}/rollback")
    public Mono<ResponseDTO<Object>> rollback(
            @PathVariable String applicationId, @PathVariable String releaseId, ServerHttpResponse response) {
        return currentActor()
                .flatMap(actor -> service.rollback(applicationId, releaseId, actor))
                .map(release -> new ResponseDTO<Object>(HttpStatus.OK, release))
                .onErrorResume(ApplicationReleaseService.BlockingReleaseException.class, error -> {
                    response.setStatusCode(HttpStatus.UNPROCESSABLE_ENTITY);
                    return Mono.just(new ResponseDTO<Object>(
                            HttpStatus.UNPROCESSABLE_ENTITY.value(),
                            new ReleasePreflightResponse(error.applicationId(), null, false, error.diagnostics()),
                            error.getMessage()));
                });
    }

    private Mono<String> currentActor() {
        return sessionUserService
                .getCurrentUser()
                .switchIfEmpty(Mono.error(new IllegalArgumentException("Authenticated user is required")))
                .map(this::actor);
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

    private String message(ReleaseRequest request) {
        return request == null ? null : request.message();
    }

    public record ReleaseRequest(String message) {}
}
