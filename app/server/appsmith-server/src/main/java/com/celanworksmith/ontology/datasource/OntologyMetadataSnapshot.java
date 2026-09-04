package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "ontology_metadata_snapshots")
public record OntologyMetadataSnapshot(
        @Id String id,
        String projectId,
        String projectVersion,
        String sourceKind,
        String sourceReleaseId,
        String runtimeProviderId,
        String createdBy,
        Instant createdAt,
        String metadataDigest,
        OntologyProjectDefinition definition,
        boolean deprecated,
        String releaseDomain,
        String releaseDigest,
        String managedRuntimeBindingId,
        String workspaceId) {

    public OntologyMetadataSnapshot(
            String id,
            String projectId,
            String projectVersion,
            String sourceKind,
            String sourceReleaseId,
            String runtimeProviderId,
            String createdBy,
            Instant createdAt,
            String metadataDigest,
            OntologyProjectDefinition definition,
            boolean deprecated,
            String releaseDomain,
            String releaseDigest,
            String managedRuntimeBindingId) {
        this(
                id,
                projectId,
                projectVersion,
                sourceKind,
                sourceReleaseId,
                runtimeProviderId,
                createdBy,
                createdAt,
                metadataDigest,
                definition,
                deprecated,
                releaseDomain,
                releaseDigest,
                managedRuntimeBindingId,
                null);
    }

    public OntologyMetadataSnapshot(
            String id,
            String projectId,
            String projectVersion,
            String sourceKind,
            String sourceReleaseId,
            String runtimeProviderId,
            String createdBy,
            Instant createdAt,
            String metadataDigest,
            OntologyProjectDefinition definition) {
        this(
                id,
                projectId,
                projectVersion,
                sourceKind,
                sourceReleaseId,
                runtimeProviderId,
                createdBy,
                createdAt,
                metadataDigest,
                definition,
                false,
                null,
                null,
                null,
                null);
    }

    public OntologyMetadataSnapshot(
            String id,
            String projectId,
            String projectVersion,
            String sourceKind,
            String sourceReleaseId,
            String runtimeProviderId,
            String createdBy,
            Instant createdAt,
            String metadataDigest,
            OntologyProjectDefinition definition,
            boolean deprecated) {
        this(
                id,
                projectId,
                projectVersion,
                sourceKind,
                sourceReleaseId,
                runtimeProviderId,
                createdBy,
                createdAt,
                metadataDigest,
                definition,
                deprecated,
                null,
                null,
                null,
                null);
    }
}
