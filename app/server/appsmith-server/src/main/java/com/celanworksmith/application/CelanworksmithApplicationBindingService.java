package com.celanworksmith.application;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.ontology.persistence.OntologyProjectRegistry;
import reactor.core.publisher.Mono;

public class CelanworksmithApplicationBindingService {
    public static final String MONGODB_READONLY_PROVIDER = "mongodb-readonly";
    private final CelanworksmithApplicationBindingRepository repository;
    private final OntologyProjectRegistry projectRegistry;

    public CelanworksmithApplicationBindingService(
            CelanworksmithApplicationBindingRepository repository, OntologyProjectRegistry projectRegistry) {
        this.repository = repository;
        this.projectRegistry = projectRegistry;
    }

    public Mono<CelanworksmithApplicationBinding> get(String applicationId) {
        return repository.get(applicationId);
    }

    public Mono<CelanworksmithApplicationBinding> bind(
            String applicationId, CelanworksmithApplicationBindingRequest request) {
        if (request == null
                || isBlank(applicationId)
                || isBlank(request.projectId())
                || isBlank(request.projectVersion())
                || !MONGODB_READONLY_PROVIDER.equals(request.providerId())) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT,
                    "applicationId, projectId, projectVersion and providerId=mongodb-readonly are required"));
        }
        return projectRegistry
                .find(request.projectId(), request.projectVersion())
                .switchIfEmpty(Mono.error(new CelanWorksmithException(
                        CelanWorksmithErrorCode.ONTOLOGY_PROJECT_NOT_FOUND,
                        "Ontology project version not found: " + request.projectId() + ":" + request.projectVersion())))
                .then(repository.upsert(new CelanworksmithApplicationBinding(
                        applicationId, request.projectId(), request.projectVersion(), request.providerId())));
    }

    public Mono<Void> unbind(String applicationId) {
        return repository.delete(applicationId);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
