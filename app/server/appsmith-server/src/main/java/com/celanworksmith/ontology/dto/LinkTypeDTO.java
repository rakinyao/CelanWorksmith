package com.celanworksmith.ontology.dto;

import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

public record LinkTypeDTO(
        @Field("id") String id,
        String displayName,
        String sourceTypeId,
        String targetTypeId,
        String cardinality,
        List<FieldMapping> fieldMappings) {
    public LinkTypeDTO(String id, String displayName, String sourceTypeId, String targetTypeId, String cardinality) {
        this(id, displayName, sourceTypeId, targetTypeId, cardinality, List.of());
    }

    public LinkTypeDTO {
        fieldMappings = fieldMappings == null ? List.of() : List.copyOf(fieldMappings);
    }

    public record FieldMapping(String sourceField, String targetField) {}
}
