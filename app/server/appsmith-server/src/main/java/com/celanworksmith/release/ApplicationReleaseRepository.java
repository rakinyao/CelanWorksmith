package com.celanworksmith.release;

import com.celanworksmith.release.model.ApplicationReleaseSnapshot;
import com.celanworksmith.release.model.ApplicationReleaseStatus;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.time.Instant;

public interface ApplicationReleaseRepository {
    Mono<ApplicationReleaseSnapshot> save(ApplicationReleaseSnapshot snapshot);

    Mono<ApplicationReleaseSnapshot> findById(String releaseId);

    Flux<ApplicationReleaseSnapshot> findByApplicationId(String applicationId);

    Mono<ApplicationReleaseSnapshot> findActive(String applicationId);

    Mono<ActivationResult> activate(String applicationId, String releaseId, String actor, Instant activatedAt);

    Mono<ApplicationReleaseSnapshot> transitionStatus(String releaseId, ApplicationReleaseStatus status);

    record ActivationResult(String previousReleaseId, String releaseId) {}
}
