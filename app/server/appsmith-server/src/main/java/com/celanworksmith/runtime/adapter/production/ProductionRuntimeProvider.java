package com.celanworksmith.runtime.adapter.production;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.runtime.dto.ActionExecutionRequest;
import com.celanworksmith.runtime.dto.ActionResult;
import com.celanworksmith.runtime.dto.FunctionExecutionRequest;
import com.celanworksmith.runtime.dto.ObjectInstanceDTO;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.celanworksmith.runtime.dto.ObjectSetResult;
import com.celanworksmith.runtime.dto.ReasoningRequest;
import com.celanworksmith.runtime.dto.ReasoningResult;
import com.celanworksmith.runtime.port.RuntimeProvider;
import reactor.core.publisher.Mono;

public class ProductionRuntimeProvider implements RuntimeProvider {
    private <T> Mono<T> notConfigured() {
        return Mono.error(new CelanWorksmithException(
                CelanWorksmithErrorCode.PROVIDER_NOT_CONFIGURED, "Production runtime provider is not configured"));
    }

    @Override
    public Mono<ObjectSetResult> queryObjects(String typeId, ObjectSetQuery query) {
        return notConfigured();
    }

    @Override
    public Mono<ObjectInstanceDTO> getObject(String typeId, String instanceId) {
        return notConfigured();
    }

    @Override
    public Mono<ObjectSetResult> getLinks(String typeId, String instanceId, String linkTypeId, ObjectSetQuery query) {
        return notConfigured();
    }

    @Override
    public Mono<ActionResult> executeAction(String actionId, ActionExecutionRequest request) {
        return notConfigured();
    }

    @Override
    public Mono<Object> executeFunction(String functionId, FunctionExecutionRequest request) {
        return notConfigured();
    }

    @Override
    public Mono<ReasoningResult> reason(ReasoningRequest request) {
        return notConfigured();
    }
}
