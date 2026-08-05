package com.celanworksmith.ontology.controller;

import com.appsmith.server.dtos.ResponseDTO;
import com.celanworksmith.ontology.dto.ActionTypeDTO;
import com.celanworksmith.ontology.dto.FunctionDTO;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.port.OntologyProvider;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

import java.util.List;

@RestController
@RequestMapping("/api/v1/celanworksmith/ontology")
public class OntologyController {
    private final OntologyProvider ontologyProvider;

    public OntologyController(OntologyProvider ontologyProvider) {
        this.ontologyProvider = ontologyProvider;
    }

    @GetMapping("/object-types")
    public Mono<ResponseDTO<List<ObjectTypeDTO>>> getObjectTypes() {
        return ontologyProvider.getObjectTypes().map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/object-types/{typeId}")
    public Mono<ResponseDTO<ObjectTypeDTO>> getObjectType(@PathVariable String typeId) {
        return ontologyProvider.getObjectType(typeId).map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/link-types")
    public Mono<ResponseDTO<List<LinkTypeDTO>>> getLinkTypes(
            @RequestParam(required = false) String sourceTypeId) {
        return ontologyProvider.getLinkTypes(sourceTypeId).map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/functions")
    public Mono<ResponseDTO<List<FunctionDTO>>> getFunctions() {
        return ontologyProvider.getFunctions().map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/actions")
    public Mono<ResponseDTO<List<ActionTypeDTO>>> getActions(
            @RequestParam(required = false) String objectTypeId) {
        return ontologyProvider.getActions(objectTypeId).map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }
}
