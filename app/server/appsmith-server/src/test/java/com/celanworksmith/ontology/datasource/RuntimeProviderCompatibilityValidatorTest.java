package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import com.celanworksmith.runtime.port.RuntimeProvider;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;
import reactor.test.StepVerifier;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class RuntimeProviderCompatibilityValidatorTest {
    @Test
    void resolvesTheRegisteredDemoProvider() {
        RuntimeProvider provider =
                provider("demo-mongo-readonly", Map.of("PurchaseOrder", Map.of("amount", "DECIMAL")));
        RuntimeProviderRegistry registry = new RuntimeProviderRegistry(List.of(provider));

        assertThat(registry.resolveRequired("demo-mongo-readonly")).isSameAs(provider);
    }

    @Test
    void rejectsAnUnknownProvider() {
        RuntimeProviderRegistry registry = new RuntimeProviderRegistry(List.of());

        org.junit.jupiter.api.Assertions.assertThrows(
                IllegalArgumentException.class, () -> registry.resolveRequired("missing-provider"));
    }

    @Test
    void reportsAMissingObjectMapping() {
        RuntimeProviderCompatibilityValidator validator = new RuntimeProviderCompatibilityValidator(
                new RuntimeProviderRegistry(List.of(provider("demo-mongo-readonly", Map.of()))));

        StepVerifier.create(validator.validate(snapshot(), "demo-mongo-readonly"))
                .assertNext(result -> {
                    assertThat(result.compatible()).isFalse();
                    assertThat(result.errors()).contains("Missing Object mapping: PurchaseOrder");
                })
                .verifyComplete();
    }

    @Test
    void reportsAnIncompatiblePropertyType() {
        RuntimeProviderCompatibilityValidator validator =
                new RuntimeProviderCompatibilityValidator(new RuntimeProviderRegistry(
                        List.of(provider("demo-mongo-readonly", Map.of("PurchaseOrder", Map.of("amount", "STRING"))))));

        StepVerifier.create(validator.validate(snapshot(), "demo-mongo-readonly"))
                .assertNext(result -> {
                    assertThat(result.compatible()).isFalse();
                    assertThat(result.errors()).contains("Incompatible property type: PurchaseOrder.amount");
                })
                .verifyComplete();
    }

    @Test
    void validatesTheDemoSnapshotAgainstAHealthyProvider() {
        RuntimeProviderCompatibilityValidator validator =
                new RuntimeProviderCompatibilityValidator(new RuntimeProviderRegistry(List.of(
                        provider("demo-mongo-readonly", Map.of("PurchaseOrder", Map.of("amount", "DECIMAL"))))));

        StepVerifier.create(validator.validate(snapshot(), "demo-mongo-readonly"))
                .assertNext(result -> {
                    assertThat(result.compatible()).isTrue();
                    assertThat(result.errors()).isEmpty();
                })
                .verifyComplete();
    }

    @Test
    void reportsDeprecatedSnapshotAsWarningWhenProviderIsCompatible() {
        RuntimeProviderCompatibilityValidator validator =
                new RuntimeProviderCompatibilityValidator(new RuntimeProviderRegistry(List.of(
                        provider("demo-mongo-readonly", Map.of("PurchaseOrder", Map.of("amount", "DECIMAL"))))));
        OntologyMetadataSnapshot snapshot = snapshot();
        snapshot = new OntologyMetadataSnapshot(
                snapshot.id(),
                snapshot.projectId(),
                snapshot.projectVersion(),
                snapshot.sourceKind(),
                snapshot.sourceReleaseId(),
                snapshot.runtimeProviderId(),
                snapshot.createdBy(),
                snapshot.createdAt(),
                snapshot.metadataDigest(),
                snapshot.definition(),
                true);

        StepVerifier.create(validator.validate(snapshot, "demo-mongo-readonly"))
                .assertNext(result -> {
                    assertThat(result.compatible()).isTrue();
                    assertThat(result.errors()).isEmpty();
                    assertThat(result.warnings())
                            .containsExactly("Ontology metadata snapshot is deprecated but compatible");
                })
                .verifyComplete();
    }

    @Test
    void makesProviderCapabilitiesDeeplyImmutable() {
        RuntimeProvider.RuntimeMetadataCapabilities capabilities =
                new RuntimeProvider.RuntimeMetadataCapabilities(Map.of("PurchaseOrder", Map.of("amount", "DECIMAL")));

        org.junit.jupiter.api.Assertions.assertThrows(
                UnsupportedOperationException.class,
                () -> capabilities.objectProperties().get("PurchaseOrder").put("status", "ENUM"));
    }

    private RuntimeProvider provider(String providerId, Map<String, Map<String, String>> capabilities) {
        return new RuntimeProvider() {
            @Override
            public String providerId() {
                return providerId;
            }

            @Override
            public Mono<RuntimeMetadataCapabilities> metadataCapabilities() {
                return Mono.just(new RuntimeMetadataCapabilities(capabilities));
            }

            @Override
            public Mono<com.celanworksmith.runtime.dto.ObjectSetResult> queryObjects(
                    String typeId, com.celanworksmith.runtime.dto.ObjectSetQuery query) {
                return Mono.error(new UnsupportedOperationException());
            }

            @Override
            public Mono<com.celanworksmith.runtime.dto.ObjectInstanceDTO> getObject(String typeId, String instanceId) {
                return Mono.error(new UnsupportedOperationException());
            }

            @Override
            public Mono<com.celanworksmith.runtime.dto.ObjectSetResult> getLinks(
                    String typeId,
                    String instanceId,
                    String linkTypeId,
                    com.celanworksmith.runtime.dto.ObjectSetQuery query) {
                return Mono.error(new UnsupportedOperationException());
            }

            @Override
            public Mono<com.celanworksmith.runtime.dto.ActionResult> executeAction(
                    String actionId, com.celanworksmith.runtime.dto.ActionExecutionRequest request) {
                return Mono.error(new UnsupportedOperationException());
            }

            @Override
            public Mono<Object> executeFunction(
                    String functionId, com.celanworksmith.runtime.dto.FunctionExecutionRequest request) {
                return Mono.error(new UnsupportedOperationException());
            }

            @Override
            public Mono<com.celanworksmith.runtime.dto.ReasoningResult> reason(
                    com.celanworksmith.runtime.dto.ReasoningRequest request) {
                return Mono.error(new UnsupportedOperationException());
            }
        };
    }

    private OntologyMetadataSnapshot snapshot() {
        OntologyProjectDefinition definition = new OntologyProjectDefinition(
                "celanworksmith-demo",
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
        return new OntologyMetadataSnapshot(
                "snapshot-1",
                definition.projectId(),
                definition.version(),
                "demo",
                "builtin-demo",
                "demo-mongo-readonly",
                "admin-1",
                Instant.parse("2026-08-13T00:00:00Z"),
                "sha256:" + "a".repeat(64),
                definition);
    }
}
