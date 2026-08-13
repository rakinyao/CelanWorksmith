package com.celanworksmith.application;

import reactor.core.publisher.Mono;

public interface CelanworksmithApplicationBindingRepository {
    Mono<CelanworksmithApplicationBinding> get(String applicationId);

    Mono<CelanworksmithApplicationBinding> upsert(CelanworksmithApplicationBinding binding);

    Mono<Void> delete(String applicationId);
}
