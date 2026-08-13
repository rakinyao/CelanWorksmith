package com.celanworksmith.ontology.datasource;

import com.appsmith.server.dtos.ResponseDTO;
import com.appsmith.server.services.SessionUserService;
import com.celanworksmith.ontology.datasource.dto.ImportOntologyDatasourceRequest;
import com.celanworksmith.ontology.datasource.dto.OntologyDatasourceSummary;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/v1/celanworksmith/ontology/datasources")
public class OntologyDatasourceController {
    private final OntologyDatasourceService service;
    private final SessionUserService sessionUserService;

    public OntologyDatasourceController(OntologyDatasourceService service, SessionUserService sessionUserService) {
        this.service = service;
        this.sessionUserService = sessionUserService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ResponseDTO<OntologyDatasourceSummary>> importDatasource(
            @RequestBody ImportOntologyDatasourceRequest request) {
        return sessionUserService
                .getCurrentUser()
                .map(user -> withAuthenticatedImportActor(request, user.getEmail()))
                .flatMap(service::importDatasource)
                .map(summary -> new ResponseDTO<>(HttpStatus.CREATED, summary));
    }

    private ImportOntologyDatasourceRequest withAuthenticatedImportActor(
            ImportOntologyDatasourceRequest request, String importedBy) {
        OntologyProjectImportRequest projectImportRequest = request.projectImportRequest();
        if (projectImportRequest == null) {
            return request;
        }
        return new ImportOntologyDatasourceRequest(
                request.workspaceId(),
                request.datasourceName(),
                new OntologyProjectImportRequest(
                        projectImportRequest.sourceKind(),
                        projectImportRequest.metadata(),
                        projectImportRequest.sourceReleaseId(),
                        projectImportRequest.runtimeProviderId(),
                        importedBy),
                request.changeNote());
    }

    @GetMapping
    public Mono<ResponseDTO<List<OntologyDatasourceSummary>>> listDatasourceCandidates(
            @RequestParam String workspaceId) {
        return service.listDatasourceCandidates(workspaceId)
                .collectList()
                .map(summaries -> new ResponseDTO<>(HttpStatus.OK, summaries));
    }

    @GetMapping("/{datasourceId}")
    public Mono<ResponseDTO<OntologyDatasourceSummary>> getDatasourceSummary(@PathVariable String datasourceId) {
        return service.getDatasourceSummary(datasourceId).map(summary -> new ResponseDTO<>(HttpStatus.OK, summary));
    }

    @PostMapping("/{datasourceId}/stop")
    public Mono<ResponseDTO<OntologyDatasourceSummary>> stopDatasource(@PathVariable String datasourceId) {
        return service.stopDatasource(datasourceId).map(summary -> new ResponseDTO<>(HttpStatus.OK, summary));
    }

    @DeleteMapping("/{datasourceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> deleteDatasource(@PathVariable String datasourceId) {
        return service.deleteDatasource(datasourceId);
    }
}
