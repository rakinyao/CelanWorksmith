package com.celanworksmith.runtime.port;

import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.runtime.context.CelanworksmithRuntimeContext;
import com.celanworksmith.runtime.dto.ActionExecutionRequest;
import com.celanworksmith.runtime.dto.ActionResult;
import com.celanworksmith.runtime.dto.FunctionExecutionRequest;
import com.celanworksmith.runtime.dto.ObjectInstanceDTO;
import com.celanworksmith.runtime.dto.ObjectSetQuery;
import com.celanworksmith.runtime.dto.ObjectSetResult;
import com.celanworksmith.runtime.dto.ReasoningRequest;
import com.celanworksmith.runtime.dto.ReasoningResult;
import reactor.core.publisher.Mono;

import java.util.Map;

public interface RuntimeProvider {
    record RuntimeMetadataCapabilities(Map<String, Map<String, String>> objectProperties) {
        public RuntimeMetadataCapabilities {
            if (objectProperties == null) {
                objectProperties = Map.of();
            } else {
                objectProperties = objectProperties.entrySet().stream()
                        .collect(java.util.stream.Collectors.toUnmodifiableMap(
                                Map.Entry::getKey, entry -> Map.copyOf(entry.getValue())));
            }
        }
    }

    default String providerId() {
        return "unconfigured";
    }

    default Mono<RuntimeMetadataCapabilities> metadataCapabilities() {
        return Mono.just(new RuntimeMetadataCapabilities(Map.of()));
    }

    Mono<ObjectSetResult> queryObjects(String typeId, ObjectSetQuery query);

    default Mono<ObjectSetResult> queryObjects(
            OntologyProjectDefinition definition, String typeId, ObjectSetQuery query) {
        return queryObjects(typeId, query);
    }

    Mono<ObjectInstanceDTO> getObject(String typeId, String instanceId);

    Mono<ObjectSetResult> getLinks(String typeId, String instanceId, String linkTypeId, ObjectSetQuery query);

    default Mono<ObjectSetResult> queryObjects(
            CelanworksmithRuntimeContext context, String typeId, ObjectSetQuery query) {
        return queryObjects(typeId, query);
    }

    default Mono<ObjectInstanceDTO> getObject(CelanworksmithRuntimeContext context, String typeId, String instanceId) {
        return getObject(typeId, instanceId);
    }

    default Mono<ObjectSetResult> getLinks(
            CelanworksmithRuntimeContext context,
            String typeId,
            String instanceId,
            String linkTypeId,
            ObjectSetQuery query) {
        return getLinks(typeId, instanceId, linkTypeId, query);
    }

    Mono<ActionResult> executeAction(String actionId, ActionExecutionRequest request);

    default Mono<ActionResult> executeAction(
            CelanworksmithRuntimeContext context, String actionId, ActionExecutionRequest request) {
        return executeAction(actionId, request);
    }

    Mono<Object> executeFunction(String functionId, FunctionExecutionRequest request);

    default Mono<Object> executeFunction(
            CelanworksmithRuntimeContext context, String functionId, FunctionExecutionRequest request) {
        return executeFunction(functionId, request);
    }

    Mono<ReasoningResult> reason(ReasoningRequest request);
}
