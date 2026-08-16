package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.persistence.CelanWorksmithMongoConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;

import static org.assertj.core.api.Assertions.assertThat;

class OntologyMetadataSnapshotRepositoryWiringTest {
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(RepositoryConfiguration.class)
            .withPropertyValues(
                    "celanworksmith.ontology.registry.uri=mongodb://localhost:27017",
                    "celanworksmith.ontology.registry.database=ontology_repository_wiring_test");

    @Test
    void createsRepositoryFromConfiguredPropertiesWhenTestConstructorAlsoExists() {
        contextRunner.run(context -> {
            assertThat(context.getStartupFailure()).isNull();
            assertThat(context).hasSingleBean(OntologyMetadataSnapshotRepository.class);
        });
    }

    @Configuration
    @Import({CelanWorksmithMongoConfiguration.class, OntologyMetadataSnapshotRepository.class})
    static class RepositoryConfiguration {}
}
