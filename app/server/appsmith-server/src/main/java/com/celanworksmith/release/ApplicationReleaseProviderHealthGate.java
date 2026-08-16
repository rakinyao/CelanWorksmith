package com.celanworksmith.release;

import com.celanworksmith.ontology.datasource.OntologyMetadataSnapshot;
import com.celanworksmith.ontology.datasource.OntologySnapshotService;
import com.celanworksmith.ontology.datasource.ProviderValidationResult;
import com.celanworksmith.ontology.datasource.RuntimeProviderCompatibilityValidator;
import com.celanworksmith.release.model.ReleaseDatasourcePin;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

public class ApplicationReleaseProviderHealthGate {
    private final OntologySnapshotService snapshotService;
    private final RuntimeProviderCompatibilityValidator compatibilityValidator;

    public ApplicationReleaseProviderHealthGate(
            OntologySnapshotService snapshotService, RuntimeProviderCompatibilityValidator compatibilityValidator) {
        this.snapshotService = snapshotService;
        this.compatibilityValidator = compatibilityValidator;
    }

    public Mono<List<ReleaseDiagnostic>> check(List<ReleaseDatasourcePin> pins) {
        return Flux.fromIterable(pins == null ? List.of() : pins)
                .filter(pin -> pin != null && "ONTOLOGY".equals(pin.kind()))
                .concatMap(pin -> checkPin(pin).onErrorResume(error -> Mono.just(snapshotDiagnostic(pin, error))))
                .collectList();
    }

    private Mono<ReleaseDiagnostic> checkPin(ReleaseDatasourcePin pin) {
        return snapshotService
                .getRequiredSnapshot(pin.metadataSnapshotId(), pin.metadataDigest())
                .flatMap(snapshot -> validateProvider(pin, snapshot)
                        .flatMap(result -> result.compatible() ? Mono.empty() : Mono.just(providerDiagnostic(pin)))
                        .onErrorResume(error -> Mono.just(providerErrorDiagnostic(pin, error))))
                .onErrorResume(error -> Mono.just(snapshotDiagnostic(pin, error)));
    }

    private Mono<ProviderValidationResult> validateProvider(
            ReleaseDatasourcePin pin, OntologyMetadataSnapshot snapshot) {
        if (!pin.providerId().equals(snapshot.runtimeProviderId())) {
            return Mono.just(new ProviderValidationResult(false, List.of("provider identity mismatch")));
        }
        return Mono.defer(() -> compatibilityValidator.validate(snapshot, pin.providerId()));
    }

    private ReleaseDiagnostic providerErrorDiagnostic(ReleaseDatasourcePin pin, Throwable error) {
        if (error instanceof IllegalArgumentException
                && error.getMessage() != null
                && error.getMessage().contains("Runtime Provider")) {
            return new ReleaseDiagnostic(
                    ReleaseDiagnostic.Severity.BLOCKING,
                    "RELEASE_ONTOLOGY_PROVIDER_UNAVAILABLE",
                    providerPath(pin),
                    "Runtime provider is unavailable",
                    Map.of());
        }
        return providerDiagnostic(pin);
    }

    private ReleaseDiagnostic providerDiagnostic(ReleaseDatasourcePin pin) {
        return new ReleaseDiagnostic(
                ReleaseDiagnostic.Severity.BLOCKING,
                "RELEASE_ONTOLOGY_PROVIDER_INCOMPATIBLE",
                providerPath(pin),
                "Runtime provider metadata mapping is incompatible",
                Map.of());
    }

    private ReleaseDiagnostic snapshotDiagnostic(ReleaseDatasourcePin pin, Throwable error) {
        boolean digestMismatch = error instanceof OntologySnapshotService.SnapshotDigestMismatchException;
        return new ReleaseDiagnostic(
                ReleaseDiagnostic.Severity.BLOCKING,
                digestMismatch ? "RELEASE_ONTOLOGY_SNAPSHOT_DIGEST_MISMATCH" : "RELEASE_ONTOLOGY_SNAPSHOT_UNAVAILABLE",
                "datasources[" + pin.datasourceId() + "].metadataSnapshot",
                digestMismatch
                        ? "Ontology metadata snapshot digest does not match"
                        : "Ontology metadata snapshot is unavailable",
                Map.of());
    }

    private String providerPath(ReleaseDatasourcePin pin) {
        return "datasources[" + pin.datasourceId() + "].providerId";
    }
}
