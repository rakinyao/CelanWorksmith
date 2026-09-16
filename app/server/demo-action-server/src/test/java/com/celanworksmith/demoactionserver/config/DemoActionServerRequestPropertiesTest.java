package com.celanworksmith.demoactionserver.config;

import com.celanworksmith.ontology.datasource.OntologyActionServerProtocol.ExecuteRequest;
import com.celanworksmith.ontology.datasource.OntologyObjectSet;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DemoActionServerRequestPropertiesTest {
    @Test
    void acceptsApplyContractChangeOnlyAtTheDemoReleaseVersion() {
        DemoActionServerRequestProperties properties = new DemoActionServerRequestProperties();

        assertThat(properties.supports(request("1.2.0"))).isTrue();
        assertThat(properties.supports(request("1.1.0"))).isFalse();
    }

    @Test
    void acceptsTheSameDemoActionFromDistinctWorkspaceIdentities() {
        DemoActionServerRequestProperties properties = new DemoActionServerRequestProperties();

        assertThat(properties.supports(request("workspace-1", "project-1", "datasource-1", "snapshot-1")))
                .isTrue();
        assertThat(properties.supports(request("workspace-2", "project-2", "datasource-2", "snapshot-2")))
                .isTrue();
    }

    @Test
    void rejectsActionsOutsideTheRegisteredDemoCapability() {
        DemoActionServerRequestProperties properties = new DemoActionServerRequestProperties();

        assertThat(properties.supports(request("OtherAction", "1.2.0"))).isFalse();
    }

    private static ExecuteRequest request(String projectVersion) {
        return request("workspace-1", "project-1", "datasource-1", "snapshot-1", "ApplyContractChange", projectVersion);
    }

    private static ExecuteRequest request(
            String workspaceId, String projectId, String datasourceId, String snapshotId) {
        return request(workspaceId, projectId, datasourceId, snapshotId, "ApplyContractChange", "1.2.0");
    }

    private static ExecuteRequest request(String actionId, String projectVersion) {
        return request("workspace-1", "project-1", "datasource-1", "snapshot-1", actionId, projectVersion);
    }

    private static ExecuteRequest request(
            String workspaceId,
            String projectId,
            String datasourceId,
            String snapshotId,
            String actionId,
            String projectVersion) {
        return new ExecuteRequest(
                "v1",
                workspaceId,
                projectId,
                projectVersion,
                datasourceId,
                actionId,
                new OntologyObjectSet("contract", List.of("CTR-1")),
                true,
                Map.of("changeAmount", "1.00", "changeReason", "Correction"),
                Map.of("metadataSnapshotId", snapshotId, "metadataDigest", "sha256:abc"),
                "key-1");
    }
}
