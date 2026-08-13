package com.celanworksmith.ontology.bootstrap;

import com.celanworksmith.ontology.persistence.OntologyProjectRegistry;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.ontology.project.OntologyProjectYamlImporter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import java.util.zip.ZipEntry;
import java.util.zip.ZipOutputStream;

@Component
@ConditionalOnProperty(name = "celanworksmith.ontology.bootstrap.demo", havingValue = "true")
public class OntologyProjectBootstrap implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(OntologyProjectBootstrap.class);
    private static final String PROJECT_ID = "celanworksmith-demo";
    private static final String VERSION = "1.0.0";
    private static final String ROOT = "celanworksmith/ontology-projects/celanworksmith-demo/";
    private static final List<String> FILES = List.of(
            "ontology.yaml",
            "objects/Supplier.yaml",
            "objects/PurchaseOrder.yaml",
            "links/supplier_orders.yaml",
            "functions/CalculateDelayDays.yaml",
            "actions/UpdateProductionSchedule.yaml");

    private final OntologyProjectRegistry registry;
    private final OntologyProjectYamlImporter importer;

    public OntologyProjectBootstrap(OntologyProjectRegistry registry, OntologyProjectYamlImporter importer) {
        this.registry = registry;
        this.importer = importer;
    }

    @Override
    public void run(ApplicationArguments args) {
        registry.find(PROJECT_ID, VERSION)
                .switchIfEmpty(Mono.defer(this::loadAndSave))
                .doOnError(error -> log.error(
                        "Ontology demo project bootstrap failed for {}:{}; application will continue without bootstrap data",
                        PROJECT_ID,
                        VERSION,
                        error))
                .onErrorResume(error -> Mono.empty())
                .block();
    }

    private Mono<OntologyProjectDefinition> loadAndSave() {
        try {
            return registry.save(importer.importZip(new ByteArrayInputStream(buildZip())));
        } catch (IOException exception) {
            return Mono.error(exception);
        }
    }

    private byte[] buildZip() throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        try (ZipOutputStream zip = new ZipOutputStream(output)) {
            for (String path : FILES) {
                zip.putNextEntry(new ZipEntry(path));
                try (InputStream input = new ClassPathResource(ROOT + path).getInputStream()) {
                    input.transferTo(zip);
                }
                zip.closeEntry();
            }
        }
        return output.toByteArray();
    }
}
