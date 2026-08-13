package com.celanworksmith.ontology.datasource;

import com.celanworksmith.ontology.dto.ObjectTypeDTO;
import com.celanworksmith.ontology.dto.PropertyDTO;
import com.celanworksmith.runtime.port.RuntimeProvider;
import reactor.core.publisher.Mono;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class RuntimeProviderCompatibilityValidator {
    private final RuntimeProviderRegistry providerRegistry;

    public RuntimeProviderCompatibilityValidator(RuntimeProviderRegistry providerRegistry) {
        this.providerRegistry = providerRegistry;
    }

    public Mono<ProviderValidationResult> validate(OntologyMetadataSnapshot snapshot, String providerId) {
        if (snapshot == null) {
            return Mono.error(new IllegalArgumentException("Ontology metadata snapshot is required"));
        }
        RuntimeProvider provider = providerRegistry.resolveRequired(providerId);
        return provider.metadataCapabilities().map(capabilities -> validate(snapshot, capabilities));
    }

    private ProviderValidationResult validate(
            OntologyMetadataSnapshot snapshot, RuntimeProvider.RuntimeMetadataCapabilities capabilities) {
        List<String> errors = new ArrayList<>();
        Map<String, Map<String, String>> objectProperties = capabilities.objectProperties();
        for (ObjectTypeDTO objectType : snapshot.definition().objectTypes()) {
            Map<String, String> properties = objectProperties.get(objectType.id());
            if (properties == null) {
                errors.add("Missing Object mapping: " + objectType.id());
                continue;
            }
            for (PropertyDTO property : objectType.properties()) {
                String actualType = properties.get(property.id());
                if (actualType == null) {
                    errors.add("Missing property mapping: " + objectType.id() + "." + property.id());
                } else if (!actualType.equalsIgnoreCase(property.dataType())) {
                    errors.add("Incompatible property type: " + objectType.id() + "." + property.id());
                }
            }
        }
        return new ProviderValidationResult(errors.isEmpty(), errors);
    }
}
