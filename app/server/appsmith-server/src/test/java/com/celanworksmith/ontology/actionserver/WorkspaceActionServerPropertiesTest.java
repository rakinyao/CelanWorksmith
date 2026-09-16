package com.celanworksmith.ontology.actionserver;

import com.celanworksmith.CelanWorksmithConfiguration;
import com.celanworksmith.ontology.datasource.WorkspaceActionServerConfigurationResolver;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;

class WorkspaceActionServerPropertiesTest {
    private final ApplicationContextRunner contextRunner =
            new ApplicationContextRunner().withUserConfiguration(PropertiesConfiguration.class);

    @Test
    void bindsConfiguredAdapterVersionEndpoint() {
        contextRunner
                .withPropertyValues(
                        "celanworksmith.action-server.adapters.demo-action-server.versions.[1.0.0].url=http://localhost:8089",
                        "celanworksmith.action-server.adapters.demo-action-server.versions.[1.0.0].timeout-millis=3000")
                .run(context -> {
                    var properties = context.getBean(WorkspaceActionServerProperties.class);
                    assertThat(properties.getAdapters()).containsKey("demo-action-server");
                    assertThat(properties
                                    .getAdapters()
                                    .get("demo-action-server")
                                    .getVersions())
                            .containsKey("1.0.0");
                    assertThat(properties
                                    .getAdapters()
                                    .get("demo-action-server")
                                    .getVersions()
                                    .get("1.0.0")
                                    .getUrl())
                            .isEqualTo("http://localhost:8089");
                    assertThat(properties
                                    .getAdapters()
                                    .get("demo-action-server")
                                    .getVersions()
                                    .get("1.0.0")
                                    .getTimeoutMillis())
                            .isEqualTo(3000);
                });
    }

    @Test
    void rejectsBlankUrl() {
        contextRunner
                .withPropertyValues(
                        "celanworksmith.action-server.adapters.demo-action-server.versions.[1.0.0].url=",
                        "celanworksmith.action-server.adapters.demo-action-server.versions.[1.0.0].timeout-millis=3000")
                .run(context -> assertThat(context.getStartupFailure()).isNotNull());
    }

    @Test
    void rejectsNonPositiveTimeout() {
        contextRunner
                .withPropertyValues(
                        "celanworksmith.action-server.adapters.demo-action-server.versions.[1.0.0].url=http://localhost:8089",
                        "celanworksmith.action-server.adapters.demo-action-server.versions.[1.0.0].timeout-millis=0")
                .run(context -> assertThat(context.getStartupFailure()).isNotNull());
    }

    @Test
    void resolverReturnsClientForAnyWorkspaceAndFailsUnknownAdapterVersion() {
        var properties = new WorkspaceActionServerProperties();
        var adapter = new WorkspaceActionServerProperties.Adapter();
        adapter.getVersions().put("1.0.0", new WorkspaceActionServerProperties.Endpoint("http://localhost:8089", 3000));
        properties.getAdapters().put("demo-action-server", adapter);
        WorkspaceActionServerConfigurationResolver resolver =
                new CelanWorksmithConfiguration().workspaceActionServerConfigurationResolver(properties);

        StepVerifier.create(resolver.resolveRequired("workspace-a", "demo-action-server", "1.0.0"))
                .assertNext(client -> assertThat(client).isInstanceOf(HttpOntologyActionServerClient.class))
                .verifyComplete();
        StepVerifier.create(resolver.resolveRequired("workspace-b", "demo-action-server", "1.0.0"))
                .assertNext(client -> assertThat(client).isInstanceOf(HttpOntologyActionServerClient.class))
                .verifyComplete();
        StepVerifier.create(resolver.resolveRequired("workspace-a", "unknown", "1.0.0"))
                .expectErrorSatisfies(error -> assertThat(error)
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessage("Ontology Action Server adapter is not configured: unknown@1.0.0"))
                .verify();
        StepVerifier.create(resolver.resolveRequired("workspace-a", "demo-action-server", "9.9.9"))
                .expectErrorSatisfies(error -> assertThat(error)
                        .isInstanceOf(IllegalStateException.class)
                        .hasMessage("Ontology Action Server adapter is not configured: demo-action-server@9.9.9"))
                .verify();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties(WorkspaceActionServerProperties.class)
    static class PropertiesConfiguration {}
}
