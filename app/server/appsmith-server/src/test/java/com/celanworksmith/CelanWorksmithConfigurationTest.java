package com.celanworksmith;

import com.appsmith.server.applications.base.ApplicationService;
import com.appsmith.server.datasources.base.DatasourceService;
import com.appsmith.server.datasourcestorages.base.DatasourceStorageService;
import com.appsmith.server.plugins.base.PluginService;
import com.appsmith.server.repositories.NewActionRepository;
import com.appsmith.server.services.WorkspaceService;
import com.appsmith.server.solutions.ApplicationPermission;
import com.appsmith.server.solutions.DatasourcePermission;
import com.celanworksmith.application.CelanworksmithApplicationBindingRepository;
import com.celanworksmith.ontology.adapter.production.ProductionOntologyProvider;
import com.celanworksmith.ontology.adapter.project.OntologyProjectBackedProvider;
import com.celanworksmith.ontology.datasource.OntologyDatasourceService;
import com.celanworksmith.ontology.datasource.OntologyDatasourceUpgradeService;
import com.celanworksmith.ontology.datasource.OntologyMetadataSnapshotRepository;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway;
import com.celanworksmith.ontology.datasource.OntologySnapshotService;
import com.celanworksmith.ontology.datasource.RuntimeProviderCompatibilityValidator;
import com.celanworksmith.ontology.datasource.RuntimeProviderRegistry;
import com.celanworksmith.ontology.persistence.OntologyProjectRegistry;
import com.celanworksmith.ontology.port.OntologyProvider;
import com.celanworksmith.release.ActionServerAdapterConfigurationValidator;
import com.celanworksmith.release.ApplicationReleaseProviderHealthGate;
import com.celanworksmith.runtime.adapter.mongodb.MongoRuntimeDataProvider;
import com.celanworksmith.runtime.adapter.production.ProductionRuntimeProvider;
import com.celanworksmith.runtime.port.RuntimeProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.transaction.reactive.TransactionalOperator;
import reactor.test.StepVerifier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class CelanWorksmithConfigurationTest {
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(CelanWorksmithConfiguration.class)
            .withBean(OntologyProjectRegistry.class, () -> mock(OntologyProjectRegistry.class))
            .withBean(ObjectMapper.class, () -> new ObjectMapper().findAndRegisterModules())
            .withBean(OntologyMetadataSnapshotRepository.class, () -> mock(OntologyMetadataSnapshotRepository.class))
            .withBean(
                    CelanworksmithApplicationBindingRepository.class,
                    () -> mock(CelanworksmithApplicationBindingRepository.class))
            .withBean(WorkspaceService.class, () -> mock(WorkspaceService.class))
            .withBean(DatasourceService.class, () -> mock(DatasourceService.class))
            .withBean(DatasourceStorageService.class, () -> mock(DatasourceStorageService.class))
            .withBean(PluginService.class, () -> mock(PluginService.class))
            .withBean(NewActionRepository.class, () -> mock(NewActionRepository.class))
            .withBean(ApplicationService.class, () -> mock(ApplicationService.class))
            .withBean(ApplicationPermission.class, () -> mock(ApplicationPermission.class))
            .withBean(DatasourcePermission.class, () -> mock(DatasourcePermission.class))
            .withBean(
                    OntologyDatasourceUpgradeService.AuditStore.class,
                    () -> mock(OntologyDatasourceUpgradeService.AuditStore.class))
            .withBean(TransactionalOperator.class, () -> mock(TransactionalOperator.class));

    @Test
    void defaultsToProjectAndMongoProviders() {
        contextRunner.run(context -> {
            assertThat(context.getBeansOfType(OntologyProvider.class)).hasSize(2);
            assertThat(context).hasSingleBean(RuntimeProvider.class);
            assertThat(context.getBean(OntologyProvider.class)).isInstanceOf(OntologyProjectBackedProvider.class);
            assertThat(context.getBean(ProductionOntologyProvider.class)).isNotNull();
            assertThat(context.getBean(RuntimeProvider.class)).isInstanceOf(MongoRuntimeDataProvider.class);
        });
    }

    @Test
    void registersTheOntologySnapshotService() {
        contextRunner.run(context -> assertThat(context).hasSingleBean(OntologySnapshotService.class));
    }

    @Test
    void registersTheReleaseHealthGateAndAdapterValidator() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(ApplicationReleaseProviderHealthGate.class);
            assertThat(context).hasSingleBean(ActionServerAdapterConfigurationValidator.class);
            assertThat(context.getBean(ApplicationReleaseProviderHealthGate.class))
                    .isNotNull();
            assertThat(context.getBean(ActionServerAdapterConfigurationValidator.class))
                    .isNotNull();
        });
    }

    @Test
    void registersProviderCompatibilityServicesForTheActiveRuntimeProvider() {
        contextRunner.run(context -> {
            assertThat(context).hasSingleBean(RuntimeProviderRegistry.class);
            assertThat(context).hasSingleBean(RuntimeProviderCompatibilityValidator.class);
            assertThat(context.getBean(RuntimeProviderRegistry.class).resolveRequired("demo-mongo-readonly"))
                    .isInstanceOf(MongoRuntimeDataProvider.class);
        });
    }

    @Test
    void registersThePluginRuntimeGateway() {
        contextRunner.run(context -> assertThat(context.getBean(OntologyRuntimeGateway.class))
                .isInstanceOf(com.celanworksmith.ontology.datasource.OntologySnapshotRuntimeGateway.class));
    }

    @Test
    void registersTheOntologyDatasourceLifecycleService() {
        contextRunner.run(context -> assertThat(context).hasSingleBean(OntologyDatasourceService.class));
    }

    @Test
    void selectsProductionPlaceholdersExplicitly() {
        contextRunner
                .withPropertyValues(
                        "celanworksmith.ontology.provider=production", "celanworksmith.runtime.provider=production")
                .run(context -> {
                    assertThat(context.getBean(OntologyProvider.class))
                            .isInstanceOf(OntologyProjectBackedProvider.class);
                    assertThat(context.getBeansOfType(ProductionOntologyProvider.class))
                            .hasSize(1);
                    assertThat(context.getBean(RuntimeProvider.class)).isInstanceOf(ProductionRuntimeProvider.class);
                    StepVerifier.create(context.getBean(OntologyProvider.class).getObjectTypes())
                            .expectErrorSatisfies(error -> assertThat(error)
                                    .isInstanceOf(CelanWorksmithException.class)
                                    .hasMessageContaining("Production ontology provider is not configured"))
                            .verify();
                });
    }
}
