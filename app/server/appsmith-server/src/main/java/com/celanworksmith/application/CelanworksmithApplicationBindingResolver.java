package com.celanworksmith.application;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.ontology.persistence.OntologyProjectRegistry;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import reactor.core.publisher.Mono;

public class CelanworksmithApplicationBindingResolver {
    public record ResolvedBinding(OntologyProjectDefinition project, String providerId) {}

    private final CelanworksmithApplicationBindingRepository bindingRepository;
    private final OntologyProjectRegistry projectRegistry;

    public CelanworksmithApplicationBindingResolver(
            CelanworksmithApplicationBindingRepository bindingRepository, OntologyProjectRegistry projectRegistry) {
        this.bindingRepository = bindingRepository;
        this.projectRegistry = projectRegistry;
    }

    public Mono<ResolvedBinding> resolve(String applicationId) {
        return bindingRepository
                .get(applicationId)
                .switchIfEmpty(Mono.error(new CelanWorksmithException(
                        CelanWorksmithErrorCode.INVALID_ARGUMENT,
                        "Application has no ontology project binding: " + applicationId)))
                .flatMap(binding -> {
                    if (!CelanworksmithApplicationBindingService.MONGODB_READONLY_PROVIDER.equals(
                            binding.providerId())) {
                        return Mono.error(new CelanWorksmithException(
                                CelanWorksmithErrorCode.INVALID_ARGUMENT,
                                "Unsupported ontology provider: " + binding.providerId()));
                    }
                    return projectRegistry
                            .find(binding.projectId(), binding.projectVersion())
                            .switchIfEmpty(Mono.error(new CelanWorksmithException(
                                    CelanWorksmithErrorCode.ONTOLOGY_PROJECT_NOT_FOUND,
                                    "Ontology project version not found: " + binding.projectId() + ":"
                                            + binding.projectVersion())))
                            .map(project -> new ResolvedBinding(project, binding.providerId()));
                });
    }
}
