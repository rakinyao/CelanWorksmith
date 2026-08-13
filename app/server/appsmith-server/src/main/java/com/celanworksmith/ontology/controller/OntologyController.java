package com.celanworksmith.ontology.controller;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.dtos.ResponseDTO;
import com.appsmith.server.solutions.ApplicationPermission;
import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.ontology.context.CelanworksmithOntologyContext;
import com.celanworksmith.ontology.dto.ActionTypeDTO;
import com.celanworksmith.ontology.dto.FunctionDTO;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.port.OntologyProvider;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final ApplicationService applicationService;
    private final ApplicationPermission applicationPermission;

    public OntologyController(OntologyProvider ontologyProvider) {
        this(ontologyProvider, null, null);
    }

    @Autowired
    public OntologyController(
            OntologyProvider ontologyProvider,
            ApplicationService applicationService,
            ApplicationPermission applicationPermission) {
        this.ontologyProvider = ontologyProvider;
        this.applicationService = applicationService;
        this.applicationPermission = applicationPermission;
    }

    @GetMapping("/object-types")
    public Mono<ResponseDTO<List<ObjectTypeDTO>>> getObjectTypes(@RequestParam(required = false) String applicationId) {
        return authorized(applicationId, () -> ontologyProvider.getObjectTypes(context(applicationId)))
                .map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/object-types/{typeId}")
    public Mono<ResponseDTO<ObjectTypeDTO>> getObjectType(
            @PathVariable String typeId, @RequestParam(required = false) String applicationId) {
        return authorized(applicationId, () -> ontologyProvider.getObjectType(typeId, context(applicationId)))
                .map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/link-types")
    public Mono<ResponseDTO<List<LinkTypeDTO>>> getLinkTypes(
            @RequestParam(required = false) String sourceTypeId, @RequestParam(required = false) String applicationId) {
        return authorized(applicationId, () -> ontologyProvider.getLinkTypes(sourceTypeId, context(applicationId)))
                .map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/functions")
    public Mono<ResponseDTO<List<FunctionDTO>>> getFunctions(@RequestParam(required = false) String applicationId) {
        return authorized(applicationId, () -> ontologyProvider.getFunctions(context(applicationId)))
                .map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/actions")
    public Mono<ResponseDTO<List<ActionTypeDTO>>> getActions(
            @RequestParam(required = false) String objectTypeId, @RequestParam(required = false) String applicationId) {
        return authorized(applicationId, () -> ontologyProvider.getActions(objectTypeId, context(applicationId)))
                .map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    private CelanworksmithOntologyContext context(String applicationId) {
        return applicationId == null || applicationId.isBlank()
                ? CelanworksmithOntologyContext.legacy()
                : new CelanworksmithOntologyContext(applicationId, false);
    }

    private <T> Mono<T> authorized(String applicationId, java.util.function.Supplier<Mono<T>> operation) {
        if (applicationId == null || applicationId.isBlank()) {
            return Mono.defer(operation);
        }
        if (applicationService == null || applicationPermission == null) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.INVALID_ARGUMENT, "Application ACL services are not configured"));
        }
        AclPermission permission = applicationPermission.getReadPermission();
        return applicationService
                .findById(applicationId, permission)
                .switchIfEmpty(Mono.error(new CelanWorksmithException(
                        CelanWorksmithErrorCode.APPLICATION_NOT_FOUND, "Application not found: " + applicationId)))
                .flatMap(ignored -> Mono.defer(operation));
    }
}
