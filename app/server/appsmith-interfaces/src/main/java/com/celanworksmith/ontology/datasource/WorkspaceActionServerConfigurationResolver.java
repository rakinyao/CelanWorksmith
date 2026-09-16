package com.celanworksmith.ontology.datasource;

import reactor.core.publisher.Mono;

public interface WorkspaceActionServerConfigurationResolver {
    Mono<OntologyActionServerClient> resolveRequired(String workspaceId, String adapterId, String adapterVersion);
}
