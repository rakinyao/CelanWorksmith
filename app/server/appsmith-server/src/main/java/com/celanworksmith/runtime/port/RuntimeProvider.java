package com.celanworksmith.runtime.port;

import com.celanworksmith.runtime.dto.ActionExecutionRequest;
import com.celanworksmith.runtime.dto.ActionResult;
import com.celanworksmith.runtime.dto.FunctionExecutionRequest;
import com.celanworksmith.runtime.dto.ObjectInstanceDTO;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.celanworksmith.runtime.dto.ObjectSetResult;
import com.celanworksmith.runtime.dto.ReasoningRequest;
import com.celanworksmith.runtime.dto.ReasoningResult;
import reactor.core.publisher.Mono;

public interface RuntimeProvider {
    Mono<ObjectSetResult> queryObjects(String typeId, ObjectSetQuery query);

    Mono<ObjectInstanceDTO> getObject(String typeId, String instanceId);

    Mono<ObjectSetResult> getLinks(String typeId, String instanceId, String linkTypeId, ObjectSetQuery query);

    Mono<ActionResult> executeAction(String actionId, ActionExecutionRequest request);

    Mono<Object> executeFunction(String functionId, FunctionExecutionRequest request);

    Mono<ReasoningResult> reason(ReasoningRequest request);
}
