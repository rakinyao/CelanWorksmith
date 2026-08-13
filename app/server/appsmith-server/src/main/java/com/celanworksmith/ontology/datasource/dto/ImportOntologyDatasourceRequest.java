package com.celanworksmith.ontology.datasource.dto;

import com.celanworksmith.ontology.datasource.OntologyProjectImportRequest;

public record ImportOntologyDatasourceRequest(
        String workspaceId,
        String datasourceName,
        OntologyProjectImportRequest projectImportRequest,
        String changeNote) {}
