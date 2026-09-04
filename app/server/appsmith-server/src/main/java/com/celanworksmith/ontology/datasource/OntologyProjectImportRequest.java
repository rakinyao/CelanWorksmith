package com.celanworksmith.ontology.datasource;

import com.fasterxml.jackson.annotation.JsonIgnore;

public record OntologyProjectImportRequest(
        OntologyProjectImportSource.Kind sourceKind,
        byte[] metadata,
        String sourceReleaseId,
        String runtimeProviderId,
        @JsonIgnore String importedBy) {}
