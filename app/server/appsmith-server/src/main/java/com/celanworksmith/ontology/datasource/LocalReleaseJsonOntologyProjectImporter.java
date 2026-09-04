package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.release.OntologyModelRelease;
import com.celanworksmith.ontology.release.OntologyModelReleaseMapper;
import com.celanworksmith.ontology.release.OntologyModelReleaseParser;
import reactor.core.publisher.Mono;

public class LocalReleaseJsonOntologyProjectImporter implements OntologyProjectImportSource {
    private final OntologySnapshotService snapshotService;
    private final WorkspaceDomainRuntimeBindingResolver bindingResolver;
    private final OntologyModelReleaseParser parser;
    private final OntologyModelReleaseMapper mapper;

    public LocalReleaseJsonOntologyProjectImporter(
            OntologySnapshotService snapshotService,
            WorkspaceDomainRuntimeBindingResolver bindingResolver,
            OntologyModelReleaseParser parser,
            OntologyModelReleaseMapper mapper) {
        this.snapshotService = snapshotService;
        this.bindingResolver = bindingResolver;
        this.parser = parser;
        this.mapper = mapper;
    }

    public LocalReleaseJsonOntologyProjectImporter(
            OntologySnapshotService snapshotService, WorkspaceDomainRuntimeBindingResolver bindingResolver) {
        this(snapshotService, bindingResolver, new OntologyModelReleaseParser(), new OntologyModelReleaseMapper());
    }

    @Override
    public Kind sourceKind() {
        return Kind.LOCAL_RELEASE_JSON;
    }

    @Override
    public Mono<OntologyMetadataSnapshot> importProject(
            OntologyProjectImportRequest request, OntologyProjectImportContext context) {
        if (request == null || request.sourceKind() != Kind.LOCAL_RELEASE_JSON) {
            return Mono.error(
                    new IllegalArgumentException("Local Release JSON importer requires a local release request"));
        }
        if (context == null) return Mono.error(new IllegalArgumentException("Import context is required"));
        return Mono.fromSupplier(() -> parser.parse(requiredMetadata(request.metadata())))
                .flatMap(release -> bindingResolver
                        .resolveRequired(
                                context.workspaceId(), release.release().domain())
                        .flatMap(binding -> importWithBinding(request, context, release, binding)));
    }

    private Mono<OntologyMetadataSnapshot> importWithBinding(
            OntologyProjectImportRequest request,
            OntologyProjectImportContext context,
            OntologyModelRelease release,
            WorkspaceDomainRuntimeBinding binding) {
        for (OntologyModelRelease.Element element : release.elements()) {
            if (element instanceof OntologyModelRelease.RuntimeBinding runtime
                    && !binding.allowedAssetRefs().contains(runtime.assetRef())) {
                return Mono.error(
                        new IllegalArgumentException("Release runtime assets are unavailable in the workspace."));
            }
        }
        return Mono.fromSupplier(() -> mapper.map(release))
                .flatMap(definition -> snapshotService.createSnapshot(new ImportedOntologyProject(
                        definition,
                        "local-release-json",
                        requiredReleaseId(request, release),
                        binding.runtimeProviderId(),
                        context.importedBy(),
                        release.release().domain(),
                        release.release().releaseDigest(),
                        binding.managedBindingId())));
    }

    @Override
    public Mono<Void> cleanupSnapshot(OntologyMetadataSnapshot snapshot) {
        return snapshotService.deleteSnapshot(snapshot == null ? null : snapshot.id());
    }

    private static byte[] requiredMetadata(byte[] metadata) {
        if (metadata == null || metadata.length == 0)
            throw new IllegalArgumentException("Release JSON metadata is required");
        return metadata;
    }

    private static String requiredReleaseId(OntologyProjectImportRequest request, OntologyModelRelease release) {
        if (request.sourceReleaseId() != null && !request.sourceReleaseId().isBlank()) return request.sourceReleaseId();
        return release.release().modelId() + "@" + release.release().version();
    }
}
