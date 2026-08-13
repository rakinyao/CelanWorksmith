package com.celanworksmith.ontology.datasource.dto;

public record OntologyDatasourceSummary(
        String datasourceId,
        String datasourceName,
        String projectId,
        String projectVersion,
        String source,
        String provider,
        String digest,
        String status,
        String changeNote) {}
