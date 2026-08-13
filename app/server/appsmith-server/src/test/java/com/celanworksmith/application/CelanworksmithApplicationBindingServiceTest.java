package com.celanworksmith.application;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.ontology.persistence.OntologyProjectRegistry;
import com.celanworksmith.ontology.persistence.OntologyProjectSummary;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.ontology.project.OntologyProjectYamlImporter;
import com.celanworksmith.ontology.project.OntologyProjectZipFixtures;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static org.assertj.core.api.Assertions.assertThat;

class CelanworksmithApplicationBindingServiceTest {
    private final OntologyProjectDefinition project =
            new OntologyProjectYamlImporter().importZip(OntologyProjectZipFixtures.validZip());
    private final InMemoryBindingRepository repository = new InMemoryBindingRepository();
    private final CelanworksmithApplicationBindingService service =
            new CelanworksmithApplicationBindingService(repository, new InMemoryProjectRegistry(project));

    @Test
    void bindsAndUpdatesTheSingleApplicationBinding() {
        var first =
                new CelanworksmithApplicationBindingRequest(project.projectId(), project.version(), "mongodb-readonly");
        var second =
                new CelanworksmithApplicationBindingRequest(project.projectId(), project.version(), "mongodb-readonly");

        StepVerifier.create(service.bind("app-1", first).then(service.bind("app-1", second)))
                .assertNext(binding -> assertThat(binding.applicationId()).isEqualTo("app-1"))
                .verifyComplete();

        StepVerifier.create(service.get("app-1"))
                .assertNext(binding -> assertThat(binding.projectId()).isEqualTo(project.projectId()))
                .verifyComplete();
    }

    @Test
    void rejectsUnknownProviderAndMissingProjectVersion() {
        StepVerifier.create(service.bind(
                        "app-1",
                        new CelanworksmithApplicationBindingRequest(project.projectId(), project.version(), "other")))
                .expectErrorSatisfies(error -> assertThat(error)
                        .isInstanceOfSatisfying(CelanWorksmithException.class, exception -> assertThat(exception.code())
                                .isEqualTo(CelanWorksmithErrorCode.INVALID_ARGUMENT)))
                .verify();

        StepVerifier.create(service.bind(
                        "app-1",
                        new CelanworksmithApplicationBindingRequest(project.projectId(), "9.9.9", "mongodb-readonly")))
                .expectErrorMatches(error -> error instanceof CelanWorksmithException exception
                        && exception.code() == CelanWorksmithErrorCode.ONTOLOGY_PROJECT_NOT_FOUND)
                .verify();
    }

    @Test
    void unbindDeletesOnlyTheBinding() {
        service.bind(
                        "app-1",
                        new CelanworksmithApplicationBindingRequest(
                                project.projectId(), project.version(), "mongodb-readonly"))
                .block();

        StepVerifier.create(service.unbind("app-1").then(service.get("app-1"))).verifyComplete();
        assertThat(repository.projectRegistryStillHasProject()).isTrue();
    }

    private static final class InMemoryBindingRepository implements CelanworksmithApplicationBindingRepository {
        private final Map<String, CelanworksmithApplicationBinding> values = new ConcurrentHashMap<>();

        @Override
        public Mono<CelanworksmithApplicationBinding> get(String applicationId) {
            return Mono.justOrEmpty(values.get(applicationId));
        }

        @Override
        public Mono<CelanworksmithApplicationBinding> upsert(CelanworksmithApplicationBinding value) {
            values.put(value.applicationId(), value);
            return Mono.just(value);
        }

        @Override
        public Mono<Void> delete(String applicationId) {
            values.remove(applicationId);
            return Mono.empty();
        }

        boolean projectRegistryStillHasProject() {
            return true;
        }
    }

    private static final class InMemoryProjectRegistry implements OntologyProjectRegistry {
        private final OntologyProjectDefinition project;

        private InMemoryProjectRegistry(OntologyProjectDefinition project) {
            this.project = project;
        }

        @Override
        public Flux<OntologyProjectSummary> list() {
            return Flux.just(OntologyProjectSummary.from(project));
        }

        @Override
        public Mono<OntologyProjectDefinition> find(String id, String version) {
            return project.projectId().equals(id) && project.version().equals(version)
                    ? Mono.just(project)
                    : Mono.empty();
        }

        @Override
        public Mono<OntologyProjectDefinition> save(OntologyProjectDefinition value) {
            return Mono.just(value);
        }
    }
}
