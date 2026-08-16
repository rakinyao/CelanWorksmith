package com.celanworksmith.release.dto;

import com.celanworksmith.release.model.ReleaseDiagnostic;

import java.util.List;

public record ReleasePreflightResponse(
        String applicationId, String baseRevisionId, boolean valid, List<ReleaseDiagnostic> diagnostics) {

    public ReleasePreflightResponse {
        diagnostics = diagnostics == null ? List.of() : List.copyOf(diagnostics);
    }
}
