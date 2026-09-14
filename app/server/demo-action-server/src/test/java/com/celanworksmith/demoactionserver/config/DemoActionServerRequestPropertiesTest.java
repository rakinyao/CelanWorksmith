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
        DemoActionServerRequestProperties properties = configured();

        assertThat(properties.supports(request("1.2.0"))).isTrue();
        assertThat(properties.supports(request("1.0.0"))).isFalse();
    }

    @Test
    void rejectsApplyContractChangeWhenTheConfiguredPinIsNotTheDemoRelease() {
        DemoActionServerRequestProperties properties = configured();
        properties.setProjectVersion("1.0.0");

        assertThat(properties.supports(request("1.2.0"))).isFalse();
    }

    private static DemoActionServerRequestProperties configured() {
        DemoActionServerRequestProperties properties = new DemoActionServerRequestProperties();
        properties.setWorkspaceId("workspace-1");
        properties.setProjectId("project-1");
        properties.setDatasourceId("datasource-1");
        properties.setMetadataSnapshotId("snapshot-1");
        properties.setMetadataDigest("sha256:abc");
        return properties;
    }

    private static ExecuteRequest request(String projectVersion) {
        return new ExecuteRequest(
                "v1",
                "workspace-1",
                "project-1",
                projectVersion,
                "datasource-1",
                "ApplyContractChange",
                new OntologyObjectSet("contract", List.of("CTR-1")),
                true,
                Map.of("changeAmount", "1.00", "changeReason", "Correction"),
                Map.of("metadataSnapshotId", "snapshot-1", "metadataDigest", "sha256:abc"),
                "key-1");
    }
}
