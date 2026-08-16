package com.celanworksmith.release;

import com.celanworksmith.release.model.ActionServerAdapterReference;
import com.celanworksmith.release.model.ReleaseDiagnostic;

import java.net.URI;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ActionServerAdapterConfigurationValidator {
    public List<ReleaseDiagnostic> validate(ActionServerAdapterReference reference) {
        if (reference == null) {
            return List.of(diagnostic("actionServer", "Action Server adapter reference is required"));
        }

        List<ReleaseDiagnostic> diagnostics = new ArrayList<>();
        if (!validToken(reference.adapterId())) {
            diagnostics.add(diagnostic("actionServer.adapterId", "Action Server adapter ID is invalid"));
        }
        if (!validToken(reference.adapterVersion())) {
            diagnostics.add(diagnostic("actionServer.adapterVersion", "Action Server adapter version is invalid"));
        }
        if (!validEndpoint(reference.endpoint())) {
            diagnostics.add(diagnostic("actionServer.endpoint", "Action Server adapter endpoint is invalid"));
        }
        return List.copyOf(diagnostics);
    }

    private boolean validToken(String value) {
        return value != null && value.matches("[A-Za-z0-9][A-Za-z0-9._-]*");
    }

    private boolean validEndpoint(String value) {
        try {
            URI uri = URI.create(value);
            return ("http".equalsIgnoreCase(uri.getScheme()) || "https".equalsIgnoreCase(uri.getScheme()))
                    && uri.getHost() != null;
        } catch (IllegalArgumentException exception) {
            return false;
        }
    }

    private ReleaseDiagnostic diagnostic(String path, String message) {
        return new ReleaseDiagnostic(
                ReleaseDiagnostic.Severity.BLOCKING, "RELEASE_ACTION_SERVER_ADAPTER_INVALID", path, message, Map.of());
    }
}
