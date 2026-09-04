package com.celanworksmith.ontology.datasource;

import reactor.core.publisher.Mono;

public interface OntologyProjectImportSource {
    enum Kind {
        LOCAL_YAML,
        PLATFORM_RELEASE,
        DEMO,
        LOCAL_RELEASE_JSON
    }

    Kind sourceKind();

    default Mono<OntologyMetadataSnapshot> importProject(
            OntologyProjectImportRequest request, OntologyProjectImportContext context) {
        return importProject(request);
    }

    default Mono<OntologyMetadataSnapshot> importProject(OntologyProjectImportRequest request) {
        String actor = request == null || request.importedBy() == null || request.importedBy().isBlank()
                ? "legacy-import"
                : request.importedBy();
        String workspace = "legacy-import";
        try {
            return importProject(request, new OntologyProjectImportContext(workspace, actor));
        } catch (IllegalArgumentException exception) {
            return Mono.error(exception);
        }
    }
}
