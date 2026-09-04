package com.celanworksmith.ontology.datasource;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.ArrayList;
import java.util.List;

@ConfigurationProperties(prefix = "celanworksmith.ontology.release-bindings")
public class ReleaseRuntimeBindingProperties {
    private List<Binding> bindings = new ArrayList<>();

    public ReleaseRuntimeBindingProperties() {}

    public ReleaseRuntimeBindingProperties(List<Binding> bindings) {
        setBindings(bindings);
    }

    public List<Binding> getBindings() {
        return bindings;
    }

    public void setBindings(List<Binding> bindings) {
        this.bindings = bindings == null ? new ArrayList<>() : new ArrayList<>(bindings);
    }

    public static class Binding {
        private String workspaceId;
        private String domain;
        private String managedBindingId;
        private String runtimeProviderId;
        private String providerKind;
        private List<AssetAuthorization> assetAuthorizations = new ArrayList<>();
        private List<LinkAuthorization> linkAuthorizations = new ArrayList<>();

        public Binding() {}

        public Binding(
                String workspaceId,
                String domain,
                String managedBindingId,
                String runtimeProviderId,
                String providerKind,
                List<AssetAuthorization> assetAuthorizations,
                List<LinkAuthorization> linkAuthorizations) {
            this.workspaceId = workspaceId;
            this.domain = domain;
            this.managedBindingId = managedBindingId;
            this.runtimeProviderId = runtimeProviderId;
            this.providerKind = providerKind;
            this.assetAuthorizations =
                    assetAuthorizations == null ? new ArrayList<>() : new ArrayList<>(assetAuthorizations);
            this.linkAuthorizations =
                    linkAuthorizations == null ? new ArrayList<>() : new ArrayList<>(linkAuthorizations);
        }

        public String getWorkspaceId() {
            return workspaceId;
        }

        public void setWorkspaceId(String value) {
            workspaceId = value;
        }

        public String getDomain() {
            return domain;
        }

        public void setDomain(String value) {
            domain = value;
        }

        public String getManagedBindingId() {
            return managedBindingId;
        }

        public void setManagedBindingId(String value) {
            managedBindingId = value;
        }

        public String getRuntimeProviderId() {
            return runtimeProviderId;
        }

        public void setRuntimeProviderId(String value) {
            runtimeProviderId = value;
        }

        public String getProviderKind() {
            return providerKind;
        }

        public void setProviderKind(String value) {
            providerKind = value;
        }

        public List<AssetAuthorization> getAssetAuthorizations() {
            return assetAuthorizations;
        }

        public void setAssetAuthorizations(List<AssetAuthorization> value) {
            assetAuthorizations = value == null ? new ArrayList<>() : new ArrayList<>(value);
        }

        public List<LinkAuthorization> getLinkAuthorizations() {
            return linkAuthorizations;
        }

        public void setLinkAuthorizations(List<LinkAuthorization> value) {
            linkAuthorizations = value == null ? new ArrayList<>() : new ArrayList<>(value);
        }
    }

    public static class AssetAuthorization {
        private String assetRef;
        private String mappingDigest;

        public AssetAuthorization() {}

        public AssetAuthorization(String assetRef, String mappingDigest) {
            this.assetRef = assetRef;
            this.mappingDigest = mappingDigest;
        }

        public String getAssetRef() {
            return assetRef;
        }

        public void setAssetRef(String value) {
            assetRef = value;
        }

        public String getMappingDigest() {
            return mappingDigest;
        }

        public void setMappingDigest(String value) {
            mappingDigest = value;
        }
    }

    public static class LinkAuthorization {
        private String linkId;
        private String mappingDigest;

        public LinkAuthorization() {}

        public LinkAuthorization(String linkId, String mappingDigest) {
            this.linkId = linkId;
            this.mappingDigest = mappingDigest;
        }

        public String getLinkId() {
            return linkId;
        }

        public void setLinkId(String value) {
            linkId = value;
        }

        public String getMappingDigest() {
            return mappingDigest;
        }

        public void setMappingDigest(String value) {
            mappingDigest = value;
        }
    }
}
