package com.celanworksmith.ontology.adapter.production;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.ontology.dto.ActionTypeDTO;
import com.celanworksmith.ontology.dto.FunctionDTO;
import com.celanworksmith.ontology.dto.LinkTypeDTO;
import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.port.OntologyProvider;
import reactor.core.publisher.Mono;

import java.util.List;

public class ProductionOntologyProvider implements OntologyProvider {
    private <T> Mono<T> notConfigured() {
        return Mono.error(new CelanWorksmithException(
                CelanWorksmithErrorCode.PROVIDER_NOT_CONFIGURED, "Production ontology provider is not configured"));
    }

    @Override
    public Mono<List<ObjectTypeDTO>> getObjectTypes() {
        return notConfigured();
    }

    @Override
    public Mono<ObjectTypeDTO> getObjectType(String typeId) {
        return notConfigured();
    }

    @Override
    public Mono<List<LinkTypeDTO>> getLinkTypes(String sourceTypeId) {
        return notConfigured();
    }

    @Override
    public Mono<List<FunctionDTO>> getFunctions() {
        return notConfigured();
    }

    @Override
    public Mono<List<ActionTypeDTO>> getActions(String objectTypeId) {
        return notConfigured();
    }
}
