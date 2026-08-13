package com.celanworksmith.ontology.dto;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.mongodb.core.mapping.Field;

import java.util.List;

public record PropertyDTO(
        @Field("id") String id,
        String displayName,
        String dataType,
        boolean required,
        boolean readOnly,
        boolean derived,
        String group,
        Integer order,
        @Value("#root.hidden ?: false") boolean hidden,
        List<String> enumValues,
        String referenceTypeId) {
    public PropertyDTO(
            String id, String displayName, String dataType, boolean required, boolean readOnly, boolean derived) {
        this(id, displayName, dataType, required, readOnly, derived, null, null, false, null, null);
    }
}
