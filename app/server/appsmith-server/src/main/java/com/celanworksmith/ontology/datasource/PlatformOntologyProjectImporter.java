package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.project.OntologyProjectDefinition;
import reactor.core.publisher.Mono;

public class PlatformOntologyProjectImporter implements OntologyProjectImportSource {
    public interface ReleaseClient {
        Mono<Release> fetchRelease(String releaseId);
    }

    public record Release(OntologyProjectDefinition definition, String runtimeProviderId, String changeNotes) {}

    private final ReleaseClient releaseClient;
    private final OntologySnapshotService snapshotService;

    public PlatformOntologyProjectImporter(ReleaseClient releaseClient, OntologySnapshotService snapshotService) {
        this.releaseClient = releaseClient;
        this.snapshotService = snapshotService;
    }

    @Override
    public Kind sourceKind() {
        return Kind.PLATFORM_RELEASE;
    }

    @Override
    public Mono<OntologyMetadataSnapshot> importProject(OntologyProjectImportRequest request) {
        if (request == null || request.sourceKind() != Kind.PLATFORM_RELEASE) {
            return Mono.error(new IllegalArgumentException("Platform importer requires a platform release request"));
        }
        if (request.sourceReleaseId() == null || request.sourceReleaseId().isBlank()) {
            return Mono.error(new IllegalArgumentException("Platform release ID is required"));
        }
        if (request.importedBy() == null || request.importedBy().isBlank()) {
            return Mono.error(new IllegalArgumentException("Import actor is required"));
        }
        return releaseClient.fetchRelease(request.sourceReleaseId()).flatMap(release -> {
            if (release == null
                    || release.definition() == null
                    || release.runtimeProviderId() == null
                    || release.runtimeProviderId().isBlank()) {
                return Mono.error(new IllegalArgumentException("Platform release metadata is invalid"));
            }
            return snapshotService.createSnapshot(new ImportedOntologyProject(
                    release.definition(),
                    "platform-release",
                    request.sourceReleaseId(),
                    release.runtimeProviderId(),
                    request.importedBy()));
        });
    }
}
