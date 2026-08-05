package com.celanworksmith.ontology.dto;

public record LinkTypeDTO(
        String id, String displayName, String sourceTypeId, String targetTypeId, String cardinality) {}
