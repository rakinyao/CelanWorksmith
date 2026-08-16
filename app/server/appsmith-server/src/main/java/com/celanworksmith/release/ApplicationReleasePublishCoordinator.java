package com.celanworksmith.release;

import com.appsmith.server.dtos.ResponseDTO;
import com.celanworksmith.release.model.ApplicationReleaseSnapshot;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Instant;
import java.util.List;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@Service
public class ApplicationReleasePublishCoordinator {
    private final ApplicationReleaseService releaseService;
    private final ApplicationReleaseProviderHealthGate healthGate;
    private final ApplicationReleaseRepository releaseRepository;

    public ApplicationReleasePublishCoordinator(
            ApplicationReleaseService releaseService,
            ApplicationReleaseProviderHealthGate healthGate,
            ApplicationReleaseRepository releaseRepository) {
        this.releaseService = releaseService;
        this.healthGate = healthGate;
        this.releaseRepository = releaseRepository;
    }

    public Mono<ResponseDTO<Boolean>> publishWithRelease(
            String applicationId, String actor, Supplier<Mono<ResponseDTO<Boolean>>> nativePublish) {
        return releaseService.preflight(applicationId, actor, null).flatMap(preflight -> {
            if (!preflight.valid()) {
                return Mono.just(blockingResponse(preflight.diagnostics()));
            }
            return releaseService
                    .createSnapshot(applicationId, actor, null)
                    .flatMap(snapshot -> publishNativeAndActivate(applicationId, actor, nativePublish, snapshot));
        });
    }

    private Mono<ResponseDTO<Boolean>> publishNativeAndActivate(
            String applicationId,
            String actor,
            Supplier<Mono<ResponseDTO<Boolean>>> nativePublish,
            ApplicationReleaseSnapshot snapshot) {
        return Mono.defer(nativePublish).flatMap(nativeResponse -> healthGate
                .check(snapshot.datasourcePins())
                .flatMap(diagnostics -> {
                    if (hasBlocking(diagnostics)) {
                        return Mono.just(blockingResponse(diagnostics));
                    }
                    return releaseRepository
                            .activate(applicationId, snapshot.releaseId(), actor, Instant.now())
                            .thenReturn(nativeResponse);
                }));
    }

    private ResponseDTO<Boolean> blockingResponse(List<ReleaseDiagnostic> diagnostics) {
        String message = diagnostics.stream()
                .map(diagnostic -> diagnostic.code() + " at " + diagnostic.path() + ": " + diagnostic.message())
                .collect(Collectors.joining("; "));
        return new ResponseDTO<>(HttpStatus.UNPROCESSABLE_ENTITY.value(), false, message, false);
    }

    private boolean hasBlocking(List<ReleaseDiagnostic> diagnostics) {
        return diagnostics.stream()
                .anyMatch(diagnostic -> diagnostic.severity() == ReleaseDiagnostic.Severity.BLOCKING);
    }
}
