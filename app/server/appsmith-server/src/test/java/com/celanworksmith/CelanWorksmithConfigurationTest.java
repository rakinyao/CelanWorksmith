package com.celanworksmith;

import com.celanworksmith.ontology.adapter.production.ProductionOntologyProvider;
import com.celanworksmith.ontology.port.OntologyProvider;
import com.celanworksmith.runtime.adapter.production.ProductionRuntimeProvider;
import com.celanworksmith.runtime.port.RuntimeProvider;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;

class CelanWorksmithConfigurationTest {
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(CelanWorksmithConfiguration.class);

    @Test
    void defaultsToMockProviders() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(OntologyProvider.class);
            assertThat(context).hasSingleBean(RuntimeProvider.class);
            assertThat(context.getBean(OntologyProvider.class)).isInstanceOf(
                    com.celanworksmith.ontology.adapter.mock.MockOntologyProvider.class);
            assertThat(context.getBean(RuntimeProvider.class)).isInstanceOf(
                    com.celanworksmith.runtime.adapter.mock.MockRuntimeProvider.class);
        });
    }

    @Test
    void selectsProductionPlaceholdersExplicitly() {
        contextRunner
                .withPropertyValues(
                        "celanworksmith.ontology.provider=production",
                        "celanworksmith.runtime.provider=production")
                .run(context -> {
                    assertThat(context.getBean(OntologyProvider.class)).isInstanceOf(ProductionOntologyProvider.class);
                    assertThat(context.getBean(RuntimeProvider.class)).isInstanceOf(ProductionRuntimeProvider.class);
                    StepVerifier.create(context.getBean(OntologyProvider.class).getObjectTypes())
                            .expectErrorSatisfies(error -> assertThat(error)
                                    .isInstanceOf(CelanWorksmithException.class)
                                    .hasMessageContaining("Production ontology provider is not configured"))
                            .verify();
                });
    }
}
