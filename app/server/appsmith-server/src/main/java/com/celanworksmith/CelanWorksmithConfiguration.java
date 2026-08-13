package com.celanworksmith;

import com.appsmith.server.datasources.base.DatasourceService;
import com.appsmith.server.repositories.NewActionRepository;
import com.appsmith.server.services.WorkspaceService;
import com.celanworksmith.application.CelanworksmithApplicationBindingRepository;
import com.celanworksmith.application.CelanworksmithApplicationBindingResolver;
import com.celanworksmith.application.CelanworksmithApplicationBindingService;
import com.celanworksmith.ontology.adapter.mock.MockOntologyProvider;
import com.celanworksmith.ontology.adapter.production.ProductionOntologyProvider;
import com.celanworksmith.ontology.adapter.project.OntologyProjectBackedProvider;
import com.celanworksmith.ontology.datasource.DemoOntologyProjectBootstrap;
import com.celanworksmith.ontology.datasource.LocalYamlOntologyProjectImporter;
import com.celanworksmith.ontology.datasource.OntologyDatasourceCompatibilityService;
import com.celanworksmith.ontology.datasource.OntologyDatasourceService;
import com.celanworksmith.ontology.datasource.OntologyDatasourceUpgradeService;
import com.celanworksmith.ontology.datasource.OntologyMetadataSnapshotRepository;
import com.celanworksmith.ontology.datasource.OntologyProjectImportSource;
import com.celanworksmith.ontology.datasource.OntologySnapshotService;
import com.celanworksmith.ontology.datasource.PlatformOntologyProjectImporter;
import com.celanworksmith.ontology.datasource.RuntimeProviderCompatibilityValidator;
import com.celanworksmith.ontology.datasource.RuntimeProviderRegistry;
import com.celanworksmith.ontology.persistence.OntologyProjectRegistry;
import com.celanworksmith.ontology.port.OntologyProvider;
import com.celanworksmith.ontology.project.OntologyProjectYamlImporter;
import com.celanworksmith.ontology.service.OntologyProjectService;
import com.celanworksmith.runtime.adapter.mongodb.MongoRuntimeDataProvider;
import com.celanworksmith.runtime.adapter.mongodb.MongoRuntimeProperties;
import com.celanworksmith.runtime.adapter.production.ProductionRuntimeProvider;
import com.celanworksmith.runtime.mock.MockDataStore;
import com.celanworksmith.runtime.port.RuntimeProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.reactive.TransactionalOperator;

import java.io.IOException;
import java.time.Clock;
import java.util.List;

@Configuration
@EnableConfigurationProperties(MongoRuntimeProperties.class)
public class CelanWorksmithConfiguration {
    @Bean
    public OntologyProjectYamlImporter ontologyProjectYamlImporter() {
        return new OntologyProjectYamlImporter();
    }

    @Bean
    public OntologyProjectService ontologyProjectService(
            OntologyProjectRegistry registry, OntologyProjectYamlImporter importer) {
        return new OntologyProjectService(registry, importer);
    }

    @Bean
    public OntologySnapshotService ontologySnapshotService(OntologyMetadataSnapshotRepository repository) {
        return new OntologySnapshotService(repository, Clock.systemUTC());
    }

    @Bean
    public RuntimeProviderRegistry runtimeProviderRegistry(List<RuntimeProvider> runtimeProviders) {
        return new RuntimeProviderRegistry(runtimeProviders);
    }

    @Bean
    public RuntimeProviderCompatibilityValidator runtimeProviderCompatibilityValidator(
            RuntimeProviderRegistry runtimeProviderRegistry) {
        return new RuntimeProviderCompatibilityValidator(runtimeProviderRegistry);
    }

    @Bean
    public LocalYamlOntologyProjectImporter localYamlOntologyProjectImporter(OntologySnapshotService snapshotService) {
        return new LocalYamlOntologyProjectImporter(snapshotService);
    }

    @Bean
    public PlatformOntologyProjectImporter platformOntologyProjectImporter(OntologySnapshotService snapshotService) {
        return new PlatformOntologyProjectImporter(
                releaseId -> reactor.core.publisher.Mono.error(
                        new IllegalStateException("Ontology platform release client is not configured: " + releaseId)),
                snapshotService);
    }

    @Bean
    public DemoOntologyProjectBootstrap demoOntologyProjectBootstrap(LocalYamlOntologyProjectImporter yamlImporter) {
        try (var resource = getClass().getResourceAsStream("/celanworksmith/demo-ontology-project.yaml")) {
            if (resource == null) {
                throw new IllegalStateException("Demo ontology project resource is missing");
            }
            return new DemoOntologyProjectBootstrap(yamlImporter, resource.readAllBytes());
        } catch (IOException exception) {
            throw new IllegalStateException("Could not load demo ontology project resource", exception);
        }
    }

