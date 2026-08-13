package com.celanworksmith.runtime.controller;

import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.dtos.ResponseDTO;
import com.appsmith.server.solutions.ApplicationPermission;
import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.runtime.context.CelanworksmithRuntimeContext;
import com.celanworksmith.runtime.dto.ActionExecutionRequest;
import com.celanworksmith.runtime.dto.ActionResult;
import com.celanworksmith.runtime.dto.FunctionExecutionRequest;
import com.celanworksmith.runtime.dto.ObjectInstanceDTO;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.celanworksmith.runtime.dto.ObjectSetResult;
import com.celanworksmith.runtime.dto.ReasoningRequest;
import com.celanworksmith.runtime.dto.ReasoningResult;
import com.celanworksmith.runtime.port.RuntimeProvider;
import com.celanworksmith.web.CelanWorksmithQueryParser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api/v1/celanworksmith/runtime")
public class RuntimeController {
    private final RuntimeProvider runtimeProvider;
    private final ObjectMapper objectMapper;
    private final ApplicationService applicationService;
    private final ApplicationPermission applicationPermission;

    public RuntimeController(RuntimeProvider runtimeProvider, ObjectMapper objectMapper) {
        this(runtimeProvider, objectMapper, null, null);
    }

    @Autowired
    public RuntimeController(
            RuntimeProvider runtimeProvider,
            ObjectMapper objectMapper,
            ApplicationService applicationService,
            ApplicationPermission applicationPermission) {
        this.runtimeProvider = runtimeProvider;
        this.objectMapper = objectMapper;
        this.applicationService = applicationService;
        this.applicationPermission = applicationPermission;
    }

    @GetMapping("/objects/{typeId}")
    public Mono<ResponseDTO<ObjectSetResult>> queryObjects(
            @PathVariable String typeId,
            @RequestParam(required = false) String filter,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection,
            @RequestParam(required = false) String offset,
            @RequestParam(required = false) String limit,
            @RequestParam(required = false) String searchText,
            @RequestParam(required = false) String applicationId) {
        ObjectSetQuery query = parser().parse(filter, sortBy, sortDirection, offset, limit, searchText);
        return authorized(applicationId, () -> runtimeProvider.queryObjects(context(applicationId), typeId, query))
                .map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/objects/{typeId}/{instanceId}")
    public Mono<ResponseDTO<ObjectInstanceDTO>> getObject(
            @PathVariable String typeId,
            @PathVariable String instanceId,
            @RequestParam(required = false) String applicationId) {
        return authorized(applicationId, () -> runtimeProvider.getObject(context(applicationId), typeId, instanceId))
                .map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/objects/{typeId}/{instanceId}/links")
    public Mono<ResponseDTO<ObjectSetResult>> getLinks(
            @PathVariable String typeId,
            @PathVariable String instanceId,
            @RequestParam String linkTypeId,
            @RequestParam(required = false) String filter,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection,
            @RequestParam(required = false) String offset,
            @RequestParam(required = false) String limit,
            @RequestParam(required = false) String searchText,
            @RequestParam(required = false) String applicationId) {
        ObjectSetQuery query = parser().parse(filter, sortBy, sortDirection, offset, limit, searchText);
        return authorized(
                        applicationId,
                        () -> runtimeProvider.getLinks(context(applicationId), typeId, instanceId, linkTypeId, query))
                .map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @PostMapping("/actions/{actionId}/execute")
    public Mono<ResponseDTO<ActionResult>> executeAction(
            @PathVariable String actionId,
            @RequestBody ActionExecutionRequest request,
            @RequestParam(required = false) String applicationId) {
        return authorized(applicationId, () -> runtimeProvider.executeAction(context(applicationId), actionId, request))
                .map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @PostMapping("/functions/{functionId}/execute")
    public Mono<ResponseDTO<Object>> executeFunction(
            @PathVariable String functionId,
            @RequestBody FunctionExecutionRequest request,
            @RequestParam(required = false) String applicationId) {
        return authorized(
                        applicationId,
                        () -> runtimeProvider.executeFunction(context(applicationId), functionId, request))
                .map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @PostMapping("/reasoning")
    public Mono<ResponseDTO<ReasoningResult>> reason(@RequestBody ReasoningRequest request) {
        return runtimeProvider.reason(request).map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    private CelanWorksmithQueryParser parser() {
        return new CelanWorksmithQueryParser(objectMapper);
    }

    private CelanworksmithRuntimeContext context(String applicationId) {
        return applicationId == null || applicationId.isBlank()
                ? CelanworksmithRuntimeContext.legacy()
                : new CelanworksmithRuntimeContext(applicationId, false);
    }

    private <T> Mono<T> authorized(String applicationId, java.util.function.Supplier<Mono<T>> operation) {
        if (applicationId == null || applicationId.isBlank()) return Mono.defer(operation);
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
