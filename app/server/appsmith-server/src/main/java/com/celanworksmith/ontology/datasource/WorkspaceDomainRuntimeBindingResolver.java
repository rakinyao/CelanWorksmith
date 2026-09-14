package com.celanworksmith.ontology.datasource;

import com.celanworksmith.CelanWorksmithErrorCode;
import com.celanworksmith.CelanWorksmithException;
import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.Map;

public class WorkspaceDomainRuntimeBindingResolver {
    private static final String DEPLOYMENT_SCOPE = "*";

    private final Map<String, WorkspaceDomainRuntimeBinding> bindings;

    public WorkspaceDomainRuntimeBindingResolver(ReleaseRuntimeBindingProperties properties) {
        Map<String, WorkspaceDomainRuntimeBinding> indexed = new LinkedHashMap<>();
        if (properties != null && properties.getBindings() != null) {
            for (ReleaseRuntimeBindingProperties.Binding configured : properties.getBindings()) {
                if (configured == null) continue;
                WorkspaceDomainRuntimeBinding binding = new WorkspaceDomainRuntimeBinding(
                        configured.getWorkspaceId(),
                        configured.getDomain(),
                        configured.getManagedBindingId(),
                        configured.getRuntimeProviderId(),
                        configured.getProviderKind(),
                        configured.getAssetAuthorizations().stream()
                                .map(asset -> new WorkspaceDomainRuntimeBinding.AssetAuthorization(
                                        asset.getAssetRef(), asset.getMappingDigest()))
                                .toList(),
                        configured.getLinkAuthorizations().stream()
                                .map(link -> new WorkspaceDomainRuntimeBinding.LinkAuthorization(
                                        link.getLinkId(), link.getMappingDigest()))
                                .toList());
                validate(binding);
                String key = key(binding.workspaceId(), binding.domain());
                if (indexed.putIfAbsent(key, binding) != null) {
                    throw new IllegalArgumentException("Ontology release runtime binding is duplicated: " + key);
                }
            }
        }
        this.bindings = Map.copyOf(indexed);
    }

    public Mono<WorkspaceDomainRuntimeBinding> resolveRequired(String workspaceId, String domain) {
        WorkspaceDomainRuntimeBinding binding = bindings.get(key(workspaceId, domain));
        if (binding == null) binding = bindings.get(key(DEPLOYMENT_SCOPE, domain));
        if (binding == null) {
            return Mono.error(new CelanWorksmithException(
                    CelanWorksmithErrorCode.RELEASE_IMPORT_BINDING_UNAVAILABLE,
                    "The workspace release binding is unavailable."));
        }
        return Mono.just(binding);
    }

    private static String key(String workspaceId, String domain) {
        return String.valueOf(workspaceId) + "\u0000" + domain;
    }

    private static void validate(WorkspaceDomainRuntimeBinding binding) {
        if (blank(binding.workspaceId())
                || blank(binding.domain())
                || blank(binding.managedBindingId())
                || blank(binding.runtimeProviderId())
                || blank(binding.providerKind())
                || binding.assetAuthorizations().isEmpty()
                || binding.assetAuthorizations().stream()
                        .anyMatch(asset -> blank(asset.assetRef()) || !digest(asset.mappingDigest()))
                || binding.linkAuthorizations().stream()
                        .anyMatch(link -> blank(link.linkId()) || !digest(link.mappingDigest()))) {
            throw new IllegalArgumentException("Ontology release runtime binding is incomplete");
        }
        if (binding.assetAuthorizations().stream()
                        .map(WorkspaceDomainRuntimeBinding.AssetAuthorization::assetRef)
                        .distinct()
                        .count()
                != binding.assetAuthorizations().size()) {
            throw new IllegalArgumentException("Ontology release runtime binding asset refs are duplicated");
        }
        if (binding.linkAuthorizations().stream()
                        .map(WorkspaceDomainRuntimeBinding.LinkAuthorization::linkId)
                        .distinct()
                        .count()
                != binding.linkAuthorizations().size()) {
            throw new IllegalArgumentException("Ontology release runtime binding links are duplicated");
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }

    private static boolean digest(String value) {
        return value != null && value.matches("sha256:[0-9a-fA-F]{64}");
    }
}
