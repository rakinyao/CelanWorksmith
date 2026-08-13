package com.celanworksmith.ontology.datasource;

import reactor.core.publisher.Mono;

public class DemoOntologyProjectBootstrap implements OntologyProjectImportSource {
    private static final String PROVIDER_ID = "demo-mongo-readonly";
    private static final String RELEASE_ID = "builtin-demo";

    private final LocalYamlOntologyProjectImporter yamlImporter;
    private final OntologySnapshotService snapshotService;
    private final byte[] metadata;

    public DemoOntologyProjectBootstrap(LocalYamlOntologyProjectImporter yamlImporter, byte[] metadata) {
        this.yamlImporter = yamlImporter;
        this.snapshotService = yamlImporter.snapshotService();
        this.metadata = metadata.clone();
    }

    public Mono<OntologyMetadataSnapshot> importDemo(String actor) {
        return Mono.fromSupplier(() -> yamlImporter.parseDefinition(metadata))
                .flatMap(definition -> snapshotService.createSnapshot(
                        new ImportedOntologyProject(definition, "demo", RELEASE_ID, PROVIDER_ID, actor)));
    }

    @Override
    public Mono<OntologyMetadataSnapshot> importProject(OntologyProjectImportRequest request) {
        if (request == null || request.sourceKind() != Kind.DEMO) {
            return Mono.error(new IllegalArgumentException("Demo importer requires a demo request"));
        }
        if (request.importedBy() == null || request.importedBy().isBlank()) {
            return Mono.error(new IllegalArgumentException("Import actor is required"));
        }
        return importDemo(request.importedBy());
    }
}
