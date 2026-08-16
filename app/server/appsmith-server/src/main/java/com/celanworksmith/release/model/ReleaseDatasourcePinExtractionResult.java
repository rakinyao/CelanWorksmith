package com.celanworksmith.release.model;

import java.util.List;

public record ReleaseDatasourcePinExtractionResult(
        List<ReleaseDatasourcePin> pins, List<ReleaseDiagnostic> diagnostics) {
    public ReleaseDatasourcePinExtractionResult {
        pins = List.copyOf(pins);
        diagnostics = List.copyOf(diagnostics);
    }
}
