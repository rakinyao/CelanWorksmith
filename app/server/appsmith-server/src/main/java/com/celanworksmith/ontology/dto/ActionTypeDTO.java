package com.celanworksmith.ontology.dto;

import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

public record ActionTypeDTO(
        @Field("id") String id,
        String displayName,
        List<String> ownerObjectTypeIds,
        boolean atomic,
        Integer maxItems,
        List<PropertyDTO> parameters,
        boolean requiresConfirmation,
        String adapterId,
        String adapterVersion) {
    public ActionTypeDTO(
            String id,
            String displayName,
            List<String> ownerObjectTypeIds,
            boolean atomic,
            Integer maxItems,
            List<PropertyDTO> parameters,
            boolean requiresConfirmation) {
        this(id, displayName, ownerObjectTypeIds, atomic, maxItems, parameters, requiresConfirmation, null, null);
    }

    public ActionTypeDTO(
            String id,
            String displayName,
            List<String> ownerObjectTypeIds,
            boolean atomic,
            List<PropertyDTO> parameters,
            boolean requiresConfirmation) {
        this(id, displayName, ownerObjectTypeIds, atomic, null, parameters, requiresConfirmation);
    }
}
