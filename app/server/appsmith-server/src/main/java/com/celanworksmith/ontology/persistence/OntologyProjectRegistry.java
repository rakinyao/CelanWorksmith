package com.celanworksmith.ontology.persistence;

import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public interface OntologyProjectRegistry {
    Flux<OntologyProjectSummary> list();

    Mono<OntologyProjectDefinition> find(String projectId, String version);

    Mono<OntologyProjectDefinition> save(OntologyProjectDefinition definition);
}
