package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.project.OntologyProjectDefinition;

public record ImportedOntologyProject(
        OntologyProjectDefinition definition,
        String sourceKind,
        String sourceReleaseId,
        String runtimeProviderId,
        String importedBy,
        boolean deprecated,
        String releaseDomain,
        String releaseDigest,
        String managedRuntimeBindingId,
        String workspaceId) {

    public ImportedOntologyProject(
            OntologyProjectDefinition definition,
            String sourceKind,
            String sourceReleaseId,
            String runtimeProviderId,
            String importedBy) {
        this(definition, sourceKind, sourceReleaseId, runtimeProviderId, importedBy, false, null, null, null, null);
    }

    public ImportedOntologyProject(
            OntologyProjectDefinition definition,
            String sourceKind,
            String sourceReleaseId,
            String runtimeProviderId,
            String importedBy,
            boolean deprecated) {
        this(
                definition,
                sourceKind,
                sourceReleaseId,
                runtimeProviderId,
                importedBy,
                deprecated,
                null,
                null,
                null,
                null);
    }

    public ImportedOntologyProject(
            OntologyProjectDefinition definition,
            String sourceKind,
            String sourceReleaseId,
            String runtimeProviderId,
            String importedBy,
            String releaseDomain,
            String releaseDigest,
            String managedRuntimeBindingId) {
        this(
                definition,
                sourceKind,
                sourceReleaseId,
                runtimeProviderId,
                importedBy,
                releaseDomain,
                releaseDigest,
                managedRuntimeBindingId,
                null);
    }

    public ImportedOntologyProject(
            OntologyProjectDefinition definition,
            String sourceKind,
            String sourceReleaseId,
            String runtimeProviderId,
            String importedBy,
            String releaseDomain,
            String releaseDigest,
            String managedRuntimeBindingId,
            String workspaceId) {
        this(
                definition,
                sourceKind,
                sourceReleaseId,
                runtimeProviderId,
                importedBy,
                false,
                releaseDomain,
                releaseDigest,
                managedRuntimeBindingId,
                workspaceId);
    }
}
