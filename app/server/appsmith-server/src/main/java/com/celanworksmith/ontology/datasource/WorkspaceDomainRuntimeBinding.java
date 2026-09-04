package com.celanworksmith.ontology.datasource;

import java.util.List;

public record WorkspaceDomainRuntimeBinding(
        String workspaceId,
        String domain,
        String managedBindingId,
        String runtimeProviderId,
        List<String> allowedAssetRefs) {
    public WorkspaceDomainRuntimeBinding {
        allowedAssetRefs = List.copyOf(allowedAssetRefs == null ? List.of() : allowedAssetRefs);
    }
}
