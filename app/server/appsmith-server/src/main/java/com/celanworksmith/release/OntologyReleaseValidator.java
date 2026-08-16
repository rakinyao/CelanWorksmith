package com.celanworksmith.release;

import com.celanworksmith.ontology.datasource.OntologyMetadataSnapshot;
import com.celanworksmith.ontology.datasource.OntologyRuntimeGateway;
import com.celanworksmith.ontology.datasource.OntologyRuntimeSnapshotProjection;
import com.celanworksmith.ontology.datasource.OntologySnapshotService;
import com.celanworksmith.ontology.datasource.ProviderValidationResult;
import com.celanworksmith.ontology.datasource.RuntimeProviderCompatibilityValidator;
import com.celanworksmith.release.model.ReleaseDatasourcePin;
import com.celanworksmith.release.model.ReleaseDependency;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class OntologyReleaseValidator {
    private final OntologySnapshotService snapshotService;
    private final OntologyRuntimeGateway runtimeGateway;
    private final RuntimeProviderCompatibilityValidator compatibilityValidator;

    public OntologyReleaseValidator(
            OntologySnapshotService snapshotService,
            OntologyRuntimeGateway runtimeGateway,
            RuntimeProviderCompatibilityValidator compatibilityValidator) {
        this.snapshotService = snapshotService;
        this.runtimeGateway = runtimeGateway;
        this.compatibilityValidator = compatibilityValidator;
    }

    public Mono<List<ReleaseDiagnostic>> validate(ReleaseDatasourcePin pin, List<ReleaseDependency> dependencies) {
        return snapshotService
                .getRequiredSnapshot(pin.metadataSnapshotId(), pin.metadataDigest())
                .flatMap(snapshot -> providerValidation(pin, snapshot)
                        .flatMap(providerResult -> Mono.fromSupplier(() -> diagnostics(
                                pin,
                                dependencies,
                                providerResult,
                                snapshot,
                                OntologyRuntimeSnapshotProjection.project(snapshot))))
                        .onErrorResume(error -> Mono.just(List.of(providerDiagnostic(pin)))))
                .onErrorResume(error -> Mono.just(List.of(snapshotDiagnostic(pin, error))));
    }

    private List<ReleaseDiagnostic> diagnostics(
            ReleaseDatasourcePin pin,
            List<ReleaseDependency> dependencies,
            ProviderValidationResult providerResult,
            OntologyMetadataSnapshot persistedSnapshot,
            OntologyRuntimeGateway.Snapshot snapshot) {
        List<ReleaseDiagnostic> diagnostics = new ArrayList<>();
        if (providerResult != null) {
            if (!providerResult.compatible()) {
                for (String error : providerResult.errors()) {
                    diagnostics.add(providerDiagnostic(pin));
                }
            }
            for (String warning : providerResult.warnings()) {
                diagnostics.add(new ReleaseDiagnostic(
                        ReleaseDiagnostic.Severity.WARNING,
                        "RELEASE_ONTOLOGY_METADATA_DEPRECATED",
                        datasourcePath(pin) + ".metadataSnapshot",
                        "Referenced ontology metadata is deprecated but compatible",
                        Map.of()));
            }
        }
        if (projectChanged(pin, persistedSnapshot)) {
            diagnostics.add(new ReleaseDiagnostic(
                    ReleaseDiagnostic.Severity.INFO,
                    "RELEASE_ONTOLOGY_PROJECT_VERSION_CHANGED",
                    datasourcePath(pin) + ".metadataSnapshot",
                    "Ontology project or version changed",
                    projectDetails(persistedSnapshot)));
        }
        for (ReleaseDependency dependency : dependencies) {
            if (!pin.datasourceId().equals(dependency.datasourceId()) || !missing(snapshot, dependency)) {
                continue;
            }
            diagnostics.add(new ReleaseDiagnostic(
                    ReleaseDiagnostic.Severity.BLOCKING,
                    "RELEASE_ONTOLOGY_METADATA_NOT_FOUND",
                    dependency.path(),
                    "Referenced ontology metadata was not found",
                    Map.of()));
        }
        return diagnostics;
    }

    private Mono<ProviderValidationResult> providerValidation(
            ReleaseDatasourcePin pin, OntologyMetadataSnapshot snapshot) {
        if (!pin.providerId().equals(snapshot.runtimeProviderId())) {
            return Mono.just(new ProviderValidationResult(false, List.of("provider identity mismatch")));
        }
        return compatibilityValidator.validate(snapshot, pin.providerId());
    }

    private boolean projectChanged(ReleaseDatasourcePin pin, OntologyMetadataSnapshot snapshot) {
        return pin.projectId() != null
                && pin.projectVersion() != null
                && (!pin.projectId().equals(snapshot.projectId())
                        || !pin.projectVersion().equals(snapshot.projectVersion()));
    }

    private Map<String, Object> projectDetails(OntologyMetadataSnapshot snapshot) {
        Map<String, Object> details = new java.util.LinkedHashMap<>();
        if (snapshot.projectId() != null) {
            details.put("projectId", snapshot.projectId());
        }
        if (snapshot.projectVersion() != null) {
            details.put("projectVersion", snapshot.projectVersion());
        }
        return details;
    }

    private boolean missing(OntologyRuntimeGateway.Snapshot snapshot, ReleaseDependency dependency) {
        return switch (dependency.kind()) {
            case "OBJECT_TYPE" ->
                snapshot.objectTypes().stream()
                        .noneMatch(item -> dependency.referenceId().equals(item.id()));
            case "PROPERTY" ->
                snapshot.objectTypes().stream()
                        .flatMap(item -> item.properties().stream())
                        .noneMatch(item -> dependency.referenceId().equals(item.id()));
            case "FUNCTION" ->
                snapshot.functions().stream()
                        .noneMatch(item -> dependency.referenceId().equals(item.id()));
            case "LINK" ->
                snapshot.links().stream()
                        .noneMatch(item -> dependency.referenceId().equals(item.id()));
            case "ONTOLOGY_ACTION" ->
                snapshot.actions().stream()
                        .noneMatch(item -> dependency.referenceId().equals(item.id()));
            default -> false;
        };
    }

    private ReleaseDiagnostic snapshotDiagnostic(ReleaseDatasourcePin pin, Throwable error) {
        String code = error instanceof OntologySnapshotService.SnapshotDigestMismatchException
                ? "RELEASE_ONTOLOGY_SNAPSHOT_DIGEST_MISMATCH"
                : "RELEASE_ONTOLOGY_SNAPSHOT_UNAVAILABLE";
        String message = code.endsWith("MISMATCH")
                ? "Ontology metadata snapshot digest does not match"
                : "Ontology metadata snapshot is unavailable";
        return new ReleaseDiagnostic(
                ReleaseDiagnostic.Severity.BLOCKING,
                code,
                datasourcePath(pin) + ".metadataSnapshot",
                message,
                Map.of());
    }

    private ReleaseDiagnostic providerDiagnostic(ReleaseDatasourcePin pin) {
        return new ReleaseDiagnostic(
                ReleaseDiagnostic.Severity.BLOCKING,
                "RELEASE_ONTOLOGY_PROVIDER_INCOMPATIBLE",
                datasourcePath(pin) + ".providerId",
                "Runtime provider metadata mapping is incompatible",
                Map.of());
    }

    private String datasourcePath(ReleaseDatasourcePin pin) {
        return "datasources[" + pin.datasourceId() + "]";
    }
}
