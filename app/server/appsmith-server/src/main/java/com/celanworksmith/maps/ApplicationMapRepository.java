package com.celanworksmith.maps;

import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface ApplicationMapRepository {
    Mono<ApplicationMapResource> insert(ApplicationMapResource resource);

    Flux<ApplicationMapCatalogRecord> findByApplicationId(String applicationId);

    Mono<ApplicationMapResource> findByApplicationIdAndId(String applicationId, String resourceId);

    Mono<ApplicationMapCatalogRecord> findMetadataByApplicationIdAndId(String applicationId, String resourceId);
}
