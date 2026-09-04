package com.celanworksmith.ontology.datasource;

import com.appsmith.external.models.Datasource;
import com.appsmith.external.models.DatasourceStorageDTO;
import com.appsmith.server.acl.AclPermission;
import com.appsmith.server.datasources.base.DatasourceService;
import com.appsmith.server.domains.Plugin;
import com.appsmith.server.plugins.base.PluginService;
import com.appsmith.server.services.WorkspaceService;
import com.celanworksmith.ontology.datasource.dto.ImportOntologyDatasourceRequest;
import com.celanworksmith.ontology.release.OntologyModelReleaseMapper;
import com.celanworksmith.ontology.release.OntologyModelReleaseParser;
import com.celanworksmith.runtime.adapter.mongodb.MongoRuntimeDataProvider;
import com.celanworksmith.runtime.port.RuntimeProvider;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.mongodb.reactivestreams.client.MongoClient;
import com.mongodb.reactivestreams.client.MongoClients;
import org.bson.Document;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.data.mongodb.core.ReactiveMongoTemplate;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.utility.DockerImageName;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ReleaseJsonDatasourceIntegrationTest {
    private static final String WORKSPACE_ID = "workspace-business";
    private static final String PROVIDER_ID = "demo-mongo-readonly";
    private static final String DATABASE = "release_json_import_integration";
    private static final GenericContainer<?> MONGO =
            new GenericContainer<>(DockerImageName.parse("mongo:8")).withExposedPorts(27017);
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private static MongoClient mongoClient;
    private static OntologyMetadataSnapshotRepository snapshotRepository;
    private static OntologySnapshotService snapshotService;
    private static OntologyRuntimeGateway gateway;

    @BeforeAll
    static void startMongoAndSeedReleaseAssets() {
        MONGO.start();
        mongoClient = MongoClients.create("mongodb://" + MONGO.getHost() + ":" + MONGO.getMappedPort(27017));
        ReactiveMongoTemplate template = new ReactiveMongoTemplate(mongoClient, DATABASE);
        seed(template, "ont_supplier");
        seed(template, "ont_customer");
        seed(template, "ont_contract");
        seed(template, "ont_purchase_order");

        snapshotRepository = new OntologyMetadataSnapshotRepository(mongoClient, DATABASE);
        snapshotService = new OntologySnapshotService(snapshotRepository, Clock.systemUTC());
        RuntimeProvider provider = new MongoRuntimeDataProvider(
                template, mock(com.celanworksmith.application.CelanworksmithApplicationBindingResolver.class));
        gateway = new OntologySnapshotRuntimeGateway(snapshotService, new RuntimeProviderRegistry(List.of(provider)));
    }

    @AfterAll
    static void stopMongo() {
        if (mongoClient != null) mongoClient.close();
        MONGO.stop();
    }

    @Test
    void importsTheReleaseAndQueriesAllFourGeneratedAssetsThroughTheNativeGateway() {
        OntologyRuntimeGateway.Snapshot snapshot = importRelease();

        assertObjects(snapshot, "supplier", 15);
        assertObjects(snapshot, "customer", 75);
        assertObjects(snapshot, "contract", 260);
        assertObjects(snapshot, "purchase_order", 95);

        StepVerifier.create(gateway.queryObjects(
                        snapshot,
                        "supplier",
                        query(JsonNodeFactory.instance.objectNode().put("supplier_code", "SUP-001"), 0, 10)))
                .assertNext(result -> {
                    assertThat(result.total()).isEqualTo(1);
                    assertThat(result.items()).singleElement().satisfies(item -> assertThat(item.get("supplier_name"))
                            .asString()
                            .contains("供应商"));
                })
                .verifyComplete();

        StepVerifier.create(gateway.queryObjects(snapshot, "contract", query(null, 1, 2)))
                .assertNext(result -> {
                    assertThat(result.items()).hasSize(2);
                    assertThat(result.offset()).isEqualTo(1);
                    assertThat(result.limit()).isEqualTo(2);
                    assertThat(result.total()).isEqualTo(260);
                })
                .verifyComplete();

        StepVerifier.create(gateway.resolveLink(snapshot, "contract", "CTR-1", "contract_customer"))
                .assertNext(customers -> assertThat(customers).singleElement().satisfies(customer -> assertThat(
                                customer.get("customer_name"))
                        .asString()
                        .contains("客户")))
                .verifyComplete();
    }

    private static OntologyRuntimeGateway.Snapshot importRelease() {
        WorkspaceService workspaceService = mock(WorkspaceService.class);
        DatasourceService datasourceService = mock(DatasourceService.class);
        PluginService pluginService = mock(PluginService.class);
        AtomicReference<Datasource> created = new AtomicReference<>();
        String datasourceId = "release-json-" + UUID.randomUUID();
        when(workspaceService.findById(WORKSPACE_ID, AclPermission.WORKSPACE_MANAGE_DATASOURCES))
                .thenReturn(Mono.just(mock(com.appsmith.server.domains.Workspace.class)));
        Plugin plugin = new Plugin();
        plugin.setId("celanworksmith-ontology-plugin-id");
        plugin.setPackageName(OntologyDatasourceService.PLUGIN_PACKAGE_NAME);
        when(pluginService.findByPackageName(OntologyDatasourceService.PLUGIN_PACKAGE_NAME))
                .thenReturn(Mono.just(plugin));
        when(datasourceService.create(any())).thenAnswer(invocation -> {
            Datasource datasource = invocation.getArgument(0);
            datasource.setId(datasourceId);
            created.set(datasource);
            return Mono.just(datasource);
        });
        when(datasourceService.updateDatasourceStorage(any(), eq(""), eq(true))).thenAnswer(invocation -> {
            DatasourceStorageDTO storage = invocation.getArgument(0);
            created.get().setDatasourceStorages(Map.of("", storage));
            return Mono.just(created.get());
        });

        OntologyProjectImportSource importer = new LocalReleaseJsonOntologyProjectImporter(
                snapshotService,
                new WorkspaceDomainRuntimeBindingResolver(
                        new ReleaseRuntimeBindingProperties(List.of(new ReleaseRuntimeBindingProperties.Binding(
                                WORKSPACE_ID,
                                "business",
                                "managed:business-demo",
                                PROVIDER_ID,
                                List.of(
                                        "${source_dataset_id}:public.ont_supplier",
                                        "${source_dataset_id}:public.ont_customer",
                                        "${source_dataset_id}:public.ont_contract",
                                        "${source_dataset_id}:public.ont_purchase_order"))))),
                new OntologyModelReleaseParser(),
                new OntologyModelReleaseMapper());
        OntologyDatasourceService service = new OntologyDatasourceService(
                workspaceService,
                datasourceService,
                pluginService,
                List.of(importer),
                new RuntimeProviderCompatibilityValidator(
                        new RuntimeProviderRegistry(List.of(new MongoRuntimeDataProvider(
                                new ReactiveMongoTemplate(mongoClient, DATABASE),
                                mock(
                                        com.celanworksmith.application.CelanworksmithApplicationBindingResolver
                                                .class))))));

        StepVerifier.create(service.importDatasource(new ImportOntologyDatasourceRequest(
                        WORKSPACE_ID,
                        "Business Release JSON",
                        new OntologyProjectImportRequest(
                                OntologyProjectImportSource.Kind.LOCAL_RELEASE_JSON,
                                fixtureBytes(),
                                "business-release.json",
                                "ignored-by-release-import",
                                "integration-test"),
                        "release import integration")))
                .assertNext(summary -> assertThat(summary.datasourceId()).isEqualTo(datasourceId))
                .verifyComplete();

        Map<String, String> properties =
                created.get().getDatasourceStorages().get("").getDatasourceConfiguration().getProperties().stream()
                        .collect(java.util.stream.Collectors.toMap(
                                property -> property.getKey(), property -> String.valueOf(property.getValue())));
        return gateway.getRequiredSnapshot(properties.get("metadataSnapshotId"), properties.get("metadataDigest"))
                .block();
    }

    private static void assertObjects(
            OntologyRuntimeGateway.Snapshot snapshot, String objectTypeId, long expectedTotal) {
        StepVerifier.create(gateway.queryObjects(snapshot, objectTypeId, query(null, 0, 10)))
                .assertNext(result -> {
                    assertThat(result.items()).isNotEmpty();
                    assertThat(result.total()).isEqualTo(expectedTotal);
                })
                .verifyComplete();
    }

    private static OntologyRuntimeGateway.ObjectQuery query(
            com.fasterxml.jackson.databind.JsonNode filter, int offset, int limit) {
        return new OntologyRuntimeGateway.ObjectQuery(List.of(), filter, null, "asc", offset, limit);
    }

    private static void seed(ReactiveMongoTemplate template, String collection) {
        try {
            List<Map<String, Object>> rows = OBJECT_MAPPER.readValue(
                    Files.readString(Path.of("../../../scripts/celanworksmith/runtime-data/" + collection + ".json")),
                    new TypeReference<>() {});
            reactor.core.publisher.Flux.fromIterable(rows)
                    .concatMap(row -> template.save(new Document(row), collection))
                    .then()
                    .block();
        } catch (IOException exception) {
            throw new IllegalStateException("Could not seed " + collection, exception);
        }
    }

    private static byte[] fixtureBytes() {
        try {
            return Files.readAllBytes(Path.of("../../../docs/superpowers/fixtures/ontology-model-release-demo.json"));
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read Release fixture", exception);
        }
    }
}
