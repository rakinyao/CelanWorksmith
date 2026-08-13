package com.celanworksmith.ontology.controller;

import com.appsmith.server.dtos.ResponseDTO;
import com.celanworksmith.ontology.persistence.OntologyProjectSummary;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.ontology.service.OntologyProjectService;
import org.springframework.http.HttpStatus;
import org.springframework.http.codec.multipart.Part;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/v1/celanworksmith/ontology/projects")
public class OntologyProjectController {
    private final OntologyProjectService service;

    public OntologyProjectController(OntologyProjectService service) {
        this.service = service;
    }

    @GetMapping
    public Mono<ResponseDTO<List<OntologyProjectSummary>>> list() {
        return service.list().collectList().map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/{projectId}/versions")
    public Mono<ResponseDTO<List<OntologyProjectSummary>>> versions(@PathVariable String projectId) {
        return service.versions(projectId).collectList().map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/{projectId}/versions/{version}")
    public Mono<ResponseDTO<OntologyProjectDefinition>> get(
            @PathVariable String projectId, @PathVariable String version) {
        return service.get(projectId, version).map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @PostMapping("/import")
    @ResponseStatus(HttpStatus.CREATED)
    public Mono<ResponseDTO<OntologyProjectSummary>> importProject(@RequestPart("file") Part file) {
        return service.importZip(file).map(summary -> new ResponseDTO<>(HttpStatus.CREATED, summary));
    }
}
