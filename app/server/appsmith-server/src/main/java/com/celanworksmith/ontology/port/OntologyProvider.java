package com.celanworksmith.ontology.port;

import com.celanworksmith.ontology.dto.ActionTypeDTO;
import com.celanworksmith.ontology.dto.FunctionDTO;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import reactor.core.publisher.Mono;

import java.util.List;

public interface OntologyProvider {
    Mono<List<ObjectTypeDTO>> getObjectTypes();

    Mono<ObjectTypeDTO> getObjectType(String typeId);

    Mono<List<LinkTypeDTO>> getLinkTypes(String sourceTypeId);

    Mono<List<FunctionDTO>> getFunctions();

    Mono<List<ActionTypeDTO>> getActions(String objectTypeId);
}
