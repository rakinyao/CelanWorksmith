package com.celanworksmith.demoactionserver.config;

import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import org.springframework.boot.context.properties.ConfigurationProperties;

/** Accepted local workspace/project pin for the development-only action server. */
@ConfigurationProperties(prefix = "celanworksmith.demo-action-server.request")
public class DemoActionServerRequestProperties {
    public static final String DEMO_RELEASE_VERSION = "1.2.0";

    private String workspaceId;
    private String projectId;
    private String projectVersion = DEMO_RELEASE_VERSION;
    private String datasourceId;
    private String metadataSnapshotId;
    private String metadataDigest;

    public boolean supports(ExecuteRequest request) {
        if ("ApplyContractChange".equals(request.actionId())
                && (!DEMO_RELEASE_VERSION.equals(projectVersion)
                        || !DEMO_RELEASE_VERSION.equals(request.projectVersion()))) {
            return false;
        }
        return matches(workspaceId, request.workspaceId())
                && matches(projectId, request.projectId())
                && matches(projectVersion, request.projectVersion())
                && matches(datasourceId, request.datasourceId())
                && matches(metadataSnapshotId, contextValue(request, "metadataSnapshotId"))
                && matches(metadataDigest, contextValue(request, "metadataDigest"));
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
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

    public String getDatasourceId() {
        return datasourceId;
    }

    public void setDatasourceId(String datasourceId) {
        this.datasourceId = datasourceId;
    }

    public String getMetadataSnapshotId() {
        return metadataSnapshotId;
    }

    public void setMetadataSnapshotId(String metadataSnapshotId) {
        this.metadataSnapshotId = metadataSnapshotId;
    }

    public String getMetadataDigest() {
        return metadataDigest;
    }

    public void setMetadataDigest(String metadataDigest) {
        this.metadataDigest = metadataDigest;
    }

    private static String contextValue(ExecuteRequest request, String name) {
        Object value = request.context().get(name);
        return value instanceof String string ? string : null;
    }

    private static boolean matches(String configured, String actual) {
        return configured != null && !configured.isBlank() && configured.equals(actual);
    }
}
