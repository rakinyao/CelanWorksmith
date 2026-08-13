package com.celanworksmith.ontology.service;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.ontology.persistence.OntologyProjectRegistry;
import com.celanworksmith.ontology.persistence.OntologyProjectSummary;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.ontology.project.OntologyProjectYamlImporter;
import org.springframework.core.io.buffer.DataBufferLimitException;
import org.springframework.core.io.buffer.DataBufferUtils;
import org.springframework.http.codec.multipart.Part;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

public class OntologyProjectService {
    private static final int MAX_UPLOAD_BYTES = 10_485_760;
    private final OntologyProjectRegistry registry;
    private final OntologyProjectYamlImporter importer;

    public OntologyProjectService(OntologyProjectRegistry registry, OntologyProjectYamlImporter importer) {
        this.registry = registry;
        this.importer = importer;
    }

    public Flux<OntologyProjectSummary> list() {
        return registry.list();
    }

    public Flux<OntologyProjectSummary> versions(String projectId) {
        return registry.list().filter(summary -> summary.projectId().equals(projectId));
    }

    public Mono<OntologyProjectDefinition> get(String projectId, String version) {
        return registry.find(projectId, version)
                .switchIfEmpty(Mono.error(new CelanWorksmithException(
                        CelanWorksmithErrorCode.ONTOLOGY_PROJECT_NOT_FOUND,
                        "Ontology project version not found: " + projectId + ":" + version)));
    }

    public Mono<OntologyProjectSummary> importZip(Part file) {
        return DataBufferUtils.join(file.content(), MAX_UPLOAD_BYTES)
                .onErrorMap(
                        DataBufferLimitException.class,
                        ignored -> new CelanWorksmithException(
                                CelanWorksmithErrorCode.INVALID_ARGUMENT,
                                "Ontology project ZIP exceeds the maximum upload size"))
                .map(buffer -> {
                    try {
                        byte[] bytes = new byte[buffer.readableByteCount()];
                        buffer.read(bytes);
                        return importer.importZip(new java.io.ByteArrayInputStream(bytes));
                    } finally {
                        DataBufferUtils.release(buffer);
                    }
                })
                .flatMap(definition -> registry.find(definition.projectId(), definition.version())
                        .flatMap(existing -> Mono.<OntologyProjectDefinition>error(new CelanWorksmithException(
                                CelanWorksmithErrorCode.ONTOLOGY_PROJECT_VERSION_EXISTS,
                                "Ontology project version already exists: " + definition.projectId() + ":"
                                        + definition.version())))
                        .switchIfEmpty(registry.save(definition)))
                .map(OntologyProjectSummary::from);
    }
}
