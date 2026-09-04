package com.celanworksmith.ontology.datasource;

/** Server-created identity for an authorized ontology import. */
public record OntologyProjectImportContext(String workspaceId, String importedBy) {
    public OntologyProjectImportContext {
        if (workspaceId == null || workspaceId.isBlank())
            throw new IllegalArgumentException("Workspace ID is required");
        if (importedBy == null || importedBy.isBlank()) throw new IllegalArgumentException("Import actor is required");
    }
}
