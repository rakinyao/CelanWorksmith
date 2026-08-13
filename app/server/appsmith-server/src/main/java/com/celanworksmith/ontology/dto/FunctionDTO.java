package com.celanworksmith.ontology.dto;

import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

public record FunctionDTO(
        @Field("id") String id,
        String displayName,
        String returnType,
        List<PropertyDTO> parameters,
        boolean sideEffectFree) {}
