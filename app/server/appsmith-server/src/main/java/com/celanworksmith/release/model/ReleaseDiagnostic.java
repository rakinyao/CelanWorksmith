package com.celanworksmith.release.model;

import java.util.Map;

public record ReleaseDiagnostic(
        Severity severity, String code, String path, String message, Map<String, Object> details) {

    public ReleaseDiagnostic {
        if (severity == null) {
            throw new NullPointerException("severity");
        }
        requireNonBlank(code, "code");
        requireNonBlank(message, "message");
        details = ReleaseValueCopies.copyMap(details);
    }

    public enum Severity {
        BLOCKING,
        WARNING,
        INFO
    }

    private static void requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
    }
}
