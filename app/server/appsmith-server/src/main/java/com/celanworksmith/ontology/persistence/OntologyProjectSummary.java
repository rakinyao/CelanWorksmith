package com.celanworksmith.ontology.persistence;

import com.celanworksmith.ontology.project.OntologyProjectDefinition;

public record OntologyProjectSummary(
        String projectId,
        String version,
        int schemaVersion,
        int objectTypeCount,
        int linkTypeCount,
        int functionCount,
        int actionCount) {
    public static OntologyProjectSummary from(OntologyProjectDefinition definition) {
        return new OntologyProjectSummary(
                definition.projectId(),
                definition.version(),
                definition.schemaVersion(),
                definition.objectTypes().size(),
                definition.linkTypes().size(),
                definition.functions().size(),
                definition.actions().size());
    }
}
