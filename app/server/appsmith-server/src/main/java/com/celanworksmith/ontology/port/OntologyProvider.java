package com.celanworksmith.ontology.port;

import com.celanworksmith.ontology.context.CelanworksmithOntologyContext;
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

    default Mono<List<ObjectTypeDTO>> getObjectTypes(CelanworksmithOntologyContext context) {
        return getObjectTypes();
    }

    default Mono<ObjectTypeDTO> getObjectType(String typeId, CelanworksmithOntologyContext context) {
        return getObjectType(typeId);
    }

    default Mono<List<LinkTypeDTO>> getLinkTypes(String sourceTypeId, CelanworksmithOntologyContext context) {
        return getLinkTypes(sourceTypeId);
    }

    default Mono<List<FunctionDTO>> getFunctions(CelanworksmithOntologyContext context) {
        return getFunctions();
    }

    default Mono<List<ActionTypeDTO>> getActions(String objectTypeId, CelanworksmithOntologyContext context) {
        return getActions(objectTypeId);
    }
}
