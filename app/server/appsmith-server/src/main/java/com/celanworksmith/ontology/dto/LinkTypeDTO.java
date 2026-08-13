package com.celanworksmith.ontology.dto;

import org.springframework.data.mongodb.core.mapping.Field;

public record LinkTypeDTO(
        @Field("id") String id, String displayName, String sourceTypeId, String targetTypeId, String cardinality) {}
