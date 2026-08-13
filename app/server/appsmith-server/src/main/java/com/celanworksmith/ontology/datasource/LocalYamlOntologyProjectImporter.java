package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.ontology.project.OntologyProjectValidator;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import reactor.core.publisher.Mono;

import java.io.IOException;

public class LocalYamlOntologyProjectImporter implements OntologyProjectImportSource {
    private final OntologySnapshotService snapshotService;
    private final YAMLMapper yamlMapper;
    private final OntologyProjectValidator validator;

    public LocalYamlOntologyProjectImporter(OntologySnapshotService snapshotService) {
        this(snapshotService, new YAMLMapper(), new OntologyProjectValidator());
    }

    LocalYamlOntologyProjectImporter(
            OntologySnapshotService snapshotService, YAMLMapper yamlMapper, OntologyProjectValidator validator) {
        this.snapshotService = snapshotService;
        this.yamlMapper = yamlMapper;
        this.validator = validator;
    }

    @Override
    public Kind sourceKind() {
        return Kind.LOCAL_YAML;
    }

    @Override
    public Mono<OntologyMetadataSnapshot> importProject(OntologyProjectImportRequest request) {
        if (request == null || request.sourceKind() != Kind.LOCAL_YAML) {
            return Mono.error(new IllegalArgumentException("Local YAML importer requires a local YAML request"));
        }
        return Mono.fromSupplier(() -> parseDefinition(request.metadata()))
                .flatMap(definition -> snapshotService.createSnapshot(new ImportedOntologyProject(
                        definition,
                        "local-yaml",
                        request.sourceReleaseId(),
                        required(request.runtimeProviderId(), "Runtime Provider ID"),
                        required(request.importedBy(), "Import actor"))));
    }

    OntologyProjectDefinition parseDefinition(byte[] metadata) {
        if (metadata == null || metadata.length == 0) {
            throw new IllegalArgumentException("Ontology YAML metadata is required");
        }
        try {
            OntologyProjectDefinition definition = yamlMapper.readValue(metadata, OntologyProjectDefinition.class);
            if (definition == null || !validator.validate(definition).isEmpty()) {
                throw new IllegalArgumentException("Ontology YAML metadata is invalid");
            }
            return definition;
        } catch (IOException | NullPointerException exception) {
            throw new IllegalArgumentException("Ontology YAML metadata is invalid", exception);
        }
    }

    OntologySnapshotService snapshotService() {
        return snapshotService;
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required");
        }
        return value;
    }
}
