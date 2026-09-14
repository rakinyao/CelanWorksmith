package com.celanworksmith.ontology.dto;

import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

public record FunctionDTO(
        @Field("id") String id,
        String displayName,
        String returnType,
        List<String> ownerObjectTypeIds,
        List<PropertyDTO> parameters,
        boolean sideEffectFree,
        Integer maxItems,
        String implementationKind,
        String implementationRef,
        String implementationVersion) {
    public FunctionDTO(
            String id,
            String displayName,
            String returnType,
            List<String> ownerObjectTypeIds,
            List<PropertyDTO> parameters,
            boolean sideEffectFree) {
        this(id, displayName, returnType, ownerObjectTypeIds, parameters, sideEffectFree, null, null, null, null);
    }
}
