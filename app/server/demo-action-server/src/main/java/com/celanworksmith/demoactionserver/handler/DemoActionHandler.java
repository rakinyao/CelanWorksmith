package com.celanworksmith.demoactionserver.handler;

import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol;
import reactor.core.publisher.Mono;

public interface DemoActionHandler {
    String actionId();

    Mono<OntologyActionServerProtocol.ExecuteSuccess> execute(
            OntologyActionServerProtocol.ExecuteRequest request, String auditId);
}
