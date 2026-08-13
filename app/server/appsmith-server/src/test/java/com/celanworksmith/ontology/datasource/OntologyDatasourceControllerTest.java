package com.celanworksmith.ontology.datasource;

import com.celanworksmith.CelanWorksmithExceptionHandler;
import com.celanworksmith.ontology.datasource.dto.ImportOntologyDatasourceRequest;
import com.celanworksmith.ontology.datasource.dto.OntologyDatasourceSummary;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.reactive.server.WebTestClient;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OntologyDatasourceControllerTest {
    @Mock
    OntologyDatasourceService service;

    private WebTestClient client;

    @BeforeEach
    void setUp() {
        client = WebTestClient.bindToController(new OntologyDatasourceController(service))
                .controllerAdvice(new CelanWorksmithExceptionHandler())
                .build();
    }

    @Test
    void routesWorkspaceDatasourceLifecycleOperations() {
        OntologyDatasourceSummary summary = new OntologyDatasourceSummary(
                "datasource-1",
                "Supply Chain",
                "supply-chain",
                "1.0.0",
                "local-yaml",
                "demo-mongo-readonly",
                "sha256:" + "a".repeat(64),
                "ACTIVE",
                "Initial import");
        when(service.importDatasource(any())).thenReturn(Mono.just(summary));
        when(service.listDatasourceCandidates("workspace-1")).thenReturn(Flux.just(summary));
        when(service.getDatasourceSummary("datasource-1")).thenReturn(Mono.just(summary));
        when(service.stopDatasource("datasource-1")).thenReturn(Mono.just(summary));
        when(service.deleteDatasource("datasource-1")).thenReturn(Mono.empty());

        client.post()
                .uri("/api/v1/celanworksmith/ontology/datasources")
                .bodyValue(new ImportOntologyDatasourceRequest("workspace-1", "Supply Chain", null, "Initial import"))
                .exchange()
                .expectStatus()
                .isCreated();
        client.get()
                .uri("/api/v1/celanworksmith/ontology/datasources?workspaceId=workspace-1")
                .exchange()
                .expectStatus()
                .isOk()
                .expectBody()
                .jsonPath("$.data[0].datasourceId")
                .isEqualTo("datasource-1");
        client.get()
                .uri("/api/v1/celanworksmith/ontology/datasources/datasource-1")
                .exchange()
                .expectStatus()
                .isOk();
        client.post()
                .uri("/api/v1/celanworksmith/ontology/datasources/datasource-1/stop")
                .exchange()
                .expectStatus()
                .isOk();
        client.delete()
                .uri("/api/v1/celanworksmith/ontology/datasources/datasource-1")
                .exchange()
                .expectStatus()
                .isNoContent();

        verify(service).listDatasourceCandidates("workspace-1");
        verify(service).getDatasourceSummary("datasource-1");
        verify(service).stopDatasource("datasource-1");
        verify(service).deleteDatasource("datasource-1");
    }
}
