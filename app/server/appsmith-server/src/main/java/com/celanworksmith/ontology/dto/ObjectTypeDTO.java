package com.celanworksmith.ontology.dto;

import java.util.List;

public record ObjectTypeDTO(String id, String displayName, List<PropertyDTO> properties) {}
