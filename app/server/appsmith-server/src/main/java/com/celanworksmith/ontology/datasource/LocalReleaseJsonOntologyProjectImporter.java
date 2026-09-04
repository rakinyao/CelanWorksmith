package com.celanworksmith.ontology.datasource;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import com.celanworksmith.ontology.release.OntologyModelRelease;
import com.celanworksmith.ontology.release.OntologyModelReleaseMapper;
import com.celanworksmith.ontology.release.OntologyModelReleaseParser;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

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
            if (element instanceof OntologyModelRelease.RuntimeBinding runtime) {
                if (!binding.providerKind().equals(runtime.providerKind())
                        || !"READ_ONLY".equals(runtime.accessMode())) {
                    return bindingUnavailable();
                }
                boolean approved = binding.assetAuthorizations().stream()
                        .anyMatch(authorization -> authorization.assetRef().equals(runtime.assetRef())
                                && authorization.mappingDigest().equals(runtimeMappingDigest(runtime)));
                if (!approved) return assetsUnavailable();
            } else if (element instanceof OntologyModelRelease.EntitySetLink link) {
                boolean approved = binding.linkAuthorizations().stream()
                        .anyMatch(authorization -> authorization.linkId().equals(link.name())
                                && authorization.mappingDigest().equals(linkMappingDigest(link)));
                if (!approved) return assetsUnavailable();
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
                        binding.managedBindingId(),
                        context.workspaceId())));
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

    private static <T> Mono<T> bindingUnavailable() {
        return Mono.error(new CelanWorksmithException(
                CelanWorksmithErrorCode.RELEASE_IMPORT_BINDING_UNAVAILABLE,
                "The workspace release binding is unavailable."));
    }

    private static <T> Mono<T> assetsUnavailable() {
        return Mono.error(new CelanWorksmithException(
                CelanWorksmithErrorCode.RELEASE_IMPORT_ASSETS_UNAVAILABLE,
                "Release runtime assets are unavailable in this workspace."));
    }

    private static String runtimeMappingDigest(OntologyModelRelease.RuntimeBinding binding) {
        List<String> values = new ArrayList<>();
        values.add(binding.assetRef());
        binding.primaryKeyMapping().entrySet().stream()
                .sorted(java.util.Map.Entry.comparingByKey())
                .forEach(entry -> values.add("pk\u0000" + entry.getKey() + "\u0000" + entry.getValue()));
        binding.fieldMappings().entrySet().stream()
                .sorted(java.util.Map.Entry.comparingByKey())
                .forEach(entry -> values.add("field\u0000" + entry.getKey() + "\u0000"
                        + entry.getValue().column()));
        return sha256(values);
    }

    private static String linkMappingDigest(OntologyModelRelease.EntitySetLink link) {
        List<String> values = new ArrayList<>();
        values.add(link.name());
        values.add(link.sourceEntitySet());
        values.add(link.destinationEntitySet());
        link.fieldMappings().stream()
                .sorted(Comparator.comparing(OntologyModelRelease.LinkFieldMapping::sourceField)
                        .thenComparing(OntologyModelRelease.LinkFieldMapping::destinationField))
                .forEach(mapping ->
                        values.add("field\u0000" + mapping.sourceField() + "\u0000" + mapping.destinationField()));
        return sha256(values);
    }

    private static String sha256(List<String> values) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(String.join("\n", values).getBytes(StandardCharsets.UTF_8));
            StringBuilder encoded = new StringBuilder(digest.length * 2);
            for (byte value : digest) encoded.append(String.format("%02x", value));
            return "sha256:" + encoded;
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
