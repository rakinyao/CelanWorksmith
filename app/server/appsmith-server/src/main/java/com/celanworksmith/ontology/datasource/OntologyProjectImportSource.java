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
        if (request != null && request.sourceKind() == Kind.LOCAL_RELEASE_JSON) {
            return Mono.error(
                    new IllegalArgumentException("Local Release JSON import requires an authorized import context"));
        }
        String actor = request == null
                        || request.importedBy() == null
                        || request.importedBy().isBlank()
                ? "legacy-import"
                : request.importedBy();
        String workspace = "legacy-import";
        try {
            return importProject(request, new OntologyProjectImportContext(workspace, actor));
        } catch (IllegalArgumentException exception) {
            return Mono.error(exception);
        }
    }

    default Mono<Void> cleanupSnapshot(OntologyMetadataSnapshot snapshot) {
        return Mono.empty();
    }
}
