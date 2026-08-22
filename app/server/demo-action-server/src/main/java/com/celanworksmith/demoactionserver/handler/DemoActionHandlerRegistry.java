package com.celanworksmith.demoactionserver.handler;

import com.celanworksmith.demoactionserver.api.ActionExecutionService.DeclaredDomainException;
import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol;
import org.springframework.stereotype.Component;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class DemoActionHandlerRegistry {
    private final Map<String, DemoActionHandler> handlers;

    public DemoActionHandlerRegistry(List<DemoActionHandler> actionHandlers) {
        this.handlers = actionHandlers.stream().collect(Collectors.toUnmodifiableMap(
                DemoActionHandler::actionId,
                Function.identity(),
                (first, duplicate) -> {
                    throw new IllegalStateException("More than one handler is registered for action " + first.actionId());
                }));
    }

    public Mono<DemoActionHandler> resolve(String actionId, String auditId) {
        DemoActionHandler handler = handlers.get(actionId);
        if (handler != null) {
            return Mono.just(handler);
        }
        return Mono.error(new DeclaredDomainException(new OntologyActionServerProtocol.DomainFailure(
                OntologyActionServerProtocol.V1,
                auditId,
                "UNKNOWN_ACTION",
                "No handler is registered for action " + actionId + ".")));
    }
}
