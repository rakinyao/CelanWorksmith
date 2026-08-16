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
        boolean deprecated) {

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
                false);
    }
}
