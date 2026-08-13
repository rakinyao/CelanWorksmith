package com.celanworksmith.ontology.project;

import java.util.List;

public record OntologyProjectManifest(
        String projectId,
        String version,
        int schemaVersion,
        List<String> objects,
        List<String> links,
        List<String> functions,
        List<String> actions) {
    public OntologyProjectManifest {
        objects = objects == null ? List.of() : List.copyOf(objects);
        links = links == null ? List.of() : List.copyOf(links);
        functions = functions == null ? List.of() : List.copyOf(functions);
        actions = actions == null ? List.of() : List.copyOf(actions);
    }
}
