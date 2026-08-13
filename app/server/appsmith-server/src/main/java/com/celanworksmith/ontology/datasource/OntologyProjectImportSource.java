package com.celanworksmith.ontology.datasource;

import reactor.core.publisher.Mono;

public interface OntologyProjectImportSource {
    enum Kind {
        LOCAL_YAML,
        PLATFORM_RELEASE,
        DEMO
    }

    Mono<OntologyMetadataSnapshot> importProject(OntologyProjectImportRequest request);
}
