package com.celanworksmith.release.model;

public record ReleaseDependency(String kind, String datasourceId, String referenceId, String path) {
    public ReleaseDependency {
        require(kind, "kind");
        require(referenceId, "referenceId");
        require(path, "path");
    }

    private static void require(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
    }
}
