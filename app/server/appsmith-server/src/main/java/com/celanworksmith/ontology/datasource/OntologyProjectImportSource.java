package com.celanworksmith.ontology.datasource;

import reactor.core.publisher.Mono;

public interface OntologyProjectImportSource {
    enum Kind {
        LOCAL_YAML,
        PLATFORM_RELEASE,
        DEMO
    }

    Kind sourceKind();

    Mono<OntologyMetadataSnapshot> importProject(OntologyProjectImportRequest request);
}
