package com.celanworksmith.release.model;

import java.time.Instant;
import java.util.List;
import java.util.Map;

public record ApplicationReleaseSnapshot(
        String releaseId,
        String applicationId,
        String workspaceId,
        String baseRevisionId,
        String releaseSchemaVersion,
        String createdBy,
        Instant createdAt,
        String releaseMessage,
        String contentDigest,
        Map<String, Object> applicationContent,
        List<ReleaseDatasourcePin> datasourcePins,
        List<ReleaseDiagnostic> diagnostics,
        ApplicationReleaseStatus status) {

    public ApplicationReleaseSnapshot {
        requireNonBlank(releaseId, "releaseId");
        requireNonBlank(applicationId, "applicationId");
        requireNonBlank(workspaceId, "workspaceId");
        requireNonBlank(baseRevisionId, "baseRevisionId");
        requireNonBlank(releaseSchemaVersion, "releaseSchemaVersion");
        requireNonBlank(createdBy, "createdBy");
        if (createdAt == null) {
            throw new NullPointerException("createdAt");
        }
        requireNonBlank(contentDigest, "contentDigest");
        applicationContent = ReleaseValueCopies.copyMap(applicationContent);
        datasourcePins = List.copyOf(datasourcePins);
        diagnostics = List.copyOf(diagnostics);
        if (status == null) {
            throw new NullPointerException("status");
        }
    }

    private static void requireNonBlank(String value, String name) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(name + " must not be blank");
        }
    }
}
