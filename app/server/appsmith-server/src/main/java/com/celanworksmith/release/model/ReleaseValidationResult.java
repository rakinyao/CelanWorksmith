package com.celanworksmith.release.model;

import java.util.List;

public record ReleaseValidationResult(List<ReleaseDiagnostic> diagnostics) {
    public ReleaseValidationResult {
        diagnostics = diagnostics == null ? List.of() : List.copyOf(diagnostics);
    }

    public boolean valid() {
        return diagnostics.stream()
                .noneMatch(diagnostic -> diagnostic.severity() == ReleaseDiagnostic.Severity.BLOCKING);
    }
}
