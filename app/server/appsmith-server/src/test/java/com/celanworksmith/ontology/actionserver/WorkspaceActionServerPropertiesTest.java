package com.celanworksmith.ontology.actionserver;

import com.celanworksmith.CelanWorksmithConfiguration;
import com.celanworksmith.ontology.datasource.OntologyActionServerClient;
import com.celanworksmith.ontology.datasource.WorkspaceActionServerConfigurationResolver;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;

class WorkspaceActionServerPropertiesTest {
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(PropertiesConfiguration.class);

    @Test
    void bindsConfiguredWorkspaceEndpoint() {
        contextRunner.withPropertyValues(
                        "celanworksmith.action-server.workspaces.workspace-1.url=http://localhost:8089",
                        "celanworksmith.action-server.workspaces.workspace-1.timeout-millis=3000")
                .run(context -> {
                    var properties = context.getBean(WorkspaceActionServerProperties.class);
                    assertThat(properties.getWorkspaces()).containsKey("workspace-1");
                    assertThat(properties.getWorkspaces().get("workspace-1").getUrl())
                            .isEqualTo("http://localhost:8089");
                    assertThat(properties.getWorkspaces().get("workspace-1").getTimeoutMillis())
                            .isEqualTo(3000);
                });
    }

    @Test
    void rejectsBlankUrl() {
        contextRunner.withPropertyValues(
                        "celanworksmith.action-server.workspaces.workspace-1.url=",
                        "celanworksmith.action-server.workspaces.workspace-1.timeout-millis=3000")
                .run(context -> assertThat(context.getStartupFailure()).isNotNull());
    }

    @Test
    void rejectsNonPositiveTimeout() {
        contextRunner.withPropertyValues(
                        "celanworksmith.action-server.workspaces.workspace-1.url=http://localhost:8089",
                        "celanworksmith.action-server.workspaces.workspace-1.timeout-millis=0")
                .run(context -> assertThat(context.getStartupFailure()).isNotNull());
    }

    @Test
    void resolverReturnsClientForConfiguredWorkspaceAndFailsUnknownWorkspace() {
        var properties = new WorkspaceActionServerProperties();
        properties.getWorkspaces().put(
                        "workspace-1", new WorkspaceActionServerProperties.Endpoint("http://localhost:8089", 3000));
        WorkspaceActionServerConfigurationResolver resolver =
                new CelanWorksmithConfiguration().workspaceActionServerConfigurationResolver(
                        properties);

        StepVerifier.create(resolver.resolveRequired("workspace-1"))
                .assertNext(client -> assertThat(client).isInstanceOf(HttpOntologyActionServerClient.class))
                .verifyComplete();
        StepVerifier.create(resolver.resolveRequired("unknown"))
                .expectErrorSatisfies(error -> assertThat(error)
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessage("Ontology Action Server is not configured for workspace: unknown"))
                .verify();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(WorkspaceActionServerProperties.class)
    static class PropertiesConfiguration {}
}
