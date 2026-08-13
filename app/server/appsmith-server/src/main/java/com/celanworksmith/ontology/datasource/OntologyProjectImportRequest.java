package com.celanworksmith.ontology.datasource;

public record OntologyProjectImportRequest(
        OntologyProjectImportSource.Kind sourceKind,
        byte[] metadata,
        String sourceReleaseId,
        String runtimeProviderId,
        String importedBy) {}
