package com.celanworksmith.ontology.dto;

import java.util.List;

public record ActionTypeDTO(
        String id,
        String displayName,
        String objectTypeId,
        List<PropertyDTO> parameters,
        boolean requiresConfirmation) {}
