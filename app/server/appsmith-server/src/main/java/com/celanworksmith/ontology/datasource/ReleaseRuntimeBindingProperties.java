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
        private List<String> allowedAssetRefs = new ArrayList<>();

        public Binding() {}

        public Binding(
                String workspaceId,
                String domain,
                String managedBindingId,
                String runtimeProviderId,
                List<String> allowedAssetRefs) {
            this.workspaceId = workspaceId;
            this.domain = domain;
            this.managedBindingId = managedBindingId;
            this.runtimeProviderId = runtimeProviderId;
            this.allowedAssetRefs = allowedAssetRefs == null ? new ArrayList<>() : new ArrayList<>(allowedAssetRefs);
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

        public List<String> getAllowedAssetRefs() {
            return allowedAssetRefs;
        }

        public void setAllowedAssetRefs(List<String> value) {
            allowedAssetRefs = value == null ? new ArrayList<>() : new ArrayList<>(value);
        }
    }
}
