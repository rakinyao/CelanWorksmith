package com.celanworksmith.ontology;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.domains.Application;
import com.appsmith.server.solutions.ApplicationPermission;
import com.celanworksmith.CelanWorksmithExceptionHandler;
import com.celanworksmith.application.CelanworksmithApplicationBinding;
import com.celanworksmith.application.CelanworksmithApplicationBindingRepository;
import com.celanworksmith.application.CelanworksmithApplicationBindingResolver;
import com.celanworksmith.ontology.adapter.mock.MockOntologyProvider;
import com.celanworksmith.ontology.adapter.project.OntologyProjectBackedProvider;
import com.celanworksmith.ontology.controller.OntologyController;
import com.celanworksmith.ontology.persistence.OntologyProjectRegistry;
import com.celanworksmith.ontology.persistence.OntologyProjectSummary;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.ontology.project.OntologyProjectYamlImporter;
import com.celanworksmith.ontology.project.OntologyProjectZipFixtures;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OntologyControllerBindingTest {
    @Mock
    ApplicationService applicationService;

    @Mock
    ApplicationPermission applicationPermission;

    @Mock
    AclPermission readPermission;

    @Test
    void applicationMetadataUsesBoundProjectAfterReadAcl() {
        OntologyProjectDefinition project =
                new OntologyProjectYamlImporter().importZip(OntologyProjectZipFixtures.validZip());
        var binding = new CelanworksmithApplicationBinding(
                "app-1", project.projectId(), project.version(), "mongodb-readonly");
        var repository = new SingleBindingRepository(binding);
        var resolver = new CelanworksmithApplicationBindingResolver(repository, new SingleProjectRegistry(project));
        var controller = new OntologyController(
                new OntologyProjectBackedProvider(new MockOntologyProvider(), resolver),
                applicationService,
                applicationPermission);
        when(applicationPermission.getReadPermission()).thenReturn(readPermission);
        when(applicationService.findById(eq("app-1"), eq(readPermission))).thenReturn(Mono.just(new Application()));

        WebTestClient.bindToController(controller)
                .controllerAdvice(new CelanWorksmithExceptionHandler())
                .build()
                .get()
                .uri("/api/v1/celanworksmith/ontology/object-types?applicationId=app-1")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data[?(@.id == 'PurchaseOrder')].properties.length()")
                .isEqualTo(1);
        verify(applicationService).findById("app-1", readPermission);
    }

    @Test
    void applicationMetadataRejectsMissingApplicationBeforeResolvingBinding() {
        var repository = new RecordingBindingRepository();
        var project = new OntologyProjectYamlImporter().importZip(OntologyProjectZipFixtures.validZip());
        var resolver = new CelanworksmithApplicationBindingResolver(repository, new SingleProjectRegistry(project));
        var controller = new OntologyController(
                new OntologyProjectBackedProvider(new MockOntologyProvider(), resolver),
                applicationService,
                applicationPermission);
        when(applicationPermission.getReadPermission()).thenReturn(readPermission);
        when(applicationService.findById(eq("missing"), eq(readPermission))).thenReturn(Mono.empty());

        WebTestClient.bindToController(controller)
                .controllerAdvice(new CelanWorksmithExceptionHandler())
                .build()
                .get()
                .uri("/api/v1/celanworksmith/ontology/object-types?applicationId=missing")
                .exchange()
                .expectStatus()
                .is4xxClientError()
                .expectBody()
                .jsonPath("$.code")
                .isEqualTo("APPLICATION_NOT_FOUND");
        assertThat(repository.reads).isZero();
    }

    private static class SingleBindingRepository implements CelanworksmithApplicationBindingRepository {
        private final CelanworksmithApplicationBinding binding;

        SingleBindingRepository(CelanworksmithApplicationBinding binding) {
            this.binding = binding;
        }

        @Override
        public Mono<CelanworksmithApplicationBinding> get(String applicationId) {
            return Mono.just(binding);
        }

        @Override
        public Mono<CelanworksmithApplicationBinding> upsert(CelanworksmithApplicationBinding value) {
            return Mono.just(value);
        }

        @Override
        public Mono<Void> delete(String applicationId) {
            return Mono.empty();
        }
    }

    private static final class RecordingBindingRepository implements CelanworksmithApplicationBindingRepository {
        private int reads;

        @Override
        public Mono<CelanworksmithApplicationBinding> get(String applicationId) {
            reads++;
            return Mono.empty();
        }

        @Override
        public Mono<CelanworksmithApplicationBinding> upsert(CelanworksmithApplicationBinding value) {
            return Mono.just(value);
        }

        @Override
        public Mono<Void> delete(String applicationId) {
            return Mono.empty();
        }
    }

    private static final class SingleProjectRegistry implements OntologyProjectRegistry {
        private final OntologyProjectDefinition project;

        SingleProjectRegistry(OntologyProjectDefinition project) {
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
