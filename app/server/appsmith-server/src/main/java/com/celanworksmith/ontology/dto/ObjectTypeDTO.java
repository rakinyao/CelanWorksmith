package com.celanworksmith.ontology.dto;

import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

public record ObjectTypeDTO(
        @Field("id") String id,
        String displayName,
        List<PropertyDTO> properties,
        String runtimeTable,
        String primaryKey) {
    public ObjectTypeDTO(String id, String displayName, List<PropertyDTO> properties) {
        this(id, displayName, properties, null, "id");
    }

    public ObjectTypeDTO(
            String id, String displayName, String runtimeTable, String primaryKey, List<PropertyDTO> properties) {
        this(id, displayName, properties, runtimeTable, primaryKey == null || primaryKey.isBlank() ? "id" : primaryKey);
    }

    public ObjectTypeDTO {
        properties = properties == null ? List.of() : List.copyOf(properties);
        primaryKey = primaryKey == null || primaryKey.isBlank() ? "id" : primaryKey;
    }
}
