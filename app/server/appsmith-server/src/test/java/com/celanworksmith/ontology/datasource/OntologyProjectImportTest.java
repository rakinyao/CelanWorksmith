package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OntologyProjectImportTest {
    private static final Clock FIXED_CLOCK = Clock.fixed(Instant.parse("2026-08-13T00:00:00Z"), ZoneOffset.UTC);

    @Test
    void importsAValidLocalYamlProjectAsAPinnedSnapshot() {
        LocalYamlOntologyProjectImporter importer = new LocalYamlOntologyProjectImporter(snapshotService());

        StepVerifier.create(importer.importProject(new OntologyProjectImportRequest(
                        OntologyProjectImportSource.Kind.LOCAL_YAML,
                        validYaml(),
                        "local-upload-1",
                        "demo-mongo-readonly",
                        "admin-1")))
                .assertNext(snapshot -> {
                    assertThat(snapshot.projectId()).isEqualTo("supply-chain");
                    assertThat(snapshot.projectVersion()).isEqualTo("1.0.0");
                    assertThat(snapshot.sourceKind()).isEqualTo("local-yaml");
                    assertThat(snapshot.runtimeProviderId()).isEqualTo("demo-mongo-readonly");
                })
                .verifyComplete();
    }

    @Test
    void importsAPlatformReleaseUsingTheRequestedReleaseOnly() {
        PlatformOntologyProjectImporter.ReleaseClient client =
                mock(PlatformOntologyProjectImporter.ReleaseClient.class);
        when(client.fetchRelease("release-2026-08"))
                .thenReturn(Mono.just(new PlatformOntologyProjectImporter.Release(
                        definition(), "platform-mongo-readonly", "Release notes")));
        PlatformOntologyProjectImporter importer = new PlatformOntologyProjectImporter(client, snapshotService());

        StepVerifier.create(importer.importProject(new OntologyProjectImportRequest(
                        OntologyProjectImportSource.Kind.PLATFORM_RELEASE, null, "release-2026-08", null, "admin-1")))
                .assertNext(snapshot -> {
                    assertThat(snapshot.sourceKind()).isEqualTo("platform-release");
                    assertThat(snapshot.sourceReleaseId()).isEqualTo("release-2026-08");
                    assertThat(snapshot.runtimeProviderId()).isEqualTo("platform-mongo-readonly");
                })
                .verifyComplete();

        verify(client).fetchRelease("release-2026-08");
    }

    @Test
    void rejectsRequestsForAnotherSourceKind() {
        LocalYamlOntologyProjectImporter importer = new LocalYamlOntologyProjectImporter(snapshotService());

        StepVerifier.create(importer.importProject(new OntologyProjectImportRequest(
                        OntologyProjectImportSource.Kind.DEMO, validYaml(), "demo", "demo-mongo-readonly", "admin-1")))
                .expectError(IllegalArgumentException.class)
                .verify();
    }

    @Test
    void rejectsMalformedLocalYamlMetadata() {
        LocalYamlOntologyProjectImporter importer = new LocalYamlOntologyProjectImporter(snapshotService());

        StepVerifier.create(importer.importProject(new OntologyProjectImportRequest(
                        OntologyProjectImportSource.Kind.LOCAL_YAML,
                        "projectId: [not-a-string]".getBytes(StandardCharsets.UTF_8),
                        "local-upload-1",
                        "demo-mongo-readonly",
                        "admin-1")))
                .expectError(IllegalArgumentException.class)
                .verify();
    }

    @Test
    void bootstrapsTheFixedDemoProjectWithItsFixedProvider() {
        DemoOntologyProjectBootstrap bootstrap =
                new DemoOntologyProjectBootstrap(new LocalYamlOntologyProjectImporter(snapshotService()), demoYaml());

        StepVerifier.create(bootstrap.importDemo("admin-1"))
                .assertNext(snapshot -> {
                    assertThat(snapshot.projectId()).isEqualTo("celanworksmith-demo");
                    assertThat(snapshot.projectVersion()).isEqualTo("1.0.0");
                    assertThat(snapshot.sourceKind()).isEqualTo("demo");
                    assertThat(snapshot.runtimeProviderId()).isEqualTo("demo-mongo-readonly");
                    assertThat(snapshot.definition().objectTypes())
                            .extracting(ObjectTypeDTO::id, ObjectTypeDTO::runtimeTable)
                            .containsExactlyInAnyOrder(
                                    org.assertj.core.groups.Tuple.tuple("PurchaseOrder", "purchase_orders"),
                                    org.assertj.core.groups.Tuple.tuple("Supplier", "suppliers"));
                    assertThat(snapshot.definition().objectTypes().stream()
                                    .filter(objectType -> objectType.id().equals("Supplier"))
                                    .findFirst()
                                    .orElseThrow()
                                    .properties())
                            .extracting(PropertyDTO::id)
                            .containsExactly("name", "contactName", "riskLevel", "averageRating");
                    assertThat(snapshot.definition().objectTypes().stream()
                                    .filter(objectType -> objectType.id().equals("PurchaseOrder"))
                                    .findFirst()
                                    .orElseThrow()
                                    .properties())
                            .extracting(PropertyDTO::id)
                            .containsExactly(
                                    "supplierId",
                                    "status",
                                    "orderDate",
                                    "expectedDeliveryDate",
                                    "actualDeliveryDate",
                                    "amount",
                                    "delayDays");
                })
                .verifyComplete();
    }

    @Test
    void demoSourceIgnoresCallerSuppliedMetadataAndProvider() {
        DemoOntologyProjectBootstrap bootstrap =
                new DemoOntologyProjectBootstrap(new LocalYamlOntologyProjectImporter(snapshotService()), demoYaml());

        StepVerifier.create(bootstrap.importProject(new OntologyProjectImportRequest(
                        OntologyProjectImportSource.Kind.DEMO,
                        validYaml(),
                        "untrusted-release",
                        "untrusted-provider",
                        "admin-1")))
                .assertNext(snapshot -> {
                    assertThat(snapshot.projectId()).isEqualTo("celanworksmith-demo");
                    assertThat(snapshot.sourceReleaseId()).isEqualTo("builtin-demo");
                    assertThat(snapshot.runtimeProviderId()).isEqualTo("demo-mongo-readonly");
                })
                .verifyComplete();
    }

    private OntologySnapshotService snapshotService() {
        OntologyMetadataSnapshotRepository repository = mock(OntologyMetadataSnapshotRepository.class);
        when(repository.insert(any())).thenAnswer(invocation -> Mono.just(invocation.getArgument(0)));
        return new OntologySnapshotService(repository, FIXED_CLOCK);
    }

    private byte[] validYaml() {
        return """
                projectId: supply-chain
                version: 1.0.0
                schemaVersion: 1
                objectTypes:
                  - id: PurchaseOrder
                    displayName: Purchase Order
                    properties:
                      - id: amount
                        displayName: Amount
                        dataType: DECIMAL
                        required: true
                        readOnly: false
                        derived: false
                linkTypes: []
                functions: []
                actions: []
                """
                .getBytes(StandardCharsets.UTF_8);
    }

    private OntologyProjectDefinition definition() {
        return new OntologyProjectDefinition(
                "supply-chain",
                "1.0.0",
                1,
                List.of(new ObjectTypeDTO(
                        "PurchaseOrder",
                        "Purchase Order",
                        List.of(new PropertyDTO("amount", "Amount", "DECIMAL", true, false, false)),
                        null,
                        "id")),
                List.of(),
                List.of(),
                List.of());
    }

    private byte[] demoYaml() {
        try (var input = getClass().getResourceAsStream("/celanworksmith/demo-ontology-project.yaml")) {
            assertThat(input).isNotNull();
            return input.readAllBytes();
        } catch (IOException exception) {
            throw new IllegalStateException("Could not read demo ontology project", exception);
        }
    }
}
