package com.celanworksmith.runtime.controller;

import com.appsmith.server.dtos.ResponseDTO;
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

    public RuntimeController(RuntimeProvider runtimeProvider, ObjectMapper objectMapper) {
        this.runtimeProvider = runtimeProvider;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/objects/{typeId}")
    public Mono<ResponseDTO<ObjectSetResult>> queryObjects(
            @PathVariable String typeId,
            @RequestParam(required = false) String filter,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection,
            @RequestParam(required = false) String offset,
            @RequestParam(required = false) String limit) {
        ObjectSetQuery query = parser().parse(filter, sortBy, sortDirection, offset, limit);
        return runtimeProvider.queryObjects(typeId, query).map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @GetMapping("/objects/{typeId}/{instanceId}")
    public Mono<ResponseDTO<ObjectInstanceDTO>> getObject(
            @PathVariable String typeId, @PathVariable String instanceId) {
        return runtimeProvider.getObject(typeId, instanceId).map(data -> new ResponseDTO<>(HttpStatus.OK, data));
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
            @RequestParam(required = false) String limit) {
        ObjectSetQuery query = parser().parse(filter, sortBy, sortDirection, offset, limit);
        return runtimeProvider.getLinks(typeId, instanceId, linkTypeId, query)
                .map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @PostMapping("/actions/{actionId}/execute")
    public Mono<ResponseDTO<ActionResult>> executeAction(
            @PathVariable String actionId, @RequestBody ActionExecutionRequest request) {
        return runtimeProvider.executeAction(actionId, request).map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @PostMapping("/functions/{functionId}/execute")
    public Mono<ResponseDTO<Object>> executeFunction(
            @PathVariable String functionId, @RequestBody FunctionExecutionRequest request) {
        return runtimeProvider.executeFunction(functionId, request).map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    @PostMapping("/reasoning")
    public Mono<ResponseDTO<ReasoningResult>> reason(@RequestBody ReasoningRequest request) {
        return runtimeProvider.reason(request).map(data -> new ResponseDTO<>(HttpStatus.OK, data));
    }

    private CelanWorksmithQueryParser parser() {
        return new CelanWorksmithQueryParser(objectMapper);
    }
}
