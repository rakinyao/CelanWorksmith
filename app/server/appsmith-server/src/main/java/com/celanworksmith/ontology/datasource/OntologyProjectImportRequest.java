package com.celanworksmith.ontology.datasource;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

@JsonDeserialize(using = OntologyProjectImportRequestDeserializer.class)
public record OntologyProjectImportRequest(
        OntologyProjectImportSource.Kind sourceKind,
        byte[] metadata,
        String sourceReleaseId,
        String runtimeProviderId,
        @JsonIgnore String importedBy) {
    public OntologyProjectImportRequest {
        if (sourceKind == OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON) {
            runtimeProviderId = null;
        }
    }
}
