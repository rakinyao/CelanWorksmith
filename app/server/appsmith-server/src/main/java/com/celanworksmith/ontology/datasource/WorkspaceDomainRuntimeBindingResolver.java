package com.celanworksmith.ontology.datasource;

import reactor.core.publisher.Mono;

import java.util.LinkedHashMap;
import java.util.Map;

public class WorkspaceDomainRuntimeBindingResolver {
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
                        configured.getAllowedAssetRefs());
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
        if (binding == null) {
            return Mono.error(new IllegalArgumentException(
                    "The workspace has no runtime environment configured for the " + domain + " domain."));
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
                || binding.allowedAssetRefs().stream().anyMatch(WorkspaceDomainRuntimeBindingResolver::blank)) {
            throw new IllegalArgumentException("Ontology release runtime binding is incomplete");
        }
        if (binding.allowedAssetRefs().stream().distinct().count()
                != binding.allowedAssetRefs().size()) {
            throw new IllegalArgumentException("Ontology release runtime binding asset refs are duplicated");
        }
    }

    private static boolean blank(String value) {
        return value == null || value.isBlank();
    }
}
