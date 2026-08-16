package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.project.OntologyProjectDefinition;

public record ImportedOntologyProject(
        OntologyProjectDefinition definition,
        String sourceKind,
        String sourceReleaseId,
        String runtimeProviderId,
        String importedBy,
        boolean deprecated) {

    public ImportedOntologyProject(
            OntologyProjectDefinition definition,
            String sourceKind,
            String sourceReleaseId,
            String runtimeProviderId,
            String importedBy) {
        this(definition, sourceKind, sourceReleaseId, runtimeProviderId, importedBy, false);
    }
}
