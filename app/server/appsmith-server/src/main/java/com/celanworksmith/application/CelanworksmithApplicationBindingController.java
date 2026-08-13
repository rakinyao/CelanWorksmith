package com.celanworksmith.application;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.dtos.ResponseDTO;
import com.appsmith.server.solutions.ApplicationPermission;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/celanworksmith/applications/{applicationId}/ontology-binding")
public class CelanworksmithApplicationBindingController {
    private final ApplicationService applicationService;
    private final ApplicationPermission applicationPermission;
    private final CelanworksmithApplicationBindingService service;

    public CelanworksmithApplicationBindingController(
            ApplicationService applicationService,
            ApplicationPermission applicationPermission,
            CelanworksmithApplicationBindingService service) {
        this.applicationService = applicationService;
        this.applicationPermission = applicationPermission;
        this.service = service;
    }

    @GetMapping
    public Mono<ResponseDTO<Object>> get(@PathVariable String applicationId) {
        AclPermission permission = applicationPermission.getReadPermission();
        return applicationService
                .findById(applicationId, permission)
                .switchIfEmpty(Mono.error(new com.celanworksmith.CelanWorksmithException(
                        com.celanworksmith.CelanWorksmithErrorCode.APPLICATION_NOT_FOUND,
                        "Application not found: " + applicationId)))
                .flatMap(ignored -> service.get(applicationId))
                .map(binding -> new ResponseDTO<Object>(HttpStatus.OK, binding))
                .switchIfEmpty(Mono.just(new ResponseDTO<Object>(HttpStatus.OK, Map.of("bound", false))));
    }

    @PutMapping
    public Mono<ResponseDTO<CelanworksmithApplicationBinding>> put(
            @PathVariable String applicationId, @RequestBody CelanworksmithApplicationBindingRequest request) {
        return applicationService
                .findById(applicationId, applicationPermission.getEditPermission())
                .switchIfEmpty(Mono.error(new com.celanworksmith.CelanWorksmithException(
                        com.celanworksmith.CelanWorksmithErrorCode.APPLICATION_NOT_FOUND,
                        "Application not found: " + applicationId)))
                .flatMap(ignored -> service.bind(applicationId, request))
                .map(binding -> new ResponseDTO<>(HttpStatus.OK, binding));
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public Mono<Void> delete(@PathVariable String applicationId) {
        return applicationService
                .findById(applicationId, applicationPermission.getEditPermission())
                .switchIfEmpty(Mono.error(new com.celanworksmith.CelanWorksmithException(
                        com.celanworksmith.CelanWorksmithErrorCode.APPLICATION_NOT_FOUND,
                        "Application not found: " + applicationId)))
                .flatMap(ignored -> service.unbind(applicationId));
    }
}
