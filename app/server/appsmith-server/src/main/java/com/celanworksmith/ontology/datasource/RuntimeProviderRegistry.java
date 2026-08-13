package com.celanworksmith.ontology.datasource;

import com.celanworksmith.runtime.port.RuntimeProvider;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class RuntimeProviderRegistry {
    private final Map<String, RuntimeProvider> providersById;

    public RuntimeProviderRegistry(List<RuntimeProvider> providers) {
        Map<String, RuntimeProvider> mappedProviders = new LinkedHashMap<>();
        for (RuntimeProvider provider : providers) {
            if (provider == null
                    || provider.providerId() == null
                    || provider.providerId().isBlank()) {
                continue;
            }
            if (mappedProviders.putIfAbsent(provider.providerId(), provider) != null) {
                throw new IllegalArgumentException("Runtime Provider ID is duplicated: " + provider.providerId());
            }
        }
        providersById = Map.copyOf(mappedProviders);
    }

    public RuntimeProvider resolveRequired(String providerId) {
        RuntimeProvider provider = providersById.get(providerId);
        if (provider == null) {
            throw new IllegalArgumentException("Runtime Provider is not registered: " + providerId);
        }
        return provider;
    }
}
