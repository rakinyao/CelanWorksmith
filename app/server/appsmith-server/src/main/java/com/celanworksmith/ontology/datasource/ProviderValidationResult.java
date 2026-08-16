package com.celanworksmith.ontology.datasource;

import java.util.List;

public record ProviderValidationResult(boolean compatible, List<String> errors, List<String> warnings) {
    public ProviderValidationResult(boolean compatible, List<String> errors) {
        this(compatible, errors, List.of());
    }

    public ProviderValidationResult {
        errors = errors == null ? List.of() : List.copyOf(errors);
        warnings = warnings == null ? List.of() : List.copyOf(warnings);
    }
}
