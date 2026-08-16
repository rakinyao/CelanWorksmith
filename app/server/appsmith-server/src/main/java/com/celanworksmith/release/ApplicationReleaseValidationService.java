package com.celanworksmith.release;

import com.celanworksmith.release.model.ReleaseDatasourcePinExtractionResult;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import com.celanworksmith.release.model.ReleaseValidationResult;
import reactor.core.publisher.Mono;

import java.util.Comparator;
import java.util.List;

public class ApplicationReleaseValidationService {
    private final ReleaseDatasourcePinExtractor pinExtractor;
    private final ReleaseDependencyScanner dependencyScanner;
    private final OntologyReleaseValidator ontologyValidator;

    public ApplicationReleaseValidationService(
            ReleaseDatasourcePinExtractor pinExtractor,
            ReleaseDependencyScanner dependencyScanner,
            OntologyReleaseValidator ontologyValidator) {
        this.pinExtractor = pinExtractor;
        this.dependencyScanner = dependencyScanner;
        this.ontologyValidator = ontologyValidator;
    }

    public Mono<ReleaseDatasourcePinExtractionResult> extract(ApplicationReleaseCandidate candidate) {
        return Mono.defer(() -> pinExtractor.extract(candidate)).onErrorResume(error -> Mono.just(extractionFailure()));
    }

    public Mono<ReleaseValidationResult> validate(ApplicationReleaseCandidate candidate) {
        return extract(candidate).flatMap(extraction -> validate(candidate, extraction));
    }

    public Mono<ReleaseValidationResult> validate(
            ApplicationReleaseCandidate candidate, ReleaseDatasourcePinExtractionResult extraction) {
        return scan(candidate, extraction).flatMap(scan -> reactor.core.publisher.Flux.fromIterable(extraction.pins())
                .filter(pin -> "ONTOLOGY".equals(pin.kind()))
                .concatMap(pin -> Mono.defer(() -> ontologyValidator.validate(
                                pin,
                                scan.dependencies().stream()
                                        .filter(dependency -> pin.datasourceId().equals(dependency.datasourceId()))
                                        .toList()))
                        .onErrorResume(error -> Mono.just(List.of(failure(
                                "RELEASE_VALIDATION_ONTOLOGY_FAILED",
                                "datasources[" + pin.datasourceId() + "].metadataSnapshot")))))
                .collectList()
                .map(ontologyDiagnostics -> {
                    List<ReleaseDiagnostic> diagnostics = new java.util.ArrayList<>();
                    diagnostics.addAll(extraction.diagnostics());
                    diagnostics.addAll(scan.diagnostics());
                    ontologyDiagnostics.forEach(diagnostics::addAll);
                    return new ReleaseValidationResult(sort(diagnostics));
                }));
    }

    private ReleaseDatasourcePinExtractionResult extractionFailure() {
        return new ReleaseDatasourcePinExtractionResult(
                List.of(), List.of(failure("RELEASE_VALIDATION_EXTRACTOR_FAILED", "release.datasourcePins")));
    }

    private Mono<ReleaseDependencyScanner.ScanResult> scan(
            ApplicationReleaseCandidate candidate, ReleaseDatasourcePinExtractionResult extraction) {
        return Mono.fromSupplier(() -> dependencyScanner.scan(candidate, extraction.pins()))
                .flatMap(scan -> Mono.justOrEmpty(scan))
                .switchIfEmpty(Mono.just(new ReleaseDependencyScanner.ScanResult(
                        List.of(), List.of(failure("RELEASE_VALIDATION_SCANNER_FAILED", "release.dependencies")))))
                .onErrorResume(error -> Mono.just(new ReleaseDependencyScanner.ScanResult(
                        List.of(), List.of(failure("RELEASE_VALIDATION_SCANNER_FAILED", "release.dependencies")))));
    }

    private ReleaseDiagnostic failure(String code, String path) {
        return new ReleaseDiagnostic(
                ReleaseDiagnostic.Severity.BLOCKING,
                code,
                path,
                "Release validation could not complete this phase",
                java.util.Map.of());
    }

    private List<ReleaseDiagnostic> sort(List<ReleaseDiagnostic> diagnostics) {
        return diagnostics.stream()
                .sorted(Comparator.comparing((ReleaseDiagnostic diagnostic) ->
                                diagnostic.severity().ordinal())
                        .thenComparing(ReleaseDiagnostic::code)
                        .thenComparing(ReleaseDiagnostic::path, Comparator.nullsFirst(String::compareTo)))
                .toList();
    }
}
