package com.celanworksmith.ontology.datasource;

import java.util.List;

public record ProviderValidationResult(boolean compatible, List<String> errors) {
    public ProviderValidationResult {
        errors = errors == null ? List.of() : List.copyOf(errors);
    }
}
