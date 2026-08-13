package com.celanworksmith.ontology;

import com.celanworksmith.CelanWorksmithExceptionHandler;
import com.celanworksmith.ontology.controller.OntologyProjectController;
import com.celanworksmith.ontology.persistence.OntologyProjectRegistry;
import com.celanworksmith.ontology.persistence.OntologyProjectSummary;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.ontology.project.OntologyProjectYamlImporter;
import com.celanworksmith.ontology.project.OntologyProjectZipFixtures;
import com.celanworksmith.ontology.service.OntologyProjectService;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.test.web.reactive.server.WebTestClient;
import org.springframework.web.reactive.function.BodyInserters;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.io.IOException;
import java.io.InputStream;

class OntologyProjectControllerTest {
    private final InMemoryRegistry registry = new InMemoryRegistry();
    private final WebTestClient client = WebTestClient.bindToController(new OntologyProjectController(
                    new OntologyProjectService(registry, new OntologyProjectYamlImporter())))
            .controllerAdvice(new CelanWorksmithExceptionHandler())
            .build();

    @Test
    void listsTheDemoProject() {
        registry.save(readDefinition()).block();

        client.get()
                .uri("/api/v1/celanworksmith/ontology/projects")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data[0].projectId")
                .isEqualTo("celanworksmith-demo");
    }

    @Test
    void importsValidZipAndRejectsDuplicateVersion() {
        client.post()
                .uri("/api/v1/celanworksmith/ontology/projects/import")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(zipBody().build()))
                .exchange()
                .expectStatus()
                .isCreated();

        client.post()
                .uri("/api/v1/celanworksmith/ontology/projects/import")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(zipBody().build()))
                .exchange()
                .expectStatus()
                .isEqualTo(409)
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ONTOLOGY_PROJECT_VERSION_EXISTS");
    }

    @Test
    void returnsStructuredNotFoundError() {
        client.get()
                .uri("/api/v1/celanworksmith/ontology/projects/missing/versions/1.0.0")
                .exchange()
                .expectStatus()
                .isNotFound()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("ONTOLOGY_PROJECT_NOT_FOUND");
    }

    @Test
    void refusesInvalidProject() {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("file", new ByteArrayResource(bytes(OntologyProjectZipFixtures.invalidZip())))
                .filename("invalid.zip");

        client.post()
                .uri("/api/v1/celanworksmith/ontology/projects/import")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(body.build()))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVALID_ARGUMENT");
    }

    @Test
    void rejectsAnUploadLargerThanTheConfiguredLimit() {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("file", new ByteArrayResource(new byte[10_485_761])).filename("oversized.zip");

        client.post()
                .uri("/api/v1/celanworksmith/ontology/projects/import")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(body.build()))
                .exchange()
                .expectStatus()
                .isBadRequest()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("INVALID_ARGUMENT");
    }

    private MultipartBodyBuilder zipBody() {
        MultipartBodyBuilder body = new MultipartBodyBuilder();
        body.part("file", new ByteArrayResource(bytes(OntologyProjectZipFixtures.validZip())))
                .filename("project.zip");
        return body;
    }

    private static byte[] bytes(InputStream input) {
        try {
            return input.readAllBytes();
        } catch (IOException exception) {
            throw new IllegalStateException(exception);
        }
    }

    private static OntologyProjectDefinition readDefinition() {
        return new OntologyProjectYamlImporter().importZip(OntologyProjectZipFixtures.validZip());
    }

    private static final class InMemoryRegistry implements OntologyProjectRegistry {
        private OntologyProjectDefinition definition;

        @Override
        public Flux<OntologyProjectSummary> list() {
            return definition == null ? Flux.empty() : Flux.just(OntologyProjectSummary.from(definition));
        }

        @Override
        public Mono<OntologyProjectDefinition> find(String projectId, String version) {
            return definition != null
                            && definition.projectId().equals(projectId)
                            && definition.version().equals(version)
                    ? Mono.just(definition)
                    : Mono.empty();
        }

        @Override
        public Mono<OntologyProjectDefinition> save(OntologyProjectDefinition value) {
            if (definition != null) return Mono.error(new IllegalStateException("duplicate"));
            definition = value;
            return Mono.just(value);
        }
    }
}
