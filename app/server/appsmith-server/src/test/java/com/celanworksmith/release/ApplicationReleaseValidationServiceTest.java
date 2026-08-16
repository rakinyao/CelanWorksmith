package com.celanworksmith.release;

import com.appsmith.server.domains.Application;
import com.celanworksmith.release.model.ReleaseDatasourcePin;
import com.celanworksmith.release.model.ReleaseDatasourcePinExtractionResult;
import com.celanworksmith.release.model.ReleaseDependency;
import com.celanworksmith.release.model.ReleaseDiagnostic;
import com.celanworksmith.release.model.ReleaseValidationResult;
import org.junit.jupiter.api.Test;
import reactor.core.publisher.Mono;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ApplicationReleaseValidationServiceTest {
    @Test
    void collectsAllDiagnosticsAndSortsBySeverityCodeAndPath() {
        ReleaseDatasourcePinExtractor extractor = mock(ReleaseDatasourcePinExtractor.class);
        ReleaseDependencyScanner scanner = mock(ReleaseDependencyScanner.class);
        OntologyReleaseValidator ontologyValidator = mock(OntologyReleaseValidator.class);
        ApplicationReleaseCandidate candidate = candidate();
        ReleaseDatasourcePin pin = new ReleaseDatasourcePin(
                "ontology-1", "ontology-plugin", "ONTOLOGY", "provider-1", "snapshot-1", "digest-1", "1");
        ReleaseDiagnostic datasourceDiagnostic = diagnostic(ReleaseDiagnostic.Severity.BLOCKING, "Z_CODE", "z.path");
        ReleaseDiagnostic scannerDiagnostic = diagnostic(ReleaseDiagnostic.Severity.WARNING, "A_CODE", "a.path");
        ReleaseDiagnostic ontologyDiagnostic = diagnostic(ReleaseDiagnostic.Severity.BLOCKING, "A_CODE", "b.path");
        when(extractor.extract(candidate))
                .thenReturn(Mono.just(
                        new ReleaseDatasourcePinExtractionResult(List.of(pin), List.of(datasourceDiagnostic))));
        when(scanner.scan(candidate, List.of(pin)))
                .thenReturn(new ReleaseDependencyScanner.ScanResult(
                        List.of(new ReleaseDependency("PROPERTY", "ontology-1", "name", "b.path")),
                        List.of(scannerDiagnostic)));
        when(ontologyValidator.validate(
                        pin, List.of(new ReleaseDependency("PROPERTY", "ontology-1", "name", "b.path"))))
                .thenReturn(Mono.just(List.of(ontologyDiagnostic)));

        ReleaseValidationResult result = new ApplicationReleaseValidationService(extractor, scanner, ontologyValidator)
                .validate(candidate)
                .block();

        assertThat(result.diagnostics())
                .extracting("severity", "code", "path")
                .containsExactly(
                        org.assertj.core.groups.Tuple.tuple(ReleaseDiagnostic.Severity.BLOCKING, "A_CODE", "b.path"),
                        org.assertj.core.groups.Tuple.tuple(ReleaseDiagnostic.Severity.BLOCKING, "Z_CODE", "z.path"),
                        org.assertj.core.groups.Tuple.tuple(ReleaseDiagnostic.Severity.WARNING, "A_CODE", "a.path"));
    }

    @Test
    void keepsNativeDatasourcePinsAndValidOntologyDiagnosticsTogether() {
        ReleaseDatasourcePinExtractor extractor = mock(ReleaseDatasourcePinExtractor.class);
        ReleaseDependencyScanner scanner = mock(ReleaseDependencyScanner.class);
        OntologyReleaseValidator ontologyValidator = mock(OntologyReleaseValidator.class);
        ApplicationReleaseCandidate candidate = candidate();
        ReleaseDatasourcePin nativePin = new ReleaseDatasourcePin("db-1", "postgres", "NATIVE", null, null, null, null);
        ReleaseDatasourcePin ontologyPin = new ReleaseDatasourcePin(
                "ontology-1", "ontology-plugin", "ONTOLOGY", "provider-1", "snapshot-1", "digest-1", "1");
        List<ReleaseDatasourcePin> pins = List.of(nativePin, ontologyPin);
        List<ReleaseDependency> dependencies =
                List.of(new ReleaseDependency("OBJECT_TYPE", "ontology-1", "Order", "query.objectTypeId"));
        when(extractor.extract(candidate))
                .thenReturn(Mono.just(new ReleaseDatasourcePinExtractionResult(pins, List.of())));
        when(scanner.scan(candidate, pins))
                .thenReturn(new ReleaseDependencyScanner.ScanResult(dependencies, List.of()));
        when(ontologyValidator.validate(ontologyPin, dependencies)).thenReturn(Mono.just(List.of()));

        ReleaseValidationResult result = new ApplicationReleaseValidationService(extractor, scanner, ontologyValidator)
                .validate(candidate)
                .block();

        assertThat(result.diagnostics()).isEmpty();
    }

    @Test
    void mapsExtractorAndScannerExceptionsToStableBlockingDiagnostics() {
        ReleaseDatasourcePinExtractor extractor = mock(ReleaseDatasourcePinExtractor.class);
        ReleaseDependencyScanner scanner = mock(ReleaseDependencyScanner.class);
        OntologyReleaseValidator ontologyValidator = mock(OntologyReleaseValidator.class);
        ApplicationReleaseCandidate candidate = candidate();
        when(extractor.extract(candidate)).thenThrow(new IllegalStateException("secret extractor detail"));
        when(scanner.scan(candidate, List.of()))
                .thenReturn(new ReleaseDependencyScanner.ScanResult(List.of(), List.of()));

        ReleaseValidationResult result = new ApplicationReleaseValidationService(extractor, scanner, ontologyValidator)
                .validate(candidate)
                .block();

        assertThat(result.diagnostics())
                .extracting("severity", "code", "path", "message")
                .containsExactly(org.assertj.core.groups.Tuple.tuple(
                        ReleaseDiagnostic.Severity.BLOCKING,
                        "RELEASE_VALIDATION_EXTRACTOR_FAILED",
                        "release.datasourcePins",
                        "Release validation could not complete this phase"));
        verify(scanner).scan(candidate, List.of());

        doReturn(Mono.just(new ReleaseDatasourcePinExtractionResult(List.of(), List.of())))
                .when(extractor)
                .extract(candidate);
        when(scanner.scan(candidate, List.of())).thenThrow(new IllegalArgumentException("secret scanner detail"));
        result = new ApplicationReleaseValidationService(extractor, scanner, ontologyValidator)
                .validate(candidate)
                .block();
        assertThat(result.diagnostics())
                .extracting("code", "path")
                .containsExactly(org.assertj.core.groups.Tuple.tuple(
                        "RELEASE_VALIDATION_SCANNER_FAILED", "release.dependencies"));
    }

    @Test
    void collectsMissingPluginAndNativeDatasourceDiagnosticsAtServiceBoundary() {
        ReleaseDatasourcePinExtractor extractor = mock(ReleaseDatasourcePinExtractor.class);
        ReleaseDependencyScanner scanner = mock(ReleaseDependencyScanner.class);
        OntologyReleaseValidator ontologyValidator = mock(OntologyReleaseValidator.class);
        List<ReleaseDiagnostic> datasourceDiagnostics = List.of(
                diagnostic(
                        ReleaseDiagnostic.Severity.BLOCKING,
                        "RELEASE_DATASOURCE_PLUGIN_NOT_FOUND",
                        "action.datasource.pluginId"),
                diagnostic(
                        ReleaseDiagnostic.Severity.BLOCKING,
                        "RELEASE_DATASOURCE_REFERENCE_NOT_FOUND",
                        "action.datasource.id"));
        when(extractor.extract(any()))
                .thenReturn(Mono.just(new ReleaseDatasourcePinExtractionResult(List.of(), datasourceDiagnostics)));
        when(scanner.scan(any(), org.mockito.ArgumentMatchers.eq(List.of())))
                .thenReturn(new ReleaseDependencyScanner.ScanResult(List.of(), List.of()));

        ReleaseValidationResult result = new ApplicationReleaseValidationService(extractor, scanner, ontologyValidator)
                .validate(candidate())
                .block();

        assertThat(result.diagnostics())
                .extracting("code")
                .containsExactly("RELEASE_DATASOURCE_PLUGIN_NOT_FOUND", "RELEASE_DATASOURCE_REFERENCE_NOT_FOUND");
    }

    @Test
    void validatesMultipleOntologyDatasourcesSequentially() {
        ReleaseDatasourcePinExtractor extractor = mock(ReleaseDatasourcePinExtractor.class);
        ReleaseDependencyScanner scanner = mock(ReleaseDependencyScanner.class);
        OntologyReleaseValidator ontologyValidator = mock(OntologyReleaseValidator.class);
        ReleaseDatasourcePin first = new ReleaseDatasourcePin("a", "plugin", "ONTOLOGY", "provider", "s1", "d1", "1");
        ReleaseDatasourcePin second = new ReleaseDatasourcePin("b", "plugin", "ONTOLOGY", "provider", "s2", "d2", "1");
        List<ReleaseDatasourcePin> pins = List.of(first, second);
        when(extractor.extract(any())).thenReturn(Mono.just(new ReleaseDatasourcePinExtractionResult(pins, List.of())));
        when(scanner.scan(any(), org.mockito.ArgumentMatchers.eq(pins)))
                .thenReturn(new ReleaseDependencyScanner.ScanResult(List.of(), List.of()));
        when(ontologyValidator.validate(any(), org.mockito.ArgumentMatchers.eq(List.of())))
                .thenReturn(Mono.just(List.of()));

        new ApplicationReleaseValidationService(extractor, scanner, ontologyValidator)
                .validate(candidate())
                .block();

        var order = inOrder(ontologyValidator);
        order.verify(ontologyValidator).validate(first, List.of());
        order.verify(ontologyValidator).validate(second, List.of());
    }

    private static ApplicationReleaseCandidate candidate() {
        Application application = new Application();
        application.setId("app-1");
        application.setWorkspaceId("workspace-1");
        return new ApplicationReleaseCandidate(application, List.of(), List.of(), List.of(), "revision-1");
    }

    private static ReleaseDiagnostic diagnostic(ReleaseDiagnostic.Severity severity, String code, String path) {
        return new ReleaseDiagnostic(severity, code, path, "safe diagnostic", Map.of());
    }
}
