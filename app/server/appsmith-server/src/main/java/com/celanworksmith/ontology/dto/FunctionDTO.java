package com.celanworksmith.ontology.dto;

import java.util.List;

public record FunctionDTO(
        String id, String displayName, String returnType, List<PropertyDTO> parameters, boolean sideEffectFree) {}
