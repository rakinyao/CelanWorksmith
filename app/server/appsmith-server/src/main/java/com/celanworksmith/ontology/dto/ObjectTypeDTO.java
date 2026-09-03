package com.celanworksmith.ontology.dto;

import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;
import java.util.Map;

public record ObjectTypeDTO(
        @Field("id") String id,
        String displayName,
        List<PropertyDTO> properties,
        String runtimeTable,
        String primaryKey,
        Map<String, RuntimePropertyMapping> runtimePropertyMappings) {
    public ObjectTypeDTO(String id, String displayName, List<PropertyDTO> properties) {
        this(id, displayName, properties, null, "id", Map.of());
    }

    public ObjectTypeDTO(
            String id, String displayName, List<PropertyDTO> properties, String runtimeTable, String primaryKey) {
        this(id, displayName, properties, runtimeTable, primaryKey, Map.of());
    }

    public ObjectTypeDTO(
            String id, String displayName, String runtimeTable, String primaryKey, List<PropertyDTO> properties) {
        this(id, displayName, properties, runtimeTable, primaryKey == null || primaryKey.isBlank() ? "id" : primaryKey, Map.of());
    }

    public ObjectTypeDTO(
            String id,
            String displayName,
            String runtimeTable,
            String primaryKey,
            List<PropertyDTO> properties,
            Map<String, RuntimePropertyMapping> runtimePropertyMappings) {
        this(id, displayName, properties, runtimeTable, primaryKey, runtimePropertyMappings);
    }

    public ObjectTypeDTO {
        properties = properties == null ? List.of() : List.copyOf(properties);
        primaryKey = primaryKey == null || primaryKey.isBlank() ? "id" : primaryKey;
        runtimePropertyMappings = runtimePropertyMappings == null ? Map.of() : Map.copyOf(runtimePropertyMappings);
    }

    public record RuntimePropertyMapping(String column, String expression, String status) {}
}
