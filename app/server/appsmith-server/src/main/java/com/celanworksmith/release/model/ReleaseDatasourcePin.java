package com.celanworksmith.release.model;

public record ReleaseDatasourcePin(
        String datasourceId,
        String pluginId,
        String kind,
        String providerId,
        String metadataSnapshotId,
        String metadataDigest,
        String providerContractVersion,
        String projectId,
        String projectVersion) {

    public ReleaseDatasourcePin(
            String datasourceId,
            String pluginId,
            String kind,
            String providerId,
            String metadataSnapshotId,
            String metadataDigest,
            String providerContractVersion) {
        this(
                datasourceId,
                pluginId,
                kind,
                providerId,
                metadataSnapshotId,
                metadataDigest,
                providerContractVersion,
                null,
                null);
    }

    public ReleaseDatasourcePin {
        requireNonBlank(datasourceId, "datasourceId");
        requireNonBlank(pluginId, "pluginId");
        requireNonBlank(kind, "kind");
    }

    private static void requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
    }
}
