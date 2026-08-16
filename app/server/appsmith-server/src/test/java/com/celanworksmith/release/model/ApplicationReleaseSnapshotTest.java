package com.celanworksmith.release.model;

import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static com.celanworksmith.release.model.ApplicationReleaseStatus.PUBLISHED;
import static com.celanworksmith.release.model.ApplicationReleaseStatus.ROLLED_BACK;
import static com.celanworksmith.release.model.ApplicationReleaseStatus.SNAPSHOT_CREATED;
import static com.celanworksmith.release.model.ApplicationReleaseStatus.SUPERSEDED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ApplicationReleaseSnapshotTest {

    @Test
    void copiesCollectionsAndRejectsMutableReleaseState() {
        ApplicationReleaseSnapshot snapshot = fixture();

        assertThatThrownBy(() -> snapshot.datasourcePins().add(null)).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> snapshot.diagnostics().add(null)).isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() ->
                        ((Map<String, Object>) snapshot.applicationContent().get("nested")).put("changed", true))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> ((List<Object>) snapshot.applicationContent().get("items")).add("changed"))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> ((Set<Object>) snapshot.applicationContent().get("tags")).add("changed"))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> snapshot.diagnostics().getFirst().details().put("changed", true))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThat(snapshot.contentDigest()).startsWith("sha256:");
    }

    @Test
    void copiesInputCollectionsBeforeConstructionReturns() {
        Map<String, Object> content = new HashMap<>();
        List<Object> items = new ArrayList<>(List.of("original"));
        content.put("items", items);
        Map<String, Object> details = new HashMap<>();
        details.put("value", "original");

        ApplicationReleaseSnapshot snapshot = fixture(content, details);
        items.add("mutated");
        content.put("new", "mutated");
        details.put("value", "mutated");

        assertThat(snapshot.applicationContent()).containsOnlyKeys("items");
        assertThat((List<Object>) snapshot.applicationContent().get("items")).containsExactly("original");
        assertThat(snapshot.diagnostics().getFirst().details()).containsEntry("value", "original");
    }

    @Test
    void deeplyCopiesNestedDiagnosticDetails() {
        List<Object> nestedValues = new ArrayList<>(List.of("original"));
        Map<String, Object> nestedDetails = new HashMap<>();
        nestedDetails.put("values", nestedValues);
        Map<String, Object> details = new HashMap<>();
        details.put("nested", nestedDetails);

        ReleaseDiagnostic diagnostic =
                new ReleaseDiagnostic(ReleaseDiagnostic.Severity.INFO, "CODE", "/path", "Safe message", details);
        nestedValues.add("mutated");
        nestedDetails.put("new", "mutated");
        details.put("new", "mutated");

        Map<String, Object> copiedNestedDetails =
                (Map<String, Object>) diagnostic.details().get("nested");
        assertThat(diagnostic.details()).containsOnlyKeys("nested");
        assertThat(copiedNestedDetails).containsOnlyKeys("values");
        assertThat((List<Object>) copiedNestedDetails.get("values")).containsExactly("original");
        assertThatThrownBy(() -> copiedNestedDetails.put("changed", true))
                .isInstanceOf(UnsupportedOperationException.class);
        assertThatThrownBy(() -> ((List<Object>) copiedNestedDetails.get("values")).add("changed"))
                .isInstanceOf(UnsupportedOperationException.class);
    }

    @Test
    void rejectsMissingOrBlankDiagnosticMessage() {
        assertThatThrownBy(
                        () -> new ReleaseDiagnostic(ReleaseDiagnostic.Severity.INFO, "CODE", "/path", null, Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(
                        () -> new ReleaseDiagnostic(ReleaseDiagnostic.Severity.INFO, "CODE", "/path", "   ", Map.of()))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void onlyAllowsDefinedLifecycleStates() {
        assertThat(ApplicationReleaseStatus.values())
                .containsExactly(SNAPSHOT_CREATED, PUBLISHED, SUPERSEDED, ROLLED_BACK);
    }

    private ApplicationReleaseSnapshot fixture() {
        Map<String, Object> nested = new HashMap<>();
        nested.put("enabled", true);
        List<Object> items = new ArrayList<>(List.of("item"));
        Set<Object> tags = new HashSet<>(Set.of("tag"));
        Map<String, Object> content = new HashMap<>();
        content.put("pages", new ArrayList<>());
        content.put("nested", nested);
        content.put("items", items);
        content.put("tags", tags);
        Map<String, Object> details = new HashMap<>();
        details.put("safe", "value");
        return fixture(content, details);
    }

    private ApplicationReleaseSnapshot fixture(Map<String, Object> content, Map<String, Object> details) {
        return new ApplicationReleaseSnapshot(
                "release-1",
                "application-1",
                "workspace-1",
                "revision-1",
                "1",
                "creator-1",
                Instant.parse("2026-08-15T00:00:00Z"),
                "Initial release",
                "sha256:abc123",
                content,
                List.of(new ReleaseDatasourcePin(
                        "datasource-1", "plugin-1", "ONTOLOGY", "provider-1", "metadata-1", "sha256:metadata", "1")),
                List.of(new ReleaseDiagnostic(
                        ReleaseDiagnostic.Severity.INFO, "RELEASE_OK", "/app", "Release is valid", details)),
                ApplicationReleaseStatus.SNAPSHOT_CREATED);
    }
}
