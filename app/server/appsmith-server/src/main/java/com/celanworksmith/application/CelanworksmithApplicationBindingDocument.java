package com.celanworksmith.application;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "application_ontology_bindings")
public class CelanworksmithApplicationBindingDocument {
    @Id
    private String applicationId;

    private String projectId;
    private String projectVersion;
    private String providerId;

    public CelanworksmithApplicationBindingDocument() {}

    private CelanworksmithApplicationBindingDocument(
            String applicationId, String projectId, String projectVersion, String providerId) {
        this.applicationId = applicationId;
        this.projectId = projectId;
        this.projectVersion = projectVersion;
        this.providerId = providerId;
    }

    public static CelanworksmithApplicationBindingDocument from(CelanworksmithApplicationBinding binding) {
        return new CelanworksmithApplicationBindingDocument(
                binding.applicationId(), binding.projectId(), binding.projectVersion(), binding.providerId());
    }

    public CelanworksmithApplicationBinding toBinding() {
        return new CelanworksmithApplicationBinding(applicationId, projectId, projectVersion, providerId);
    }

    public String getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(String applicationId) {
        this.applicationId = applicationId;
    }

    public String getProjectId() {
        return projectId;
    }

    public void setProjectId(String projectId) {
        this.projectId = projectId;
    }

    public String getProjectVersion() {
        return projectVersion;
    }

    public void setProjectVersion(String projectVersion) {
        this.projectVersion = projectVersion;
    }

    public String getProviderId() {
        return providerId;
    }

    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }
}
