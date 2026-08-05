package com.celanworksmith.ontology.dto;

public record PropertyDTO(
        String id, String displayName, String dataType, boolean required, boolean readOnly, boolean derived) {}
