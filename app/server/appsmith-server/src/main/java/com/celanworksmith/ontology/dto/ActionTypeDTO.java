package com.celanworksmith.ontology.dto;

import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

public record ActionTypeDTO(
        @Field("id") String id,
        String displayName,
        List<String> ownerObjectTypeIds,
        boolean atomic,
        List<PropertyDTO> parameters,
        boolean requiresConfirmation) {}
