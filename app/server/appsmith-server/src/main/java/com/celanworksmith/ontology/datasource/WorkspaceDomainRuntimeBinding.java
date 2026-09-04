package com.celanworksmith.ontology.datasource;

import java.util.List;

public record WorkspaceDomainRuntimeBinding(
        String workspaceId,
        String domain,
        String managedBindingId,
        String runtimeProviderId,
        String providerKind,
        List<AssetAuthorization> assetAuthorizations,
        List<LinkAuthorization> linkAuthorizations) {
    public WorkspaceDomainRuntimeBinding {
        assetAuthorizations = List.copyOf(assetAuthorizations == null ? List.of() : assetAuthorizations);
        linkAuthorizations = List.copyOf(linkAuthorizations == null ? List.of() : linkAuthorizations);
    }

    public record AssetAuthorization(String assetRef, String mappingDigest) {}

    public record LinkAuthorization(String linkId, String mappingDigest) {}
}
