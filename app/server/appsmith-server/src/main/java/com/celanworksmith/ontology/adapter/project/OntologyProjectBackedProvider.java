package com.celanworksmith.ontology.adapter.project;

import com.celanworksmith.application.CelanworksmithApplicationBindingResolver;
import com.celanworksmith.ontology.context.CelanworksmithOntologyContext;
import com.celanworksmith.ontology.dto.*;
import com.celanworksmith.ontology.port.OntologyProvider;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import reactor.core.publisher.Mono;

import java.util.List;

public class OntologyProjectBackedProvider implements OntologyProvider {
    private final OntologyProvider legacyProvider;
    private final CelanworksmithApplicationBindingResolver resolver;

    public OntologyProjectBackedProvider(
            OntologyProvider legacyProvider, CelanworksmithApplicationBindingResolver resolver) {
        this.legacyProvider = legacyProvider;
        this.resolver = resolver;
    }

    private boolean useLegacy(CelanworksmithOntologyContext context) {
        return context == null || context.legacyDefault() || context.applicationId() == null;
    }

    private Mono<OntologyProjectDefinition> project(CelanworksmithOntologyContext context) {
        return resolver.resolve(context.applicationId())
                .map(CelanworksmithApplicationBindingResolver.ResolvedBinding::project);
    }

    @Override
    public Mono<List<ObjectTypeDTO>> getObjectTypes() {
        return legacyProvider.getObjectTypes();
    }

    @Override
    public Mono<ObjectTypeDTO> getObjectType(String typeId) {
        return legacyProvider.getObjectType(typeId);
    }

    @Override
    public Mono<List<LinkTypeDTO>> getLinkTypes(String sourceTypeId) {
        return legacyProvider.getLinkTypes(sourceTypeId);
    }

    @Override
    public Mono<List<FunctionDTO>> getFunctions() {
        return legacyProvider.getFunctions();
    }

    @Override
    public Mono<List<ActionTypeDTO>> getActions(String objectTypeId) {
        return legacyProvider.getActions(objectTypeId);
    }

    @Override
    public Mono<List<ObjectTypeDTO>> getObjectTypes(CelanworksmithOntologyContext context) {
        return useLegacy(context) ? getObjectTypes() : project(context).map(OntologyProjectDefinition::objectTypes);
    }

    @Override
    public Mono<ObjectTypeDTO> getObjectType(String typeId, CelanworksmithOntologyContext context) {
        return useLegacy(context)
                ? getObjectType(typeId)
                : project(context).flatMap(definition -> definition.objectTypes().stream()
                        .filter(value -> value.id().equals(typeId))
                        .findFirst()
                        .map(Mono::just)
                        .orElseGet(() -> Mono.error(new com.celanworksmith.CelanWorksmithException(
                                com.celanworksmith.CelanWorksmithErrorCode.OBJECT_TYPE_NOT_FOUND,
                                "Unknown object type: " + typeId))));
    }

    @Override
    public Mono<List<LinkTypeDTO>> getLinkTypes(String sourceTypeId, CelanworksmithOntologyContext context) {
        return useLegacy(context)
                ? getLinkTypes(sourceTypeId)
                : project(context).flatMap(definition -> {
                    if (sourceTypeId == null || sourceTypeId.isBlank()) return Mono.just(definition.linkTypes());
                    return Mono.just(definition.linkTypes().stream()
                            .filter(value -> value.sourceTypeId().equals(sourceTypeId))
                            .toList());
                });
    }

    @Override
    public Mono<List<FunctionDTO>> getFunctions(CelanworksmithOntologyContext context) {
        return useLegacy(context) ? getFunctions() : project(context).map(OntologyProjectDefinition::functions);
    }

    @Override
    public Mono<List<ActionTypeDTO>> getActions(String objectTypeId, CelanworksmithOntologyContext context) {
        return useLegacy(context)
                ? getActions(objectTypeId)
                : project(context)
                        .map(definition -> objectTypeId == null || objectTypeId.isBlank()
                                ? definition.actions()
                                : definition.actions().stream()
                                        .filter(value -> value.objectTypeId().equals(objectTypeId))
                                        .toList());
    }
}
