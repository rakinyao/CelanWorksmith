package com.celanworksmith.ontology.persistence;

import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "ontology_projects")
public class OntologyProjectDocument {
    @Id
    private String id;

    private String projectId;
    private String version;
    private OntologyProjectDefinition definition;

    public OntologyProjectDocument() {}

    public OntologyProjectDocument(String id, String projectId, String version, OntologyProjectDefinition definition) {
        this.id = id;
        this.projectId = projectId;
        this.version = version;
        this.definition = definition;
    }

    public static OntologyProjectDocument from(OntologyProjectDefinition definition) {
        return new OntologyProjectDocument(
                definition.projectId() + ":" + definition.version(),
                definition.projectId(),
                definition.version(),
                definition);
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public OntologyProjectDefinition getDefinition() {
        return definition;
    }

    public void setDefinition(OntologyProjectDefinition definition) {
        this.definition = definition;
    }

    public OntologyProjectDefinition toDefinition() {
        return definition;
    }
}