    @Bean
    public OntologyDatasourceService ontologyDatasourceService(
            WorkspaceService workspaceService,
            DatasourceService datasourceService,
            List<OntologyProjectImportSource> importers,
            RuntimeProviderCompatibilityValidator compatibilityValidator) {
        return new OntologyDatasourceService(workspaceService, datasourceService, importers, compatibilityValidator);
    }

    @Bean
    public OntologyDatasourceCompatibilityService ontologyDatasourceCompatibilityService(
            DatasourceService datasourceService,
            NewActionRepository actionRepository,
            OntologyMetadataSnapshotRepository snapshotRepository) {
        return new OntologyDatasourceCompatibilityService(datasourceService, actionRepository, snapshotRepository);
    }

    @Bean
    public OntologyDatasourceUpgradeService ontologyDatasourceUpgradeService(
            DatasourceService datasourceService,
            NewActionRepository actionRepository,
            OntologyDatasourceCompatibilityService compatibilityService,
            OntologyDatasourceUpgradeService.AuditStore auditStore,
            TransactionalOperator transactionalOperator) {
        return new OntologyDatasourceUpgradeService(
                datasourceService,
                actionRepository,
                compatibilityService,
                auditStore,
                Clock.systemUTC(),
                transactionalOperator);
    }

    @Bean
    public CelanworksmithApplicationBindingService celanworksmithApplicationBindingService(
            CelanworksmithApplicationBindingRepository repository, OntologyProjectRegistry registry) {
        return new CelanworksmithApplicationBindingService(repository, registry);
    }

    @Bean
    public CelanworksmithApplicationBindingResolver celanworksmithApplicationBindingResolver(
            CelanworksmithApplicationBindingRepository repository, OntologyProjectRegistry registry) {
        return new CelanworksmithApplicationBindingResolver(repository, registry);
    }

    @Bean
    @ConditionalOnProperty(name = "celanworksmith.ontology.provider", havingValue = "mock")
    public MockOntologyProvider mockOntologyProvider() {
        return new MockOntologyProvider();
    }

    @Bean
    @ConditionalOnProperty(name = "celanworksmith.ontology.provider", havingValue = "production", matchIfMissing = true)
    public ProductionOntologyProvider productionOntologyProvider() {
        return new ProductionOntologyProvider();
    }

    @Bean
    @Primary
    @ConditionalOnProperty(name = "celanworksmith.ontology.provider", havingValue = "mock")
    public OntologyProvider ontologyProviderFromMock(
            @Qualifier("mockOntologyProvider") OntologyProvider legacyProvider,
            CelanworksmithApplicationBindingResolver resolver) {
        return new OntologyProjectBackedProvider(legacyProvider, resolver);
    }

    @Bean
    @Primary
    @ConditionalOnProperty(name = "celanworksmith.ontology.provider", havingValue = "production", matchIfMissing = true)
    public OntologyProvider ontologyProviderFromProduction(
            @Qualifier("productionOntologyProvider") OntologyProvider legacyProvider,
            CelanworksmithApplicationBindingResolver resolver) {
        return new OntologyProjectBackedProvider(legacyProvider, resolver);
    }

    @Bean
    @ConditionalOnProperty(name = "celanworksmith.runtime.provider", havingValue = "mock")
    public MockDataStore mockDataStore() {
        return new MockDataStore();
    }

    @Bean
    @ConditionalOnProperty(name = "celanworksmith.runtime.provider", havingValue = "mock")
    public RuntimeProvider mockRuntimeProvider(
            MockDataStore dataStore,
            CelanworksmithApplicationBindingResolver resolver,
            MongoRuntimeProperties properties) {
        return new MongoRuntimeDataProvider(properties, resolver, dataStore);
    }

    @Bean
    @ConditionalOnProperty(name = "celanworksmith.runtime.provider", havingValue = "mongodb", matchIfMissing = true)
    public RuntimeProvider mongoRuntimeProvider(
            MongoRuntimeProperties properties, CelanworksmithApplicationBindingResolver resolver) {
        return new MongoRuntimeDataProvider(properties, resolver);
    }

    @Bean
    @ConditionalOnProperty(name = "celanworksmith.runtime.provider", havingValue = "production")
    public RuntimeProvider productionRuntimeProvider() {
        return new ProductionRuntimeProvider();
    }
}
