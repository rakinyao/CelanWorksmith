package com.celanworksmith.ontology.dto;

import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

public record ActionTypeDTO(
        @Field("id") String id,
        String displayName,
        String objectTypeId,
        List<PropertyDTO> parameters,
        boolean requiresConfirmation) {}
